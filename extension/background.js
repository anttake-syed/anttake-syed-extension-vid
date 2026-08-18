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

import { getPendingUploads, deleteLocalMedia, cleanTemporaryMedia, getMediaById } from './storage/storage.js';
import { syncPendingUploads } from './background/save.js';
import { notify } from './background/notify.js';
import { Logger } from './shared/logger.js';
import { cleanOPFSOrphans, deleteOPFSFile } from './storage/opfsStorage.js';

const log = Logger.getLogger('Background Worker');
import {
  handleStartRecording,
  handleStopRecording,
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
      (async () => {
        if (message.tabTitle) {
          await chrome.storage.local.set({
            recordingTabTitle: message.tabTitle,
            recordingTabUrl:   message.tabUrl || '',
          });
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (tab) {
            const isRestricted = tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://');
            await chrome.storage.local.set({ pendingHudTabId: isRestricted ? null : tab.id });
          }
        } else {
          const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          const tab = tabs[0];
          if (tab) {
            const isRestricted = tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://');
            await chrome.storage.local.set({
              pendingHudTabId:    isRestricted ? null : tab.id,
              recordingTabTitle:  tab.title || '',
              recordingTabUrl:    tab.url || '',
            });
          }
        }
        handleStartRecording(message, sendResponse);
      })();
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
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'pause-recording' }).catch(() => {});
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_RECORDING' }).catch(() => {});
                chrome.tabs.sendMessage(tab.id, { action: 'PAUSE_CAMERA_RECORDING' }).catch(() => {});
              });
            });
          });
        }
      });
      break; // fire-and-forget, no sendResponse

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
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'resume-recording' }).catch(() => {});
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'RESUME_RECORDING' }).catch(() => {});
                chrome.tabs.sendMessage(tab.id, { action: 'RESUME_CAMERA_RECORDING' }).catch(() => {});
              });
            });
          });
        }
      });
      break; // fire-and-forget

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
      break; // fire-and-forget, no sendResponse

    case 'OPEN_EDIT_PAGE_FOR_VIDEO':
      // offscreen.js saved blob to IndexedDB — just open edit.html with the id.
      // Call sendResponse immediately so offscreen's callback fires without lastError.
      sendResponse({ ok: true });
      chrome.storage.local.get(['activeHudTabId', 'activeOverlayTabId'], (res) => {
        if (res.activeHudTabId) {
          chrome.tabs.sendMessage(res.activeHudTabId, { action: 'HIDE_CONTROL_BAR' }).catch(() => {});
          chrome.storage.local.remove('activeHudTabId');
        }
        if (res.activeOverlayTabId) {
          chrome.tabs.sendMessage(res.activeOverlayTabId, { action: 'STOP_WEBCAM_BUBBLE' }).catch(() => {});
          chrome.storage.local.remove('activeOverlayTabId');
        }
      });
      chrome.storage.local.set({ isRecording: false });
      chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?id=${message.itemId}`) });
      // sendResponse already called above — don't return true (would re-open port)
      break;

    case 'DISCARD_TAB_CLOSED':
      // The user closed edit.html without saving. Clean up both IndexedDB record and OPFS file.
      if (message.id) {
        getMediaById(message.id)
          .then(item => {
            if (item && item.opfsFileName) deleteOPFSFile(item.opfsFileName).catch(() => {});
          })
          .catch(() => {})
          .finally(() => deleteLocalMedia(message.id).catch(() => {}));
      }
      break; // fire-and-forget

    case 'CAMERA_BLOB_READY':
      // Camera recording in content.js finished — blob arrives as a data URL
      handleVideoBlobReady(message, sendResponse);
      return true;

    case 'FORMAT_FALLBACK':
      // Offscreen couldn't use the requested format; persist for popup toast
      chrome.storage.local.set({
        formatFallback: { requested: message.requested, actual: message.actual, ts: Date.now() },
      });
      break; // fire-and-forget, no sendResponse

    case 'REVOKE_FALLBACK_BLOB':
      // Forward the blob URL revoke command to the offscreen document that created it
      // to free up memory (preventing OOM leaks on huge recordings).
      chrome.runtime.sendMessage({ target: 'offscreen', type: 'revoke-blob-url', url: message.url }).catch(() => {});
      break; // fire-and-forget, no sendResponse

    case 'SAVE_FALLBACK_BLOB':
      // Perform chrome.storage.local write on behalf of offscreen.js (which lacks permissions in Chrome)
      chrome.storage.local.set({ [message.id]: message.item }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'OPEN_EDIT_PAGE_OPFS':
      // IndexedDB save failed but OPFS file is intact. Open edit.html with OPFS params directly.
      sendResponse({ ok: true });
      chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?${message.queryString}`) });
      break;

    case 'OPEN_EDIT_PAGE':
      chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html${message.error ? '?error=' + message.error : ''}`) });
      break; // fire-and-forget, no sendResponse

    // ── Screenshots ──────────────────────────────────────────────────────────
    case 'TAKE_SCREENSHOT':
      handleTakeScreenshot(message, sendResponse);
      return true;

    case 'OFFSCREEN_RECORDING_STARTED':
    case 'CAMERA_RECORDING_STARTED':
      // Don't overwrite recordingStartTime — handleStartRecording already set it
      // before the screen picker even appeared. Overwriting here would make the
      // badge timer start late (after the picker delay).
      chrome.storage.local.set({
        isRecordingPaused: false,
        pausedOffset: 0,
        pausedAt: null
      }, () => {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        chrome.action.setBadgeText({ text: '0:00' });
        
        chrome.alarms.clear(BADGE_ALARM, () => {
          chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 1/60 });
        });

        // Use the tab ID pinned at START_RECORDING time (or overridden by overlay mode).
        // This is more reliable than querying the active tab now — the picker dialog
        // may have stolen focus in between.
        chrome.storage.local.get(['pendingHudTabId'], async (res) => {
          const tabId = res.pendingHudTabId;
          chrome.storage.local.remove('pendingHudTabId');
          if (!tabId) return;

          // content.js may already be injected (especially for overlay mode).
          // executeScript is safe to call again — it's a no-op if already present.
          try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
          } catch (_) { /* Already injected or restricted page — fine */ }

          // 600ms: clears residual focus-change from the screen-share picker and
          // gives content.js modules time to fully boot on slow machines / Brave.
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'SHOW_CONTROL_BAR' }).catch(() => {});
            chrome.storage.local.set({ activeHudTabId: tabId });
          }, 600);
        });
      });
      break; // fire-and-forget, no sendResponse

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
      break; // fire-and-forget, no sendResponse

    // ── HUD mic/cam toggles (from the in-page HUD buttons) ────────────────────
    case 'HUD_TOGGLE_MIC':
      chrome.storage.local.set({ recMic: message.on === true }, () => {
        chrome.storage.local.get(['isRecording'], (res) => {
          if (res.isRecording) {
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'toggle-mic-live', on: message.on === true }).catch(() => {});
          }
        });
      });
      break; // fire-and-forget, no sendResponse

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
      break; // fire-and-forget, no sendResponse

    // ── Camera-only: inject content.js into the active foreground tab ─────────
    case 'START_CAMERA_IN_TAB':
      // Use currentWindow (not lastFocusedWindow) — the camera is always injected
      // into the tab the user was on, not any abstract "last focused" context.
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://')) {
          // Save the tab title now in case START_RECORDING path didn't store it yet
          if (tab.title) {
            chrome.storage.local.get(['recordingTabTitle'], (r) => {
              if (!r.recordingTabTitle) {
                chrome.storage.local.set({ recordingTabTitle: tab.title, recordingTabUrl: tab.url || '' });
              }
            });
          }
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
          chrome.tabs.sendMessage(tab.id, { action: 'START_CAMERA_RECORDING', options: message.options });
        } else {
          chrome.storage.local.set({ isRecording: false });
          notify('cam-error', 'AntCapture Error', 'Cannot record camera on this type of page (Chrome settings/new tab). Please open a normal website first.');
        }
      });
      break; // fire-and-forget, no sendResponse


    // ── Auth ──────────────────────────────────────────────────────────────────
    case 'GET_USER': {
      const isLocal = message.origin && (message.origin.includes('localhost') || message.origin.includes('127.0.0.1'));
      const userKey = isLocal ? 'user_local' : 'user_cloud';
      chrome.storage.local.get([userKey], (result) => sendResponse({ user: result[userKey] || null }));
      return true;
    }

    case 'LOGOUT': {
      // If we logout globally, just clear both. Or if we pass origin, clear specific one.
      const isLocal = message.origin && (message.origin.includes('localhost') || message.origin.includes('127.0.0.1'));
      const userKey = isLocal ? 'user_local' : 'user_cloud';
      chrome.storage.local.remove([userKey], () => {
        const broadcast = (pattern) => {
          chrome.tabs.query({ url: pattern }, (tabs) =>
            tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: 'LOGOUT_WEB_UI' }).catch(() => {}))
          );
        };
        broadcast(isLocal ? '*://localhost:5173/*' : '*://antcapture.anttake.com/*');
        sendResponse({ success: true });
      });
      return true;
    }

    case 'SYNC_USER': {
      const isLocal = message.origin && (message.origin.includes('localhost') || message.origin.includes('127.0.0.1'));
      const userKey = isLocal ? 'user_local' : 'user_cloud';
      if (message.user) {
        chrome.storage.local.set({ [userKey]: message.user }, () => {
          log.info(`User synced from Web UI (${userKey})`, message.user.email);
          syncPendingUploads();
        });
      } else {
        chrome.storage.local.remove([userKey], () => log.info(`User signed out from Web UI (${userKey}).`));
      }
      break; // fire-and-forget, no sendResponse
    }

    case 'REGISTER_WEB_UI':
      if (message.url) {
        chrome.storage.local.set({ dynamicWebUiUrl: message.url }, () =>
          log.info('Extension learned dynamic Web UI URL', message.url)
        );
      }
      break; // fire-and-forget, no sendResponse

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

    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const userKey = isLocal ? 'user_local' : 'user_cloud';

    chrome.storage.local.set({ [userKey]: userData }, () => {
      log.info(`User authenticated in extension (${userKey})`, userData.email);
      setTimeout(() => chrome.tabs.remove(tabId), 1500);
      syncPendingUploads();
    });
  } catch (e) {
    log.error('Failed to parse extension auth data', e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Offline Sync — retry queued uploads whenever the worker starts or goes online
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onStartup.addListener(() => {
  log.info('Service Worker Started');
  cleanTemporaryMedia();
  cleanOPFSOrphans(); // remove orphaned recording files from disk
  syncPendingUploads();
});
chrome.runtime.onInstalled.addListener(() => {
  log.info('Extension Installed/Updated');
  cleanTemporaryMedia();
  cleanOPFSOrphans(); // remove orphaned recording files from disk
  syncPendingUploads();
});
self.addEventListener('online', () => {
  log.info('Browser came online, triggering sync');
  syncPendingUploads();
});

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

