// background.js
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

  if (message.action === "START_RECORDING") {
    // FIX #2: tabCapture now lives entirely in the background script.
    // Previously popup.js and offscreen.js both tried to call tabCapture,
    // which only works here in the service worker. We centralize it here.
    handleStartRecording(sendResponse);
    return true; // FIX #3: Keep message channel open for async sendResponse
  }

  if (message.action === "STOP_RECORDING") {
    handleStopRecording(sendResponse);
    return true;
  }

  if (message.action === "TAKE_SCREENSHOT") {
    handleScreenshot(sendResponse);
    return true;
  }

  // NEW: Handle save request from offscreen.
  // Offscreen documents cannot call chrome.downloads directly — only the
  // background service worker has access to that API. Offscreen sends the
  // finished recording as a base64 data URL and we trigger the download here
  // with saveAs: true, which opens the native Mac "Save As" dialog so the
  // user can choose exactly where to save their recording.
  if (message.action === "SAVE_RECORDING") {
    chrome.downloads.download({
      url: message.dataUrl,
      filename: message.filename,
      saveAs: true, // <-- this is what opens the "Save As" dialog on Mac
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Save As failed:", chrome.runtime.lastError.message);
      } else {
        console.log("Save As dialog opened, download ID:", downloadId);
      }
    });
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
      streamId: streamId,
    });

    // FIX #7: Persist recording state so popup reflects correct state on
    // reopen. Previously isRecording was only in popup memory and reset
    // every time the popup was closed and reopened.
    await chrome.storage.local.set({ isRecording: true });

    sendResponse({ success: true });
  } catch (err) {
    console.error("Failed to start recording:", err);
    sendResponse({ success: false, error: err.message });
  }
}

async function handleStopRecording(sendResponse) {
  try {
    await ensureOffscreen();

    // FIX #5 (same): Consistent action naming
    await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "STOP_RECORDING",
    });

    // FIX #7: Clear persisted recording state on stop
    await chrome.storage.local.set({ isRecording: false });

    sendResponse({ success: true });
  } catch (err) {
    console.error("Failed to stop recording:", err);
    sendResponse({ success: false, error: err.message });
  }
}

async function handleScreenshot(sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });

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

// FIX #8: Deduplicated offscreen creation into one reusable function.
// Previously there were two copies of this logic: one inline inside the
// message listener, and one named function that was defined but never called.
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    // FIX #9: Changed reason from USER_MEDIA to DISPLAY_MEDIA.
    // tabCapture / screen recording requires DISPLAY_MEDIA, not USER_MEDIA.
    // Using the wrong reason causes the offscreen document to be rejected.
    reasons: ["DISPLAY_MEDIA"],
    justification: "Tab screen recording via tabCapture",
  });
}

// --- Sync Manager (was already correct, no changes) ---

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