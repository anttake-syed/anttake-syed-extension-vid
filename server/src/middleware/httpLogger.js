/**
 * middleware/httpLogger.js
 *
 * Structured HTTP request/response logger.
 * Replaces the old 6-line logger.js middleware.
 *
 * Logs every request AFTER it completes (on 'finish') so we capture
 * the actual response status code and duration.
 *
 * Uses the central logger utility so output format is consistent across
 * all features (http, auth, capture, board, storage, etc.).
 *
 * Skipped for: /health (noisy heartbeat polling)
 */

'use strict';

const logger = require('../utils/logger');

// Routes we never want to log (health checks would spam the log)
const SKIP_PATHS = new Set(['/health']);

module.exports = function httpLogger(req, res, next) {
  if (SKIP_PATHS.has(req.path)) return next();

  const start = Date.now();

  res.on('finish', () => {
    logger.request(req, res, Date.now() - start);
  });

  next();
};
