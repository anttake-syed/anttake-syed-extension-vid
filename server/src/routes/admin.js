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
router.get('/diagnostics/capture/:id', diag.getCaptureDiagnostics);

// ── One-shot recovery: activate captures stuck in 'processing' ─────────────────
// Use this to fix orphaned captures where UploadThing received the file but the
// webhook failed to update the DB. Queries UploadThing for all files, then
// cross-references with processing captures to activate matched ones.
router.post('/recover-processing', async (req, res) => {
  const prisma = require('../db/index');
  const logger = require('../utils/logger');

  try {
    // 1. Find all captures stuck in processing for > 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const stuckCaptures = await prisma.capture.findMany({
      where: { status: 'processing', createdAt: { lt: twoMinutesAgo } },
      include: { storageObject: true }
    });

    if (stuckCaptures.length === 0) {
      return res.json({ message: 'No stuck captures found.', recovered: 0 });
    }

    // 2. Fetch files from UploadThing API to verify what actually made it
    const rawToken = (process.env.UPLOADTHING_TOKEN || '').replace(/^['\"]|['\"]$/g, '').trim();
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf8'));
    } catch {
      return res.status(500).json({ error: 'Invalid UPLOADTHING_TOKEN' });
    }

    const utRes = await fetch('https://api.uploadthing.com/v6/listFiles', {
      method: 'POST',
      headers: { 'x-uploadthing-api-key': decoded.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 500 }),
      signal: AbortSignal.timeout(10000)
    });

    if (!utRes.ok) {
      return res.status(502).json({ error: `UploadThing returned ${utRes.status}` });
    }

    const { files: utFiles = [] } = await utRes.json();
    const utFileMap = new Map(utFiles.map(f => [f.key, f]));

    // 3. For each stuck capture that has a storageObject with a fileKey,
    //    verify the file exists in UT and activate it. For captures without
    //    a storageObject we cannot recover without the fileKey.
    let recovered = 0;
    const results = [];

    for (const capture of stuckCaptures) {
      const fileKey = capture.storageObject?.providerObjectId;
      if (!fileKey) {
        results.push({ id: capture.id, status: 'skipped', reason: 'no fileKey in storageObject' });
        continue;
      }

      const utFile = utFileMap.get(fileKey);
      if (!utFile) {
        results.push({ id: capture.id, status: 'skipped', reason: 'file not found in UploadThing' });
        continue;
      }

      // File confirmed in UploadThing — activate the capture
      await prisma.storageObject.update({
        where: { captureId: capture.id },
        data: { status: 'ready', sizeBytes: BigInt(utFile.size || 0) }
      });
      await prisma.capture.update({
        where: { id: capture.id },
        data: { status: 'active' }
      });
      await prisma.storageOperation.create({
        data: { captureId: capture.id, provider: 'upload_thing', operation: 'admin_recover', status: 'success' }
      }).catch(() => {});

      recovered++;
      results.push({ id: capture.id, status: 'recovered', fileKey, sizeBytes: utFile.size });
      logger.info('admin', 'recover-processing', { captureId: capture.id, fileKey });
    }

    return res.json({
      message: `Recovery complete. ${recovered}/${stuckCaptures.length} captures recovered.`,
      recovered,
      total: stuckCaptures.length,
      results
    });
  } catch (err) {
    logger.error('admin', 'recover-processing-failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

