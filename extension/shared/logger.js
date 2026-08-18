// shared/logger.js — AntCapture
// Professional, non-blocking logging system for Chrome Extensions.
// Saves logs to IndexedDB (AntCaptureLogsDB) to survive Service Worker restarts.
// Batches writes to prevent performance drops during video recording.

const LOG_DB_NAME = 'AntCaptureLogsDB';
const LOG_DB_VERSION = 1;
const LOG_STORE_NAME = 'logs';
const MAX_LOGS = 2000; // Keep the last 2000 logs

class Logger {
  constructor(context = 'Global') {
    this.context = context;
    this.dbPromise = null;
    this.writeQueue = [];
    this.isFlushing = false;
  }

  // ── Database Initialization ──
  async getDB() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(LOG_DB_NAME, LOG_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
          const store = db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
        }
      };
    });
    return this.dbPromise;
  }

  // ── Contextual Instances ──
  // Creates a new logger scoped to a specific file or component
  static getLogger(context) {
    return new Logger(context);
  }

  // ── Core Logging Methods ──
  debug(message, ...data) { this._log('DEBUG', message, data); }
  info(message, ...data)  { this._log('INFO', message, data); }
  warn(message, ...data)  { this._log('WARN', message, data); }
  error(message, ...data) { this._log('ERROR', message, data); }

  _log(level, message, dataArgs) {
    const timestamp = Date.now();
    const isoTime = new Date(timestamp).toISOString();
    
    // Parse complex objects into safe strings to prevent cloning errors in IndexedDB
    const safeData = dataArgs.map(arg => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
      if (arg instanceof Blob || arg instanceof ArrayBuffer || (typeof MediaStream !== 'undefined' && arg instanceof MediaStream)) {
        return `[${arg.constructor.name} size=${arg.size || arg.byteLength || 0}]`;
      }
      if (arg && typeof arg === 'object' && arg.code && arg.message !== undefined && arg.constructor.name === 'MediaError') {
        return `[MediaError code=${arg.code} message=${arg.message || 'unknown'}]`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, (key, value) => {
            if (value instanceof Blob || value instanceof ArrayBuffer) return '[Binary Data]';
            if ((typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) || (typeof Window !== 'undefined' && value instanceof Window)) return '[DOM Node]';
            return value;
          });
        } catch (e) { return '[Unserializable Object]'; }
      }
      return String(arg);
    });

    const logEntry = {
      timestamp,
      isoTime,
      level,
      context: this.context,
      message,
      data: safeData.length > 0 ? safeData : null
    };

    // 1. Print to console for immediate developer feedback
    const consolePrefix = `[${isoTime}] [${level}] [${this.context}]`;
    if (level === 'ERROR') console.error(consolePrefix, message, ...dataArgs);
    else if (level === 'WARN') console.warn(consolePrefix, message, ...dataArgs);
    else if (level === 'INFO') console.info(consolePrefix, message, ...dataArgs);
    else console.debug(consolePrefix, message, ...dataArgs);

    // 2. Queue for database storage
    this.writeQueue.push(logEntry);
    this._scheduleFlush();
  }

  // ── Non-Blocking Write Batching ──
  _scheduleFlush() {
    if (this.isFlushing) return;
    this.isFlushing = true;
    
    // Use requestIdleCallback if available (content scripts/offscreen), fallback to setTimeout (service worker)
    const scheduler = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : (cb) => setTimeout(cb, 100);
    scheduler(() => this._flushQueue());
  }

  async _flushQueue() {
    if (this.writeQueue.length === 0) {
      this.isFlushing = false;
      return;
    }

    const batch = this.writeQueue.splice(0, 50); // Write up to 50 logs at a time
    try {
      const db = await this.getDB();
      const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
      const store = tx.objectStore(LOG_STORE_NAME);
      
      batch.forEach(log => store.add(log));
      
      tx.oncomplete = () => {
        this.isFlushing = false;
        this.clearOldLogs(); // automatically enforce bounded retention
        if (this.writeQueue.length > 0) this._scheduleFlush();
      };
      tx.onerror = () => {
        console.error('Logger: Failed to write batch to IndexedDB', tx.error);
        // Put the batch back at the front of the queue to retry later
        this.writeQueue.unshift(...batch);
        // Ensure we don't grow infinitely if DB is permanently broken
        if (this.writeQueue.length > MAX_LOGS) this.writeQueue.length = MAX_LOGS;
        this.isFlushing = false;
      };
    } catch (err) {
      console.error('Logger: Database connection failed', err);
      this.writeQueue.unshift(...batch);
      if (this.writeQueue.length > MAX_LOGS) this.writeQueue.length = MAX_LOGS;
      this.isFlushing = false;
    }
  }

  // ── Log Management ──
  async exportLogs() {
    try {
      const db = await this.getDB();
      const tx = db.transaction(LOG_STORE_NAME, 'readonly');
      const store = tx.objectStore(LOG_STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const logs = request.result;
          let textOutput = `--- AntCapture Diagnostics Log ---\nGenerated: ${new Date().toISOString()}\nTotal Logs: ${logs.length}\n\n`;
          
          logs.forEach(l => {
            textOutput += `[${l.isoTime}] [${l.level}] [${l.context}] ${l.message}`;
            if (l.data) textOutput += `\n    Data: ${l.data.join(', ')}`;
            textOutput += '\n';
          });

          const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
          resolve(blob);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Logger: Export failed', err);
      return null;
    }
  }

  async clearOldLogs() {
    try {
      const db = await this.getDB();
      const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
      const store = tx.objectStore(LOG_STORE_NAME);
      
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result > MAX_LOGS) {
          const overage = countReq.result - MAX_LOGS;
          // Open a cursor and delete the oldest 'overage' number of logs
          let deleted = 0;
          store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor && deleted < overage) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
        }
      };
    } catch (err) {
      console.error('Logger: Cleanup failed', err);
    }
  }
}

// Export a default global logger, plus the class if custom contexts are needed
export const log = new Logger('Global');
export { Logger };
