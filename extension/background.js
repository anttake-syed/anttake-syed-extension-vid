import { saveMediaLocally, getPendingUploads, deleteLocalMedia } from './storage.js';

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'START_RECORDING') {
    chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], async (streamId) => {
      if (!streamId) return;
      
      await createOffscreen();
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'start-recording',
        streamId
      });
    });
  } else if (message.action === 'TAKE_SCREENSHOT') {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    // Handle screenshot: download or upload to Drive
    chrome.downloads.download({
      url: dataUrl,
      filename: `screenshot-${Date.now()}.png`
    });
  }
});

async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Media recording'
  });
}

// Sync Manager
chrome.runtime.onStartup.addListener(checkAndSync);
chrome.runtime.onInstalled.addListener(checkAndSync);

// Monitor network connection
self.addEventListener('online', checkAndSync);

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
  formData.append('file', blob, `capture-${Date.now()}.${type === 'video' ? 'webm' : 'png'}`);

  const response = await fetch('http://localhost:3001/upload/drive', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload to backend failed');
  }

  return response.json();
}
