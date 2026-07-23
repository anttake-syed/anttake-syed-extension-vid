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

export async function saveMediaLocally(blob, type, mode = 'cloud', resolution = null, format = null) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // Hard limits to protect browser storage for all user types
  const MAX_ITEMS = 50;          // Max 50 queued files
  const MAX_BYTES = 200 * 1024 * 1024; // Max 200 MB total

  return new Promise((resolve, reject) => {
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const existing = allRequest.result;
      const totalBytes = existing.reduce((acc, item) => acc + (item.blob?.size || 0), 0);

      if (existing.length >= MAX_ITEMS) {
        reject(new Error(`Queue full: max ${MAX_ITEMS} items. Sync to dashboard or clear the queue.`));
        return;
      }
      if (totalBytes + (blob?.size || 0) > MAX_BYTES) {
        reject(new Error(`Queue full: 200 MB storage limit reached. Sync or clear the queue to continue.`));
        return;
      }

      const item = {
        blob,
        type,   // 'video' or 'image'
        mode,   // 'cloud' or 'localhost'
        resolution,
        format,
        timestamp: Date.now(),
        status: 'pending'
      };

      const request = store.add(item);
      request.onsuccess = () => {
        chrome.storage.local.set({ lastQueueUpdate: Date.now() });
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    };
    allRequest.onerror = () => reject(allRequest.error);
  });
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
      chrome.storage.local.set({ lastQueueUpdate: Date.now() });
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

