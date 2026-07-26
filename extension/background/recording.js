// background/recording.js — AntCapture
// Handles start/stop recording and processing of video blobs from offscreen.js
// and camera recording (via content.js injected into the active tab).

import { saveMediaLocally } from '../storage/storage.js';
import { dataURItoBlob } from './save.js';

// ─────────────────────────────────────────────────────────────────────────────
// ensureOffscreen — creates the offscreen document if it doesn't exist.
// The offscreen doc is long-lived and reused between start/stop.
// ─────────────────────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['DISPLAY_MEDIA', 'USER_MEDIA'],
    justification: 'Media recording',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// handleStartRecording
// ─────────────────────────────────────────────────────────────────────────────
export async function handleStartRecording(message, sendResponse) {
  try {
    const options = {
      mode:       message.recordMode || 'screen',
      resolution: message.resolution || 1080,
      includeMic: message.includeMic === true,
      includeCam: message.includeCam === true,
      format:     message.format     || 'webm',
    };

    if (options.mode === 'overlay') {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0];
      if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
        chrome.tabs.sendMessage(tab.id, { action: 'START_WEBCAM_BUBBLE' });
        await chrome.storage.local.set({ activeOverlayTabId: tab.id });
      } else {
        console.warn('AntCapture: Webcam bubble cannot be shown on this page type.');
      }
    }

    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'start-recording', options });
    await chrome.storage.local.set({ 
      isRecording: true, 
      _stoppedNormally: false,
      currentRecordMode: options.mode,
      recordingStartTime: Date.now(),
      pausedOffset: 0,
      pausedAt: null,
      isRecordingPaused: false
    });



    sendResponse({ success: true });
  } catch (error) {
    console.error('Start recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleStopRecording
// ─────────────────────────────────────────────────────────────────────────────
export async function handleStopRecording(message, sendResponse) {
  try {
    // Hide the in-page HUD
    const { activeHudTabId } = await chrome.storage.local.get(['activeHudTabId']);
    if (activeHudTabId) {
      chrome.tabs.sendMessage(activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(() => {});
      chrome.storage.local.remove('activeHudTabId');
    }

    // Remove the webcam bubble from the active tab (if overlay mode was used)
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (tab && !tab.url.startsWith('chrome://')) {
      chrome.tabs.sendMessage(tab.id, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
    }
    // Also clean up via the stored tab ID in case the user switched tabs
    const { activeOverlayTabId } = await chrome.storage.local.get(['activeOverlayTabId']);
    if (activeOverlayTabId && activeOverlayTabId !== tab?.id) {
      chrome.tabs.sendMessage(activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
    }
    chrome.storage.local.remove('activeOverlayTabId');

    // Set stopped Normally before telling offscreen to stop
    // so EXTERNAL_STOP_RECORDING does not misfire
    await chrome.storage.local.set({ isRecording: false, _stoppedNormally: true });

    await ensureOffscreen();
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Stop recording failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleVideoBlobReady
// Called when camera recording in content.js finishes and sends a data URL.
// Saves to IndexedDB once then opens edit.html — same pattern as screenshot.
// ─────────────────────────────────────────────────────────────────────────────
export async function handleVideoBlobReady(message, sendResponse) {
  try {
    const { blobDataUrl, mimeType, isImage, resolution, format } = message;
    const type = isImage ? 'image' : 'video';

    if (!blobDataUrl) throw new Error('No blob data received');
    const blob = dataURItoBlob(blobDataUrl);
    if (blob.size === 0) throw new Error('Reconstructed blob is empty — recording may have failed.');

    // Reset recording state
    await chrome.storage.local.set({ isRecording: false });

    // Save once to IndexedDB as 'preview', then open edit.html
    const itemId = await saveMediaLocally(blob, type, 'preview', resolution, format);
    chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?id=${itemId}`) });

    if (sendResponse) sendResponse({ success: true, previewId: itemId });
  } catch (error) {
    console.error('Camera blob save failed:', error);
    chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?error=camera_failed`) });
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
}
