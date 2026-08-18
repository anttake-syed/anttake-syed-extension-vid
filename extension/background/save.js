// background/save.js — AntCapture
// Unified capture save helper.
// All screenshot + video recording paths funnel through saveCapture().
// It reads storageMode and routes to: 'computer' | 'localhost' | 'cloud'.

import { getPendingUploads, deleteLocalMedia, saveMediaLocally } from '../storage/storage.js';
import { notify } from './notify.js';
import { uploadToServer } from './upload.js';
import { Logger } from '../shared/logger.js';

const log = Logger.getLogger('Background: Save/Sync');


// ─────────────────────────────────────────────────────────────────────────────
// saveCapture — single routing point for ALL captured media
// ─────────────────────────────────────────────────────────────────────────────
export async function saveCapture(blob, type = 'image', resolution = null, format = null, hasAudio = true, tabTitle = '') {
  const label = type === 'image' ? 'Screenshot' : 'Recording';

  // Store tabTitle WITH the blob in IndexedDB — this is the only reliable path.
  // Using a chrome.storage.local key (recordingTabTitle) is race-prone: if the
  // service worker restarts or the edit page loads before the key is set, naming breaks.
  let itemId;
  try {
    itemId = await saveMediaLocally(blob, type, 'preview', resolution, format, hasAudio, tabTitle);
  } catch (err) {
    chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?error=storage_full`) });
    throw err;
  }
  
  // Simple edit URL — no need for URL params to carry the title anymore; it's in IndexedDB
  const editUrl = chrome.runtime.getURL(`edit/edit.html?id=${itemId}`);
  
  // Open the local edit/preview page automatically so the user can choose how to save it
  chrome.tabs.create({ url: editUrl });
  
  return { success: true, previewId: itemId };
}

// ─────────────────────────────────────────────────────────────────────────────
// syncPendingUploads — called on startup / coming back online
// Retries cloud uploads that were queued while offline / not logged in.
// ─────────────────────────────────────────────────────────────────────────────
export async function syncPendingUploads() {
  if (!navigator.onLine) return { synced: 0, failed: 0, total: 0, offline: true, errors: [] };

  const { user_cloud, storageMode } = await chrome.storage.local.get(['user_cloud', 'storageMode']);

  // Local mode has no queue — uploads are direct-only, nothing to sync
  if (storageMode === 'localhost') return { synced: 0, failed: 0, total: 0, errors: [] };
  if (!user_cloud || !user_cloud.jwt) return { synced: 0, failed: 0, total: 0, noUser: true, errors: [] };

  const pending = await getPendingUploads('cloud');
  if (pending.length === 0)       return { synced: 0, failed: 0, total: 0, errors: [] };

  log.info(`Syncing ${pending.length} pending items...`);
  let synced = 0;
  const errors = [];

  for (const item of pending) {
    try {
      // Correct argument order: (blob, type, destination, jwt, resolution, format, customFilename, hasAudio)
      await uploadToServer(item.blob, item.type, 'cloud', user_cloud.jwt, item.resolution, item.format, null, item.hasAudio !== undefined ? item.hasAudio : true);
      log.info(`✅ Synced item ${item.id}`);
      await deleteLocalMedia(item.id);
      synced++;
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
    } catch (error) {
      log.error(`Sync failed for ${item.id}`, error.message);
      errors.push(error.message);
      break; // Stop retrying if the server is down
    }
  }

  return { synced, failed: errors.length, total: pending.length, errors };
}
