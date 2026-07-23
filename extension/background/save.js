// background/save.js — AntCapture
// Unified capture save helper.
// All screenshot + video recording paths funnel through saveCapture().
// It reads storageMode and routes to: 'computer' | 'localhost' | 'cloud'.

import { saveMediaLocally, getPendingUploads, deleteLocalMedia } from '../storage.js';
import { notify } from './notify.js';
import { uploadToBackend } from './upload.js';

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
  const { storageMode } = await chrome.storage.local.get(['storageMode']);
  const label = type === 'image' ? 'Screenshot' : 'Recording';

  // ── MODE 1: Save to Computer ────────────────────────────────────────────
  if (storageMode === 'computer' || !storageMode) {
    const itemId = await saveMediaLocally(blob, type, 'computer', resolution, format);
    // Open download.html which triggers chrome.downloads.download() with saveAs dialog
    chrome.tabs.create({ url: chrome.runtime.getURL(`download.html?id=${itemId}&autoDelete=true`) });
    notify('capture-computer', `${label} ready`, 'Choose a save location in the download dialog.');
    return { success: true, computer: true };
  }

  // ── MODE 2: Self-Hosted (localhost) ───────────────────────────────────────
  if (storageMode === 'localhost') {
    try {
      await uploadToBackend(blob, type, 'local-mode', resolution, format);
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
      notify('capture-local', `${label} saved`, 'Stored in your self-hosted library.');
      return { success: true };
    } catch {
      notify('capture-local-fail', 'Local Backend Offline', 'Run: node server.js  to start your local backend.');
      return { success: false, backend_offline: true };
    }
  }

  // ── MODE 3: Cloud (Web UI + Google Drive) ─────────────────────────────────
  const { user } = await chrome.storage.local.get(['user']);
  if (user && user.jwt && navigator.onLine) {
    try {
      await uploadToBackend(blob, type, user.jwt, resolution, format);
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
      notify('capture-cloud', `${label} uploaded`, 'Saved to your AntCapture cloud library.');
      return { success: true };
    } catch {
      await saveMediaLocally(blob, type, 'cloud', resolution, format);
      notify('capture-queued', 'Added to Cloud Queue', 'Upload failed — will retry when back online.');
      return { success: true, queued: true };
    }
  } else {
    await saveMediaLocally(blob, type, 'cloud', resolution, format);
    const reason = !navigator.onLine ? 'No internet connection.' : 'Sign in to upload this item.';
    notify('capture-queued', 'Added to Cloud Queue', reason);
    return { success: true, queued: true };
  }
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
      await uploadToBackend(item.blob, item.type, user.jwt, item.resolution, item.format);
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
