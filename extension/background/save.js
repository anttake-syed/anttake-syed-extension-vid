// background/save.js — AntCapture
// Unified capture save helper.
// All screenshot + video recording paths funnel through saveCapture().
// It reads storageMode and routes to: 'computer' | 'localhost' | 'cloud'.

import { saveMediaLocally, getPendingUploads, deleteLocalMedia } from '../storage/storage.js';
import { notify } from './notify.js';
import { uploadToServer } from './upload.js';

// ─────────────────────────────────────────────────────────────────────────────
// dataURItoBlob — convert a base64 data URL into a Blob
// ─────────────────────────────────────────────────────────────────────────────
export function dataURItoBlob(dataURI) {
  const base64Idx = dataURI.indexOf('base64,');
  if (base64Idx === -1) throw new Error('Invalid data URI');
  const byteString = atob(dataURI.slice(base64Idx + 7));
  const mimeString = dataURI.slice(5, base64Idx - 1);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mimeString });
}

// ─────────────────────────────────────────────────────────────────────────────
// saveCapture — single routing point for ALL captured media
// ─────────────────────────────────────────────────────────────────────────────
export async function saveCapture(blob, type = 'image', resolution = null, format = null) {
  const label = type === 'image' ? 'Screenshot' : 'Recording';

  // Always save the raw blob to IndexedDB as a 'preview' item
  let itemId;
  try {
    itemId = await saveMediaLocally(blob, type, 'preview', resolution, format);
  } catch (err) {
    chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?error=storage_full`) });
    throw err;
  }
  
  // Open the local edit/preview page automatically so the user can choose how to save it
  chrome.tabs.create({ url: chrome.runtime.getURL(`edit/edit.html?id=${itemId}`) });
  
  return { success: true, previewId: itemId };
}

// ─────────────────────────────────────────────────────────────────────────────
// syncPendingUploads — called on startup / coming back online
// Retries cloud uploads that were queued while offline / not logged in.
// ─────────────────────────────────────────────────────────────────────────────
export async function syncPendingUploads() {
  if (!navigator.onLine) return { synced: 0, failed: 0, total: 0, offline: true, errors: [] };

  const { user, storageMode } = await chrome.storage.local.get(['user', 'storageMode']);

  // Local mode has no queue — uploads are direct-only, nothing to sync
  if (storageMode === 'localhost') return { synced: 0, failed: 0, total: 0, errors: [] };
  if (!user || !user.jwt)         return { synced: 0, failed: 0, total: 0, noUser: true, errors: [] };

  const pending = await getPendingUploads('cloud');
  if (pending.length === 0)       return { synced: 0, failed: 0, total: 0, errors: [] };

  console.log(`Syncing ${pending.length} pending items...`);
  let synced = 0;
  const errors = [];

  for (const item of pending) {
    try {
      await uploadToServer(item.blob, item.type, user.jwt, item.resolution, item.format);
      console.log(`✅ Synced item ${item.id}`);
      await deleteLocalMedia(item.id);
      synced++;
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
    } catch (error) {
      console.error(`Sync failed for ${item.id}:`, error.message);
      errors.push(error.message);
      break; // Stop retrying if the server is down
    }
  }

  return { synced, failed: errors.length, total: pending.length, errors };
}
