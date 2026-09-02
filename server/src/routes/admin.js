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

// ── One-shot recovery: Sync all UploadThing files to D1 ───────────────────────
// Use this to fix orphaned captures where UploadThing received the file but the
// webhook failed. Since the webhook failed, the DB has no record of the fileKey.
// This pulls all files from UploadThing and creates missing records for them.
router.post('/recover-processing', async (req, res) => {
  const prisma = require('../db/index');
  const logger = require('../utils/logger');

  try {
    // 1. Fetch files from UploadThing API
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

    // 2. Fetch all existing storage objects in our DB for UploadThing
    const existingObjects = await prisma.storageObject.findMany({
      where: { provider: 'upload_thing' },
      select: { providerObjectId: true, captureId: true }
    });
    const existingKeys = new Set(existingObjects.map(o => o.providerObjectId));

    // 3. For any file in UT that is NOT in our DB, create a capture for the Admin
    let recovered = 0;
    const results = [];

    for (const utFile of utFiles) {
      if (existingKeys.has(utFile.key)) {
        continue; // We already have this file safely in the DB
      }

      // Determine mime/type from name
      const title = utFile.name || `Recovered File ${utFile.key}`;
      const isVideo = title.toLowerCase().endsWith('.webm') || title.toLowerCase().endsWith('.mp4');
      const type = isVideo ? 'video' : 'image';
      const mime = isVideo ? 'video/webm' : 'image/png';

      // Create the capture and storage object
      const capture = await prisma.capture.create({
        data: {
          userId: req.user.id, // Assign to the admin running the recovery
          title: title,
          type: type,
          mimeType: mime,
          hasAudio: isVideo,
          status: 'active',
          createdAt: new Date(utFile.uploadedAt || Date.now())
        }
      });

      await prisma.storageObject.create({
        data: {
          captureId: capture.id,
          provider: 'upload_thing',
          providerObjectId: utFile.key,
          filename: utFile.key,
          sizeBytes: BigInt(utFile.size || 0),
          status: 'ready',
          providerMeta: JSON.stringify({ url: `https://utfs.io/f/${utFile.key}`, name: utFile.name })
        }
      });

      recovered++;
      results.push({ id: capture.id, status: 'recovered', fileKey: utFile.key, sizeBytes: utFile.size });
      logger.info('admin', 'sync-recovered-file', { captureId: capture.id, fileKey: utFile.key });
    }

    // Optional: cleanup old stuck processing captures that never made it
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await prisma.capture.deleteMany({
      where: { status: 'processing', createdAt: { lt: twoMinutesAgo } }
    }).catch(() => {});

    return res.json({
      message: `Sync complete. ${recovered} missing files were restored to your library.`,
      recovered,
      total: utFiles.length,
      results
    });
  } catch (err) {
    logger.error('admin', 'recover-processing-failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

