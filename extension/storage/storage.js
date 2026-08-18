const DB_NAME = 'AntCaptureDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

export async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}


// Purge stale preview/transfer blobs that were never cleaned up.
// This is the main guard against the "save_failed" error:
// preview blobs accumulate when the user closes the edit tab
// without saving (crash, killed browser, etc.) and eventually
// fill Chrome's per-origin IndexedDB quota, causing new saves to fail.
async function purgeStaleTemporaryBlobs(store) {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const cutoff = Date.now() - TWO_HOURS;
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const stale = req.result.filter(
        item =>
          (item.mode === 'preview' || item.mode === 'transfer') &&
          item.timestamp < cutoff
      );
      let remaining = stale.length;
      if (remaining === 0) { resolve(); return; }
      stale.forEach(item => {
        const del = store.delete(item.id);
        del.onsuccess = del.onerror = () => { if (--remaining === 0) resolve(); };
      });
    };
    req.onerror = () => resolve(); // non-fatal
  });
}

export async function saveMediaLocally(blob, type, mode = 'cloud', resolution = null, format = null, hasAudio = true, tabTitle = '', opfsFileName = null, mimeType = null) {
  // Step 1: purge stale preview/transfer blobs BEFORE opening a new transaction.
  // This frees space so the incoming save does not hit Chrome's storage quota.
  try {
    const cleanDb = await openDB();
    const cleanTx = cleanDb.transaction(STORE_NAME, 'readwrite');
    await purgeStaleTemporaryBlobs(cleanTx.objectStore(STORE_NAME));
    await new Promise((res, rej) => {
      cleanTx.oncomplete = res;
      cleanTx.onerror = () => rej(cleanTx.error);
      cleanTx.onabort = () => rej(cleanTx.error);
    });
  } catch (e) {
    // Non-fatal: log and continue; the save attempt below is what matters
    console.warn('AntCapture: pre-save stale blob purge failed (non-fatal)', e);
  }

  // Step 2: open a fresh transaction and save the new item
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // Hard limits only apply to persistent sync modes (cloud/localhost).
  // 'preview' recordings never store large blobs here anymore — video data
  // goes to OPFS. The blob field is null for OPFS recordings.
  const MAX_ITEMS = 50;
  const MAX_BYTES = 200 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const existing   = allRequest.result;
      const totalBytes = existing.reduce((acc, item) => acc + (item.blob?.size || 0), 0);

      if (mode !== 'transfer' && mode !== 'preview') {
        if (existing.length >= MAX_ITEMS) {
          reject(new Error(`Queue full: max ${MAX_ITEMS} items. Sync to dashboard or clear the queue.`));
          return;
        }
        if (totalBytes + (blob?.size || 0) > MAX_BYTES) {
          reject(new Error(`Queue full: 200 MB storage limit reached. Sync or clear the queue to continue.`));
          return;
        }
      }

      const item = {
        // For OPFS recordings: blob is null — the actual video is on disk.
        // For legacy/fallback recordings: blob contains the video data.
        blob:         opfsFileName ? null : (blob || null),
        opfsFileName: opfsFileName || null,  // disk path — present for all new recordings
        // Full codec MIME type (e.g. 'video/webm;codecs=vp8,opus'). Stored so that
        // edit.js can re-wrap the OPFS File with the correct type on playback.
        mimeType:     mimeType || (blob ? blob.type : null) || null,
        type,
        mode,
        resolution,
        format,
        hasAudio,
        tabTitle,
        timestamp:    Date.now(),
        status:       'pending'
      };

      const request = store.add(item);
      request.onsuccess = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ lastQueueUpdate: Date.now() });
        }
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    };
    allRequest.onerror = () => reject(allRequest.error);
  });
}

export async function cleanTemporaryMedia() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result;
        const deletePromises = items
          .filter(item => item.mode === 'transfer' || item.mode === 'preview')
          .map(item => {
            return new Promise((res) => {
              const req = store.delete(item.id);
              req.onsuccess = () => res();
              req.onerror = () => res();
            });
          });
        Promise.all(deletePromises).then(() => resolve());
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Failed to clean temp media:', e);
  }
}

export async function getPendingUploads(mode = null) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      let items = request.result;
      // Filter by mode if requested; treat legacy items lacking a mode as 'cloud'
      if (mode) {
        items = items.filter(item => (item.mode || 'cloud') === mode);
      }
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalMedia(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ lastQueueUpdate: Date.now() });
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getMediaById(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

