// background.js — AntCapture
// Flow: screenshot/video → upload directly to backend (Prisma/SQLite) → show on Web UI
// No local machine downloads. IndexedDB is only used as a fallback queue when offline or not logged in.

import {
  saveMediaLocally,
  getPendingUploads,
  deleteLocalMedia,
} from "./storage.js";

const BACKEND_URL = 'https://api.antcapture.anttake.com';

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
  } else if (message.action === 'VIDEO_BLOB_READY') {
    // Offscreen has finished recording — upload the blob to the backend
    handleVideoBlobReady(message, sendResponse);
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
// Catches the redirect to /auth/success?auth_data=...
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.includes('/auth/success?auth_data=')) {
    try {
      const url = new URL(changeInfo.url);
      const authData = url.searchParams.get('auth_data');
      if (authData) {
        const base64Url = authData.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const userData = JSON.parse(jsonPayload);
        userData.jwt = authData;

        chrome.storage.local.set({ user: userData }, () => {
          console.log('✨ User authenticated in extension:', userData.email);
          setTimeout(() => chrome.tabs.remove(tabId), 1500);
          // Sync any offline-queued captures
          syncPendingUploads();
        });
      }
    } catch (e) {
      console.error('Failed to parse extension auth data:', e);
    }
  }
});

// --- Recording Handlers ---

async function handleStartRecording(message, sendResponse) {
  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'start-recording' });
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
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' });
    await chrome.storage.local.set({ isRecording: false });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Stop recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- Screenshot: take it and upload directly to backend ---
async function handleTakeScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];

    // Chrome blocks screenshots on chrome://, extension pages, and new tab pages
    if (!tab || !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url === 'about:blank' ||
        tab.url === 'about:newtab') {
      sendResponse({ success: false, error: 'Cannot screenshot this page. Navigate to a real website first.' });
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const blob = dataURItoBlob(dataUrl);

    const { user } = await chrome.storage.local.get(['user']);
    if (user && user.jwt && navigator.onLine) {
      try {
        await uploadToBackend(blob, 'image', user.jwt);
        console.log('✅ Screenshot uploaded to backend (Prisma DB)');
        chrome.storage.local.get(['captureCount'], (result) => {
          chrome.storage.local.set({ captureCount: (result.captureCount || 0) + 1 });
        });
        sendResponse({ success: true, dataUrl });
      } catch (uploadErr) {
        console.error('Upload failed, saving locally:', uploadErr.message);
        await saveMediaLocally(blob, 'image');
        sendResponse({ success: true, dataUrl, queued: true, warning: uploadErr.message });
      }
    } else {
      console.log('Not logged in or offline — queuing screenshot');
      await saveMediaLocally(blob, 'image');
      sendResponse({ success: true, dataUrl, queued: true });
    }
  } catch (error) {
    console.error('Screenshot failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- Video: offscreen sends the blob here, we upload to backend ---
async function handleVideoBlobReady(message, sendResponse) {
  try {
    const { blobDataUrl, mimeType } = message;

    // Convert data URL back to blob
    const fetchRes = await fetch(blobDataUrl);
    const blob = await fetchRes.blob();

    const { user } = await chrome.storage.local.get(['user']);
    if (user && user.jwt && navigator.onLine) {
      try {
        await uploadToBackend(blob, 'video', user.jwt);
        console.log('✅ Video uploaded to backend');
        chrome.storage.local.get(['captureCount'], (result) => {
          chrome.storage.local.set({ captureCount: (result.captureCount || 0) + 1 });
        });
      } catch (uploadErr) {
        console.error('Direct upload failed, queueing for later:', uploadErr.message);
        await saveMediaLocally(blob, 'video');
        if (sendResponse) sendResponse({ success: true, queued: true, warning: uploadErr.message });
        return;
      }
    } else {
      console.log('Not logged in or offline — queuing video');
      await saveMediaLocally(blob, 'video');
    }
    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    console.error('Video upload failed:', error);
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
}

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DISPLAY_MEDIA'],
    justification: 'Media recording'
  });
}

// --- Offline Sync: upload anything queued while offline/logged-out ---
chrome.runtime.onStartup.addListener(syncPendingUploads);
chrome.runtime.onInstalled.addListener(syncPendingUploads);
self.addEventListener("online", syncPendingUploads);

async function syncPendingUploads() {
  if (!navigator.onLine) return;

  const { user } = await chrome.storage.local.get(['user']);
  if (!user || !user.jwt) {
    console.log('No user logged in — skipping sync');
    return;
  }

  const pending = await getPendingUploads();
  if (pending.length === 0) return;

  console.log(`Syncing ${pending.length} pending items...`);

  for (const item of pending) {
    try {
      await uploadToBackend(item.blob, item.type, user.jwt);
      console.log(`✅ Synced item ${item.id}`);
      await deleteLocalMedia(item.id);
      
      // Update local capture count so UI reflects the synced files
      chrome.storage.local.get(['captureCount'], (result) => {
        chrome.storage.local.set({ captureCount: (result.captureCount || 0) + 1 });
      });
    } catch (error) {
      console.error(`Sync failed for ${item.id}:`, error.message);
      break; // Don't keep trying if server is down
    }
  }
}

async function uploadToBackend(blob, type, jwt) {
  const formData = new FormData();
  formData.append(
    'file',
    blob,
    `capture-${Date.now()}.${type === 'video' ? 'webm' : 'png'}`
  );

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.error || errorMsg;
    } catch (e) {
      errorMsg += ` - ${await response.text()}`;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Convert dataUrl to Blob without using fetch() (fetch on data: fails in MV3 service workers)
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {type: mimeString});
}