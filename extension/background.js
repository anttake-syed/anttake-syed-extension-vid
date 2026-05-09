// background.js
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
  } else if (message.action === 'VIDEO_SAVED_LOCALLY') {
    // Offscreen finished saving the video blob — now sync it
    checkAndSync();
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
  } else if (message.action === 'OPEN_POPUP') {
  chrome.action.openPopup();
  sendResponse({ success: true });
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
          // Sync any captures that were taken before login
          checkAndSync();
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

async function handleTakeScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const windowId = tabs.length > 0 ? tabs[0].windowId : chrome.windows.WINDOW_ID_CURRENT;
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Save to IndexedDB
    await saveMediaLocally(blob, 'image');

    // Save locally to computer (unchanged)
    chrome.downloads.download({
      url: dataUrl,
      filename: `screenshot-${Date.now()}.png`
    });

    chrome.storage.local.get(['captureCount'], (result) => {
      chrome.storage.local.set({ captureCount: (result.captureCount || 0) + 1 });
    });

    // Immediately try to sync to backend
    checkAndSync();

    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Screenshot failed:', error);
    sendResponse({ success: false, error: error.message });
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

// --- Sync Manager ---
chrome.runtime.onStartup.addListener(checkAndSync);
chrome.runtime.onInstalled.addListener(checkAndSync);
self.addEventListener("online", checkAndSync);

async function checkAndSync() {
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
    } catch (error) {
      console.error(`Sync failed for ${item.id}:`, error.message);
      // Stop trying if server is down — don't burn through all items
      break;
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

  const response = await fetch('http://localhost:3001/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }

  return response.json();
}