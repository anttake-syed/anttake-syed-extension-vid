// background/recording.js — AntCapture
// Handles start/stop recording and processing of video blobs from offscreen.js
// and camera recording (via content.js injected into the active tab).

import { saveMediaLocally } from '../storage/storage.js';
import { saveCapture } from './save.js';
import { Logger } from '../shared/logger.js';

const log = Logger.getLogger('Background: Recording');

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
    let tabTitle = message.tabTitle;
    if (!tabTitle) {
      const { recordingTabTitle } = await chrome.storage.local.get(['recordingTabTitle']);
      tabTitle = recordingTabTitle || '';
    }

    const options = {
      mode:       message.recordMode || 'screen',
      resolution: message.resolution || 1080,
      includeMic: message.includeMic === true,
      includeCam: message.includeCam === true,
      format:     message.format     || 'webm',
      tabTitle:   tabTitle
    };

    if (options.mode === 'overlay') {
      // Use currentWindow first (most reliable), fall back to lastFocusedWindow
      let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0];
      if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
        // Inject content scripts first, then message — avoids race where message
        // arrives before the content script listener is registered.
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        } catch (_) { /* Already injected — fine */ }

        // Pin this tab for BOTH the webcam bubble AND the HUD control bar
        await chrome.storage.local.set({
          activeOverlayTabId: tab.id,
          pendingHudTabId: tab.id,   // override whatever background.js set — must be same tab
        });

        // 400ms allows content.js modules to fully register their message listeners
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'START_WEBCAM_BUBBLE' }).catch(() => {});
        }, 400);
      } else {
        log.warn('Webcam bubble cannot be shown on this page type', tab?.url);
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
    log.error('Start recording failed', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleStopRecording
// ─────────────────────────────────────────────────────────────────────────────
// STOP ORDER — CRITICAL:
//   1. Signal the recording engine (offscreen / camera) to STOP first.
//      The engine finalizes the blob in its onstop handler. This MUST fire
//      before any streams are torn down.
//   2. THEN clean up overlay UI (HUD, webcam bubble). The webcam bubble's
//      stream is display-only and independent of the recording pipeline, but
//      removing it prematurely has historically caused confusion. We defer it.
//
// The UI cleanup is also triggered inside OPEN_EDIT_PAGE_FOR_VIDEO (background.js)
// which fires after the blob is confirmed saved — that is the safest moment.
// Here we clean up proactively so the user sees the HUD/bubble disappear promptly.
export async function handleStopRecording(message, sendResponse) {
  try {
    // ── STEP 1: Set state flags BEFORE signalling the recorders ──────────────
    // _stoppedNormally prevents EXTERNAL_STOP_RECORDING from misfiring.
    await chrome.storage.local.set({ isRecording: false, _stoppedNormally: true });

    // ── STEP 2: Tell the recording engines to stop ───────────────────────────
    // Both may be active simultaneously (overlay mode = screen + camera).
    // Signal them before touching any UI so no stream is killed prematurely.
    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop-recording' }).catch(() => {});

    // Tell all tabs to stop camera recording (camera-only or overlay mode)
    chrome.tabs.query({}, (allTabs) => {
      allTabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: 'STOP_CAMERA_RECORDING' }).catch(() => {}));
    });

    // ── STEP 3: Clean up overlay UI ──────────────────────────────────────────
    // HUD and webcam bubble are cosmetic — safe to remove now that recorders
    // have been told to stop. They will continue finalizing asynchronously.
    const { activeHudTabId } = await chrome.storage.local.get(['activeHudTabId']);
    if (activeHudTabId) {
      chrome.tabs.sendMessage(activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(() => {});
      chrome.storage.local.remove('activeHudTabId');
    }

    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (tab && !tab.url.startsWith('chrome://')) {
      chrome.tabs.sendMessage(tab.id, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
    }
    const { activeOverlayTabId } = await chrome.storage.local.get(['activeOverlayTabId']);
    if (activeOverlayTabId && activeOverlayTabId !== tab?.id) {
      chrome.tabs.sendMessage(activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
    }
    chrome.storage.local.remove('activeOverlayTabId');

    sendResponse({ success: true });
  } catch (error) {
    log.error('Stop recording failed', error);
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
    const { blobDataUrl, mimeType, resolution, format, hasAudio } = message;
    
    // Convert dataURL back to blob
    const blobRes = await fetch(blobDataUrl);
    const blob = await blobRes.blob();

    // Read the tab title stored when recording started.
    // Clean it up immediately to prevent leaking into the next recording.
    const { recordingTabTitle = '', activeHudTabId } = await chrome.storage.local.get(['recordingTabTitle', 'activeHudTabId']);
    chrome.storage.local.remove('recordingTabTitle');
    
    if (activeHudTabId) {
      chrome.tabs.sendMessage(activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(() => {});
      chrome.storage.local.remove('activeHudTabId');
    }
    
    await saveCapture(blob, 'video', resolution, format, hasAudio, recordingTabTitle);
    
    // Reset recording state
    await chrome.storage.local.set({ isRecording: false });

    if (sendResponse) sendResponse({ success: true });
  } catch (error) {
    log.error('Camera blob save failed', error);
    chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?error=camera_failed`) });
    if (sendResponse) sendResponse({ success: false, error: error.message });
  }
}
