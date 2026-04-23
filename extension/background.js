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
  } else if (message.action === 'STOP_RECORDING') {
    handleStopRecording(message, sendResponse);
    return true;
  } else if (message.action === 'TAKE_SCREENSHOT') {
    handleTakeScreenshot(message, sendResponse);
    return true;
  } else if (message.action === 'OPEN_DOWNLOAD_TAB') {
    chrome.tabs.create({ url: `download.html?id=${message.id}`, active: true });
    
    chrome.storage.local.get(['captureCount'], (result) => {
      chrome.storage.local.set({ captureCount: (result.captureCount || 0) + 1 });
    });
    return true;
  } else if (message.action === 'EXTERNAL_STOP_RECORDING') {
    chrome.storage.local.set({ isRecording: false });
    return true;
  } else if (message.action === 'GET_USER') {
    chrome.storage.local.get(['user'], (result) => {
      sendResponse({ user: result.user || null });
    });
    return true;
  } else if (message.action === 'LOGOUT') {
    chrome.storage.local.remove(['user'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// --- Auth Listener ---
// Catch the redirect to /auth/success?auth_data=...
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.includes('/auth/success?auth_data=')) {
    try {
      const url = new URL(changeInfo.url);
      const authData = url.searchParams.get('auth_data');
      if (authData) {
        // Parse the JWT payload
        const base64Url = authData.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userData = JSON.parse(jsonPayload);
        userData.jwt = authData; // Store the original JWT for auth headers

        chrome.storage.local.set({ user: userData }, () => {
          console.log('✨ User authenticated in extension:', userData.email);
          // Briefly show success then close tab
          setTimeout(() => {
            chrome.tabs.remove(tabId);
          }, 1500);
        });
      }
    } catch (e) {
      console.error('Failed to parse extension auth data:', e);
    }
  }
});

async function handleStartRecording(message, sendResponse) {
  try {
    await ensureOffscreen();
    
    // Tell offscreen to initiate the capture flow
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'start-recording'
    });
    
    await chrome.storage.local.set({ isRecording: true });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Start recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleStopRecording(message, sendResponse) {
  try {
    await ensureOffscreen();
    await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'stop-recording'
    });
    
    await chrome.storage.local.set({ isRecording: false });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Stop recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTakeScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const windowId = tabs.length > 0 ? tabs[0].windowId : chrome.windows.WINDOW_ID_CURRENT;
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    
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
    reasons: ['DISPLAY_MEDIA'],
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

  const { user } = await chrome.storage.local.get(['user']);
  const headers = {};
  if (user && user.jwt) {
    headers['Authorization'] = `Bearer ${user.jwt}`;
  }

  const response = await fetch("http://localhost:3001/upload/drive", {
    method: "POST",
    headers: headers,
    body: formData,
  });

  if (!response.ok) throw new Error("Upload to backend failed");
  return response.json();
}