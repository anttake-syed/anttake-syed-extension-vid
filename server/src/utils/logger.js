/**
 * utils/logger.js — Central Structured Logger
 *
 * Architecture:
 *   React → API → Logger → Cloud logs (stdout/Vercel logs)
 *
 * Each log entry:
 *   { timestamp, level, feature, operation, requestId, userId?, durationMs?, error?, meta? }
 *
 * Levels: debug | info | warn | error
 *
 * Security rules baked in:
 *   - Never logs: passwords, tokens, cookies, secret keys, raw JWTs, private file paths
 *   - Scrubs sensitive fields from any object before logging
 *
 * In cloud mode (SERVER_MODE=cloud): emits clean JSON to stdout → picked up by
 *   Vercel/Cloudflare logging pipelines.
 * In local mode: also pretty-prints to console for developer readability.
 *
 * Error-level entries are also pushed to the in-memory errorRingBuffer so the
 * /admin/diagnostics page can show "Recent Errors" without a DB table.
 */

'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
const IS_CLOUD  = process.env.SERVER_MODE === 'cloud';
const IS_DEV    = process.env.NODE_ENV === 'development';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const LEVEL_RANK = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_RANK   = LEVEL_RANK[LOG_LEVEL] ?? 1;

// Lazy-load to avoid circular dependency during module init
let _buffers = null;
function getBuffers() {
  if (!_buffers) {
    try { _buffers = require('./errorBuffer'); } catch { /* ignore */ }
  }
  return _buffers;
}

// ── Sensitive key scrubber ────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'secret', 'token', 'jwt', 'authorization',
  'access_token', 'refresh_token', 'apikey', 'api_key', 'auth_data',
  'cookie', 'session', 'private', 'credential', 'cf_api_token',
  'ls_api_key', 'ls_webhook_secret', 'google_client_secret',
]);

function scrub(obj, depth = 0) {
  if (depth > 4 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => scrub(v, depth + 1));

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    const isSensitive = [...SENSITIVE_KEYS].some(s => lower.includes(s));
    out[k] = isSensitive ? '[REDACTED]' : scrub(v, depth + 1);
  }
  return out;
}

// ── Core emit ─────────────────────────────────────────────────────────────────
function emit(level, feature, operation, data = {}) {
  if ((LEVEL_RANK[level] ?? 1) < MIN_RANK) return;

  const { requestId, userId, durationMs, error, ...rest } = data;

  // Build the canonical log entry
  const entry = {
    timestamp:   new Date().toISOString(),
    level:       level.toUpperCase(),
    feature,
    operation,
    ...(requestId  && { requestId }),
    ...(userId     && { userId }),
    ...(durationMs != null && { durationMs }),
    ...(error && {
      error: {
        message: error.message || String(error),
        code:    error.code    || undefined,
        // Include stack in local dev, omit in cloud to avoid log bloat
        stack:   (level === 'error' && !IS_CLOUD) ? error.stack : undefined,
      }
    }),
    ...(Object.keys(rest).length > 0 && { meta: scrub(rest) }),
  };

  // Push all entries into the in-memory activity ring buffer
  getBuffers()?.activityRingBuffer?.push(entry);

  // Push ERROR entries into the in-memory error ring buffer (for diagnostics page)
  if (level === 'error') {
    getBuffers()?.errorRingBuffer?.push(entry);
  }

  // Cloud: JSON to stdout (Vercel/CF picks it up natively)
  if (IS_CLOUD) {
    process.stdout.write(JSON.stringify(entry) + '\n');
    return;
  }

  // Local/dev: coloured pretty-print for developer UX
  const COLORS = {
    DEBUG: '\x1b[90m',  // grey
    INFO:  '\x1b[36m',  // cyan
    WARN:  '\x1b[33m',  // yellow
    ERROR: '\x1b[31m',  // red
    RESET: '\x1b[0m',
  };
  const col   = COLORS[entry.level] || COLORS.RESET;
  const reset = COLORS.RESET;
  const rid   = requestId ? ` [${requestId.slice(0, 8)}]` : '';
  const uid   = userId    ? ` user:${userId.slice(0, 8)}` : '';
  const dur   = durationMs != null ? ` ${durationMs}ms` : '';
  const err   = error ? `\n  ${col}⚠ ${entry.error.message}${reset}` : '';
  const meta  = Object.keys(rest).length
    ? '\n  ' + JSON.stringify(scrub(rest), null, 2).replace(/\n/g, '\n  ')
    : '';

  const line = `${col}[${entry.level}]${reset} ${entry.timestamp.slice(11, 23)} ${col}${feature}::${operation}${reset}${rid}${uid}${dur}${err}${meta}`;

  if (level === 'error') {
    console.error(line);
    if (error?.stack && IS_DEV) console.error(error.stack);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
const logger = {
  debug: (feature, operation, data) => emit('debug', feature, operation, data),
  info:  (feature, operation, data) => emit('info',  feature, operation, data),
  warn:  (feature, operation, data) => emit('warn',  feature, operation, data),
  error: (feature, operation, data) => emit('error', feature, operation, data),

  /**
   * Convenience: log an HTTP request completion.
   * Called by the httpLogger middleware automatically.
   */
  request: (req, res, durationMs) => {
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';
    emit(level, 'http', `${req.method} ${req.route?.path || req.path}`, {
      requestId:  req.requestId,
      userId:     req.user?.id,
      durationMs,
      statusCode: res.statusCode,
      method:     req.method,
      path:       req.path,
      ip:         req.ip,
    });
  },
};

module.exports = logger;
