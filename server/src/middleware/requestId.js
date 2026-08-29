/**
 * middleware/requestId.js
 *
 * Attaches a unique requestId to every incoming HTTP request.
 * The ID flows through:
 *   - req.requestId (accessible to all middleware & controllers)
 *   - X-Request-Id response header (useful for correlating client errors)
 *
 * Format: req-<timestamp-base36>-<random-6chars>
 * Example: req-lzfg8k-a3b9c1
 *
 * MUST be the very first middleware registered (before logger, auth, etc.)
 */

'use strict';

function newRequestId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = function requestId(req, _res, next) {
  // Honour a forwarded ID from an upstream proxy (e.g. Vercel edge) if present
  req.requestId = req.headers['x-request-id'] || newRequestId();
  // Echo it back in the response so clients/Postman can correlate logs
  _res.setHeader('X-Request-Id', req.requestId);
  next();
};
