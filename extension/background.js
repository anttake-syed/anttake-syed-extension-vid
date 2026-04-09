// background.js
// This background script handles all tab/screen recording, screenshots, 
// saving to local storage, syncing pending uploads, and coordinating with offscreen.

// FIX #1: Removed async from the top-level listener.
// Chrome's onMessage listener does NOT support async functions natively —
// an async function returns a Promise, which Chrome ignores, causing
// sendResponse to be called after the channel closes. We handle async
// logic inside manually and return `true` to keep the channel open.

import {
  saveMediaLocally,
  getPendingUploads,
  deleteLocalMedia,
} from "./storage.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // START_RECORDING: initiate a tab recording session
  if (message.action === "START_RECORDING") {
    // FIX #2: tabCapture now lives entirely in the background script.
    // Previously popup.js and offscreen.js both tried to call tabCapture,
    // which only works here in the service worker. We centralize it here.
    handleStartRecording(sendResponse);
    return true; // FIX #3: Keep message channel open for async sendResponse
  }

  // STOP_RECORDING: stop current recording session
  if (message.action === "STOP_RECORDING") {
    handleStopRecording(sendResponse);
    return true;
  }

  // TAKE_SCREENSHOT: capture visible tab image
  if (message.action === "TAKE_SCREENSHOT") {
    handleScreenshot(sendResponse);
    return true;
  }

  // RECORDING_COMPLETE: handles full workflow after offscreen finishes recording
  // Includes saving to disk, updating capture count, resetting state, and closing offscreen
  if (message.action === "RECORDING_COMPLETE") {
    handleRecordingComplete(message.dataUrl, message.filename);
    return true;
  }

  // RECORDING_FAILED: reset state if recording could not start
  // Ensures next recording attempt starts cleanly
  if (message.action === "RECORDING_FAILED") {
    chrome.storage.local.set({ isRecording: false });
    closeOffscreen();
    return true;
  }
});

async function handleStartRecording(sendResponse) {
  try {
    // FIX #4: Use getMediaStreamId() instead of capture().
    // capture() returns a MediaStream object which cannot be transferred
    // between contexts. getMediaStreamId() returns a string ID that CAN
    // be passed to offscreen and used with getUserMedia with chromeMediaSourceId.
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({}, (id) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(id);
      });
    });

    // Ensure offscreen document exists before messaging it
    await ensureOffscreen();

    // FIX #5: Standardized message shape — using `action` consistently.
    // Previously background sent `type: "start-recording"` but offscreen
    // was listening for `action: "START_RECORDING"`. Now both sides match.
    // FIX #6: streamId is now properly passed to offscreen.
    // Previously no streamId was included in the forwarded message at all.
    await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "START_RECORDING",
      streamId,
    });

    // FIX #7: Persist recording state so popup reflects correct state on
    // reopen. Previously isRecording was only in popup memory and reset
    // every time the popup was closed and reopened.
    await chrome.storage.local.set({ isRecording: true });

    sendResponse({ success: true });
  } catch (err) {
    console.error("Failed to start recording:", err);
    // Clean up offscreen if startup failed partway through
    await closeOffscreen();
    sendResponse({ success: false, error: err.message });
  }
}

async function handleStopRecording(sendResponse) {
  try {
    // Just tell offscreen to stop — the rest happens in RECORDING_COMPLETE
    await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "STOP_RECORDING",
    });

    sendResponse({ success: true });
  } catch (err) {
    console.error("Failed to stop recording:", err);
    sendResponse({ success: false, error: err.message });
  }
}

async function handleRecordingComplete(dataUrl, filename) {
  // Open Save As dialog so user can choose where to save on their Mac
  chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("Save As failed:", chrome.runtime.lastError.message);
    } else {
      console.log("Save As dialog opened, download ID:", downloadId);
    }
  });

  // Update capture count badge
  chrome.storage.local.get(["captureCount"], (result) => {
    const count = (result.captureCount || 0) + 1;
    chrome.storage.local.set({ captureCount: count });
  });

  // Reset recording state
  await chrome.storage.local.set({ isRecording: false });

  // FIX: Close and destroy the offscreen document after every recording.
  // Chrome only allows one offscreen document at a time, and it keeps the
  // tab's media stream alive as long as the document exists. Closing it
  // ensures a clean slate for the next recording session.
  await closeOffscreen();
}

async function handleScreenshot(sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    await saveMediaLocally(blob, "image");

    // Screenshots also use saveAs: true so the user can choose where to save
    chrome.downloads.download({
      url: dataUrl,
      filename: `screenshot-${Date.now()}.png`,
      saveAs: true,
    });

    chrome.storage.local.get(["captureCount"], (result) => {
      const count = (result.captureCount || 0) + 1;
      chrome.storage.local.set({ captureCount: count });
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error("Screenshot failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Creates offscreen document if one doesn't already exist
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DISPLAY_MEDIA"],
    justification: "Tab screen recording via tabCapture",
  });
}

// Closes and destroys the offscreen document after recording ends
// Chrome keeps the tab's media stream alive as long as the document exists.
// Closing it ensures a clean slate for the next recording.
async function closeOffscreen() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
      console.log("Offscreen document closed");
    }
  } catch (err) {
    console.error("Failed to close offscreen document:", err);
  }
}

// --- Sync Manager ---
// Handles pending uploads saved in IndexedDB (from screenshots or videos)
// Tries to sync them to backend when online
chrome.runtime.onStartup.addListener(checkAndSync);
chrome.runtime.onInstalled.addListener(checkAndSync);
self.addEventListener("online", checkAndSync);

async function checkAndSync() {
  if (!navigator.onLine) return;

  const pending = await getPendingUploads();
  if (pending.length === 0) return;

  console.log(`Syncing ${pending.length} pending items...`);

  for (const item of pending) {
    try {
      await uploadToBackend(item.blob, item.type);
      console.log(`Successfully synced item ${item.id}`);
      await deleteLocalMedia(item.id);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}`, error);
    }
  }
}

async function uploadToBackend(blob, type) {
  const formData = new FormData();
  formData.append(
    "file",
    blob,
    `capture-${Date.now()}.${type === "video" ? "webm" : "png"}`
  );

  const response = await fetch("http://localhost:3001/upload/drive", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Upload to backend failed");
  return response.json();
}