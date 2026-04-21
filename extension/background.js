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
  if (message.action === 'START_RECORDING') {
    handleStartRecording(message, sendResponse);
    return true;
  } else if (message.action === 'TAKE_SCREENSHOT') {
    handleTakeScreenshot(message, sendResponse);
    return true;
  }
});

async function handleStartRecording(message, sendResponse) {
  try {
    chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], async (streamId) => {
      if (!streamId) {
        sendResponse({ success: false, error: 'No stream selected' });
        return;
      }
      
      await ensureOffscreen();
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'start-recording',
        streamId
      });
      sendResponse({ success: true });
    });
  } catch (error) {
    console.error('Start recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTakeScreenshot(message, sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    
    // Convert dataUrl to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Save locally for cloud sync
    await saveMediaLocally(blob, 'image');

    // Handle screenshot: download
    chrome.downloads.download({
      url: dataUrl,
      filename: `screenshot-${Date.now()}.png`
    });

    // Increment capture count
    chrome.storage.local.get(['captureCount'], (result) => {
      const count = (result.captureCount || 0) + 1;
      chrome.storage.local.set({ captureCount: count });
    });
    
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Screenshot failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Creates offscreen document if one doesn't already exist
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Media recording'
  });
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