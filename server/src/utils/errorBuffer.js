/**
 * utils/errorBuffer.js — In-Memory Error Ring Buffer
 *
 * Stores the last N server errors in memory so the diagnostics page
 * can display "Recent Errors" without needing a separate DB table or
 * cloud logging subscription.
 *
 * This is intentionally simple:
 *   - Survives for the lifetime of the Node.js process
 *   - Resets on server restart (fine — use cloud logs for persistence)
 *   - Max 100 entries (ring buffer: oldest discarded first)
 *
 * The logger automatically pushes ERROR-level entries here.
 * The diagnostics controller reads from here via errorRingBuffer.get().
 *
 * SECURITY:
 *   Entries are already scrubbed by the logger before being pushed here.
 *   Only the diagnostics endpoint (requireAuth + requireAdmin) serves them.
 */

'use strict';

const MAX_ENTRIES = 100;

class RingBuffer {
  constructor(max) {
    this._max     = max;
    this._entries = [];
  }

  push(entry) {
    this._entries.push(entry);
    if (this._entries.length > this._max) {
      this._entries.shift(); // remove oldest
    }
  }

  get() {
    // Return newest first
    return [...this._entries].reverse();
  }

  clear() {
    this._entries = [];
  }

  get size() {
    return this._entries.length;
  }
}

const errorRingBuffer = new RingBuffer(MAX_ENTRIES);
const activityRingBuffer = new RingBuffer(300); // 300 entries for activity stream

module.exports = { errorRingBuffer, activityRingBuffer };
