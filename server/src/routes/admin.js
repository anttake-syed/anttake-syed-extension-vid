/**
 * routes/admin.js — Protected Admin Routes
 *
 * SECURITY MODEL:
 *   Every route in this file requires BOTH:
 *     1. requireAuth    — valid JWT, user exists in DB
 *     2. requireAdmin   — user.role === 'admin' (read from DB server-side)
 *
 *   The frontend page /admin/diagnostics also enforces this, but that is
 *   only defence-in-depth. The APIs here are independently locked down.
 *
 * Routes:
 *   GET /api/admin/diagnostics/health   — live system health checks
 *   GET /api/admin/diagnostics/errors   — recent error ring buffer
 *   GET /api/admin/diagnostics/info     — server / runtime info
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const requireAuth  = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const diag         = require('../controllers/diagnosticsController');

// Both middlewares applied to every route in this file
router.use(requireAuth, requireAdmin);

router.get('/diagnostics/health', diag.getSystemHealth);
router.get('/diagnostics/errors', diag.getRecentErrors);
router.get('/diagnostics/activity', diag.getRecentActivity);
router.get('/diagnostics/info',   diag.getSystemInfo);

module.exports = router;
