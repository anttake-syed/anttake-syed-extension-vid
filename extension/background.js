// background.js — AntCapture (Service Worker Entry Point)
// ─────────────────────────────────────────────────────────────────────────────
// This file is intentionally small. All feature logic lives in background/ modules:
//
//   background/recording.js   — start/stop recording, video blob handling
//   background/screenshot.js  — tab / region / full-screen screenshots
//   background/save.js        — unified saveCapture(), syncPendingUploads()
//   background/upload.js      — localhost and Google Drive upload logic
//   background/notify.js      — Chrome notification helper (auto-dismiss)
// ─────────────────────────────────────────────────────────────────────────────

import { getPendingUploads, deleteLocalMedia, cleanTemporaryMedia } from './storage/storage.js';
import { syncPendingUploads } from './background/save.js';
import { notify } from './background/notify.js';
import {
  handleStartRecording,
  handleStopRecording,
  handleVideoBlobStored,
  handleVideoBlobReady,
} from './background/recording.js';
import {
  handleTakeScreenshot,
  handleRegionScreenshot,
  handleScreenScreenshot,
} from './background/screenshot.js';

// Use chrome.alarms for the badge timer — setInterval dies when the service worker goes idle in MV3
const BADGE_ALARM = '__ant_badge_tick__';

// ─────────────────────────────────────────────────────────────────────────────
// Message Router
// Every message from the popup, content script, or offscreen doc is dispatched
// here and forwarded to the appropriate handler module.
// ─────────────────────────────────────────────────────────────────────────────
// Standalone popup window removed

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {

    // ── Recording ────────────────────────────────────────────────────────────
    case 'START_RECORDING':
      handleStartRecording(message, sendResponse);
      return true;

    case 'STOP_RECORDING':
      chrome.alarms.clear(BADGE_ALARM);
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeText({ text: '' });
      handleStopRecording(message, sendResponse);
      return true;

    case 'PAUSE_RECORDING':
      chrome.storage.local.get(['isRecordingPaused', 'pausedAt'], (res) => {
        if (!res.isRecordingPaused) {
          chrome.storage.local.set({
            isRecordingPaused: true,
            pausedAt: Date.now()
          }, () => {
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'pause-recording' });
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_RECORDING' }).catch(() => {});
                chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_CAMERA_RECORDING' }).catch(() => {});
              });
            });
          });
        }
      });
      return true;

    case 'RESUME_RECORDING':
      chrome.storage.local.get(['isRecordingPaused', 'pausedAt', 'pausedOffset'], (res) => {
        if (res.isRecordingPaused) {
          const pauseDuration = Date.now() - (res.pausedAt || Date.now());
          const newOffset = (res.pausedOffset || 0) + pauseDuration;
          chrome.storage.local.set({
            isRecordingPaused: false,
            pausedAt: null,
            pausedOffset: newOffset
          }, () => {
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'resume-recording' });
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'RESUME_RECORDING' }).catch(() => {});
                chrome.tabs.sendMessage(tab.id, { action: 'RESUME_CAMERA_RECORDING' }).catch(() => {});
              });
            });
          });
        }
      });
      return true;

    case 'DISCARD_RECORDING':
      chrome.alarms.clear(BADGE_ALARM);
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeText({ text: '' });
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'discard-recording' });
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'DISCARD_CAMERA_RECORDING' }).catch(() => {});
      });
      chrome.storage.local.set({ isRecording: false, isRecordingPaused: false, _stoppedNormally: true });
      chrome.storage.local.get(['activeHudTabId', 'activeOverlayTabId'], (res) => {
         if (res.activeHudTabId) {
             chrome.tabs.sendMessage(res.activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(()=>{});
             chrome.storage.local.remove('activeHudTabId');
         }
         if (res.activeOverlayTabId) {
             chrome.tabs.sendMessage(res.activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(()=>{});
             chrome.storage.local.remove('activeOverlayTabId');
         }
      });
      return true;

    case 'OPEN_EDIT_PAGE_FOR_VIDEO':
      chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?id=${message.itemId}`) });
      chrome.storage.local.get(['_stoppedNormally', 'activeOverlayTabId', 'activeHudTabId'], (res) => {
        if (!res._stoppedNormally) {
          if (res.activeHudTabId) chrome.tabs.sendMessage(res.activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(()=>{});
          if (res.activeOverlayTabId) chrome.tabs.sendMessage(res.activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(()=>{});
        }
        chrome.storage.local.set({ isRecording: false });
      });
      return true;

    case 'CAMERA_BLOB_READY':
      // Camera recording in content.js finished — blob arrives as a data URL
      handleVideoBlobReady(message, sendResponse);
      return true;

    case 'FORMAT_FALLBACK':
      // Offscreen couldn't use the requested format; persist for popup toast
      chrome.storage.local.set({
        formatFallback: { requested: message.requested, actual: message.actual, ts: Date.now() },
      });
      return true;

    case 'OPEN_EDIT_PAGE':
      const errParam = message.error ? `?error=${message.error}` : '';
      chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html${errParam}`) });
      return true;

    // ── Screenshots ──────────────────────────────────────────────────────────
    case 'TAKE_SCREENSHOT':
      handleTakeScreenshot(message, sendResponse);
      return true;

    case 'OFFSCREEN_RECORDING_STARTED':
    case 'CAMERA_RECORDING_STARTED':
      chrome.storage.local.set({
        recordingStartTime: Date.now(),
        isRecordingPaused: false,
        pausedOffset: 0,
        pausedAt: null
      }, () => {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        chrome.action.setBadgeText({ text: '0:00' });
        
        // Standalone popup window removed

        // Use alarm-based ticking — survives service worker idle restarts
        chrome.alarms.clear(BADGE_ALARM, () => {
          chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 1/60 }); // fires every ~1 second
        });
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'SHOW_CONTROL_BAR' }).catch(() => {});
            chrome.storage.local.set({ activeHudTabId: tabs[0].id });
          }
        });
      });
      return true;

    case 'REGION_SCREENSHOT':
      handleRegionScreenshot(message, sendResponse);
      return true;

    case 'SCREEN_SCREENSHOT':
      handleScreenScreenshot(message, sendResponse);
      return true;

    case 'EXTERNAL_STOP_RECORDING':
      chrome.alarms.clear(BADGE_ALARM);
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeText({ text: '' });
      chrome.storage.local.get(['activeOverlayTabId', 'activeHudTabId', '_stoppedNormally'], (res) => {
        if (res._stoppedNormally) {
          chrome.storage.local.remove('_stoppedNormally');
          return;
        }
        if (res.activeHudTabId) {
          chrome.tabs.sendMessage(res.activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(() => {});
          chrome.storage.local.remove('activeHudTabId');
        }
        if (res.activeOverlayTabId) {
          chrome.tabs.sendMessage(res.activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
          chrome.storage.local.remove('activeOverlayTabId');
        }
        chrome.storage.local.set({ isRecording: false });
      });
      return true;

    // ── HUD mic/cam toggles (from the in-page HUD buttons) ────────────────────
    case 'HUD_TOGGLE_MIC':
      chrome.storage.local.set({ recMic: message.on === true });
      return true;

    case 'HUD_TOGGLE_CAM':
      chrome.storage.local.set({ recCam: message.on === true });
      chrome.storage.local.get(['isRecording', 'currentRecordMode', 'activeOverlayTabId'], (res) => {
        if (res.isRecording && res.currentRecordMode === 'overlay') {
          if (message.on === true) {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
              const tab = tabs[0];
              if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
                chrome.tabs.sendMessage(tab.id, { action: 'START_WEBCAM_BUBBLE' }).catch(() => {});
                chrome.storage.local.set({ activeOverlayTabId: tab.id });
              }
            });
          } else {
            if (res.activeOverlayTabId) {
              chrome.tabs.sendMessage(res.activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
              chrome.storage.local.remove('activeOverlayTabId');
            }
          }
        }
      });
      return true;

    // ── Camera-only: inject content.js into the active foreground tab ─────────
    case 'START_CAMERA_IN_TAB':
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
          chrome.tabs.sendMessage(tab.id, { action: 'START_CAMERA_RECORDING', options: message.options });
        } else {
          chrome.storage.local.set({ isRecording: false });
          notify('cam-error', 'AntCapture Error', 'Cannot record camera on this type of page (Chrome settings/new tab). Please open a normal website first.');
        }
      });
      return true;

    // ── Auth ──────────────────────────────────────────────────────────────────
    case 'GET_USER':
      chrome.storage.local.get(['user'], (result) => sendResponse({ user: result.user || null }));
      return true;

    case 'LOGOUT':
      chrome.storage.local.remove(['user'], () => {
        const broadcast = (pattern) => {
          chrome.tabs.query({ url: pattern }, (tabs) =>
            tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: 'LOGOUT_WEB_UI' }).catch(() => {}))
          );
        };
        broadcast('*://antcapture.anttake.com/*');
        broadcast('*://localhost:5173/*');
        sendResponse({ success: true });
      });
      return true;

    case 'SYNC_USER':
      if (message.user) {
        chrome.storage.local.set({ user: message.user }, () => {
          console.log('✨ User synced from Web UI:', message.user.email);
          syncPendingUploads();
        });
      } else {
        chrome.storage.local.remove(['user'], () => console.log('User signed out from Web UI.'));
      }
      return true;

    case 'REGISTER_WEB_UI':
      if (message.url) {
        chrome.storage.local.set({ dynamicWebUiUrl: message.url }, () =>
          console.log('✨ Extension learned dynamic Web UI URL:', message.url)
        );
      }
      return true;

    // ── Queue / Cache ─────────────────────────────────────────────────────────
    case 'GET_CACHE_INFO':
      chrome.storage.local.get(['storageMode'], (res) => {
        const mode = res.storageMode || 'computer';
        getPendingUploads(mode === 'localhost' ? 'localhost' : 'cloud')
          .then((pending) => {
            const totalBytes = pending.reduce((acc, item) => acc + (item.blob?.size || 0), 0);
            const items = pending.map(item => ({
              id: item.id, type: item.type, size: item.blob?.size || 0,
              timestamp: item.timestamp, mode: item.mode || 'cloud',
            }));
            sendResponse({ sizeBytes: totalBytes, count: pending.length, items });
          })
          .catch((err) => sendResponse({ sizeBytes: 0, count: 0, items: [], error: err.message }));
      });
      return true;

    case 'CLEAR_CACHE':
      chrome.storage.local.get(['storageMode'], (res) => {
        const mode = res.storageMode || 'computer';
        getPendingUploads(mode === 'localhost' ? 'localhost' : 'cloud')
          .then(async (pending) => {
            for (const item of pending) await deleteLocalMedia(item.id);
            sendResponse({ success: true });
          })
          .catch((err) => sendResponse({ success: false, error: err.message }));
      });
      return true;

    case 'SYNC_PENDING':
      syncPendingUploads()
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ success: false, error: err.message, synced: 0, failed: 0, errors: [err.message] }));
      return true;

    default:
      break;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth Listener — detects the /auth/success redirect and extracts the JWT
// ─────────────────────────────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (!currentUrl || !currentUrl.includes('/auth/success?auth_data=')) return;

  try {
    const url = new URL(currentUrl);
    const authData = url.searchParams.get('auth_data');
    if (!authData) return;

    const base64Url = authData.split('.')[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );

    const userData = JSON.parse(jsonPayload);
    userData.jwt = authData;

    chrome.storage.local.set({ user: userData }, () => {
      console.log('✨ User authenticated in extension:', userData.email);
      setTimeout(() => chrome.tabs.remove(tabId), 1500);
      syncPendingUploads();
    });
  } catch (e) {
    console.error('Failed to parse extension auth data:', e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Offline Sync — retry queued uploads whenever the worker starts or goes online
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onStartup.addListener(() => {
  cleanTemporaryMedia();
  syncPendingUploads();
});
chrome.runtime.onInstalled.addListener(() => {
  cleanTemporaryMedia();
  syncPendingUploads();
});
self.addEventListener('online', syncPendingUploads);

// ─────────────────────────────────────────────────────────────────────────────
// Badge Timer via chrome.alarms — survives service worker idle restarts
// ─────────────────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== BADGE_ALARM) return;
  chrome.storage.local.get(['isRecording', 'recordingStartTime', 'isRecordingPaused', 'pausedOffset', 'pausedAt'], (res) => {
    if (!res.isRecording || !res.recordingStartTime) {
      // Recording ended but alarm not cleared yet
      chrome.alarms.clear(BADGE_ALARM);
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    let elapsedMs;
    if (res.isRecordingPaused) {
      elapsedMs = (res.pausedAt || Date.now()) - res.recordingStartTime - (res.pausedOffset || 0);
    } else {
      elapsedMs = Date.now() - res.recordingStartTime - (res.pausedOffset || 0);
    }
    const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
    const mins = Math.floor(elapsed / 60);
    const secs = String(elapsed % 60).padStart(2, '0');
    chrome.action.setBadgeText({ text: `${mins}:${secs}` });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (HUD Logic removed as requested)
// ─────────────────────────────────────────────────────────────────────────────

