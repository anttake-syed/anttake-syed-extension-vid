// storage/opfsStorage.js — AntCapture
// Origin Private File System (OPFS) storage for video recordings.
//
// WHY OPFS INSTEAD OF INDEXEDDB OR MEMORY:
//   IndexedDB has per-origin quotas (typically 60-80% of free disk, but Chrome
//   can and does refuse large blobs). The real problem is that the OLD architecture
//   collected ALL 250ms MediaRecorder chunks in a JavaScript array (in RAM) and
//   concatenated them into one giant Blob AFTER recording stopped. A 30-minute
//   1080p recording can be 2-4 GB — sitting entirely in browser memory.
//
//   OPFS is Chrome's native, quota-free, disk-backed filesystem. It is the
//   correct API for exactly this use case. Writes go straight to disk as each
//   chunk arrives. No RAM accumulation. No quota errors. No data loss.
//
// AVAILABILITY:
//   - window contexts (extension pages, offscreen docs): full read/write ✓
//   - service workers: read-only (cannot use createWritable) ✓
//   - content scripts: NOT available — don't use from there ✗

const RECORDING_PREFIX = 'antcapture_rec_';

// ─────────────────────────────────────────────────────────────────────────────
// OPFSWriter — streams MediaRecorder chunks to disk as they arrive
// ─────────────────────────────────────────────────────────────────────────────
export class OPFSWriter {
  constructor() {
    this.fileName   = null;
    this.fileHandle = null;
    this.writable   = null;
    this.totalBytes = 0;
    // Serialise async writes — prevents write ordering issues on rapid chunks
    this._writeQueue = Promise.resolve();
    this._initError  = null;
  }

  /**
   * Open an OPFS file and prepare the writable stream.
   * Must be awaited before the first writeChunk() call.
   */
  async init() {
    try {
      const root = await navigator.storage.getDirectory();
      this.fileName   = `${RECORDING_PREFIX}${Date.now()}.webm`;
      this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
      this.writable   = await this.fileHandle.createWritable();
    } catch (err) {
      this._initError = err;
      console.error('OPFSWriter: init failed', err);
      throw err;
    }
  }

  /**
   * Append a MediaRecorder chunk to the file.
   * Synchronous from the caller's perspective — async work is queued internally.
   */
  writeChunk(chunk) {
    if (!chunk || chunk.size === 0 || !this.writable) return;
    this._writeQueue = this._writeQueue.then(async () => {
      try {
        await this.writable.write(chunk);
        this.totalBytes += chunk.size;
      } catch (err) {
        console.error('OPFSWriter: chunk write failed', err);
      }
    });
  }

  /**
   * Wait for all pending writes and close the stream.
   * Returns { fileName, totalBytes } on success, or throws on failure.
   */
  async finalize() {
    await this._writeQueue; // wait for all queued chunks to flush
    if (!this.writable) throw new Error('OPFSWriter: not initialized or already finalized');
    await this.writable.close();
    this.writable = null;
    return { fileName: this.fileName, totalBytes: this.totalBytes };
  }

  /**
   * Abort the write and delete the file — used when discarding a recording.
   */
  async discard() {
    if (this.writable) {
      try { await this.writable.abort(); } catch (_) {}
      this.writable = null;
    }
    if (this.fileName) {
      await deleteOPFSFile(this.fileName);
      this.fileName = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a recording from OPFS as a File object (Blob sub-class).
 * Returns null if the file doesn't exist.
 * Compatible with:  URL.createObjectURL(), fetch(), uploadToServer(), etc.
 */
export async function readOPFSFile(fileName) {
  if (!fileName) return null;
  try {
    const root       = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch (err) {
    console.warn('OPFSStorage: readOPFSFile failed for', fileName, err);
    return null;
  }
}

/**
 * Delete a recording file from OPFS. Non-fatal if file is already gone.
 */
export async function deleteOPFSFile(fileName) {
  if (!fileName) return;
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(fileName);
  } catch (_) {
    // File is already gone — that's fine
  }
}

/**
 * Check if the OPFS API is available in the current context.
 * Older browser builds may not support createWritable() in extension contexts.
 */
export function isOPFSSupported() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function' &&
    typeof FileSystemFileHandle !== 'undefined'
  );
}

/**
 * Delete all orphaned OPFS recording files older than 24 hours.
 * Call on extension startup / install to prevent disk accumulation.
 */
export async function cleanOPFSOrphans() {
  try {
    const root   = await navigator.storage.getDirectory();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for await (const [name, handle] of root.entries()) {
      if (!name.startsWith(RECORDING_PREFIX)) continue;
      try {
        const file = await handle.getFile();
        if (file.lastModified < cutoff) {
          await root.removeEntry(name);
          console.info('OPFSStorage: deleted orphan', name);
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('OPFSStorage: orphan cleanup failed', err);
  }
}
