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
router.get('/diagnostics/billing/:email', diag.getUserBillingDiagnostics);

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

// ── Ensure the free + cloud plan rows exist (self-heal an unseeded DB) ────────
// POST /api/admin/ensure-plans
router.post('/ensure-plans', async (req, res) => {
  try {
    const { ensureCorePlans } = require('../services/planService');
    const { free, cloud } = await ensureCorePlans();
    res.json({ ok: true, free: { id: free?.id, active: free?.isActive }, cloud: { id: cloud?.id, active: cloud?.isActive } });
  } catch (err) {
    require('../utils/logger').error('admin', 'ensure-plans-failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── Recover a user's subscription from LemonSqueezy by email ──────────────────
// POST /api/admin/recover-subscription/:email
// For a buyer whose purchase never recorded (misconfigured webhook, dropped
// event, etc.): ensure the plans exist, look their subscription up in
// LemonSqueezy by email, and record it — unlocking them without a new purchase.
router.post('/recover-subscription/:email', async (req, res) => {
  const prisma = require('../db/index');
  const logger = require('../utils/logger');
  const lemonSqueezyService = require('../services/lemonSqueezyService');
  const { ensureCorePlans, ensurePlan } = require('../services/planService');
  const { getPlanNameFromVariant } = require('../controllers/lsWebhookController');
  const { computeEntitlements } = require('../controllers/subscriptionController');
  const { invalidateSubscriptionCache } = require('../services/subscriptionCache');
  try {
    const email = req.params.email;
    await ensureCorePlans();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: { include: { plan: true } } },
    });
    if (!user) { return res.status(404).json({ error: 'No user with that email' }); }

    const subs = await lemonSqueezyService.fetchSubscriptionsByEmail(email);
    if (!subs || subs.length === 0) {
      return res.json({
        ok: false,
        reason: 'no_subscription_found_in_lemonsqueezy',
        email,
        mode: process.env.LEMONSQUEEZY_MODE || 'test',
        hint: 'No subscription for this email in the current LEMONSQUEEZY_MODE. Confirm the mode and API key match where the purchase was made.',
      });
    }

    const lsData = [...subs].sort((a, b) => new Date(b.attributes.created_at) - new Date(a.attributes.created_at))[0];
    const variantId = lsData.attributes.variant_id.toString();
    const planName = getPlanNameFromVariant(variantId);
    const plan = await ensurePlan(planName);
    const periodEnd = lsData.attributes.ends_at || lsData.attributes.renews_at;
    const cancelAtPeriodEnd = lsData.attributes.ends_at !== null && lsData.attributes.ends_at !== undefined;

    await prisma.lemonSqueezyCustomer.upsert({
      where:  { userId: user.id },
      update: { lsCustomerId: lsData.attributes.customer_id.toString(), lsSubscriptionId: lsData.id.toString(), lsVariantId: variantId },
      create: { userId: user.id, lsCustomerId: lsData.attributes.customer_id.toString(), lsSubscriptionId: lsData.id.toString(), lsVariantId: variantId },
    });
    await prisma.subscription.upsert({
      where:  { userId: user.id },
      update: { planId: plan.id, status: lsData.attributes.status, currentPeriodStart: lsData.attributes.created_at ? new Date(lsData.attributes.created_at) : undefined, currentPeriodEnd: periodEnd ? new Date(periodEnd) : undefined, cancelAtPeriodEnd },
      create: { userId: user.id, planId: plan.id, status: lsData.attributes.status, currentPeriodStart: lsData.attributes.created_at ? new Date(lsData.attributes.created_at) : undefined, currentPeriodEnd: periodEnd ? new Date(periodEnd) : undefined, lsCustomerId: lsData.attributes.customer_id.toString() },
    });
    invalidateSubscriptionCache(user.id);

    const updated = await prisma.user.findUnique({ where: { id: user.id }, include: { subscription: { include: { plan: true } } } });
    logger.info('admin', 'recover-subscription', { email, status: lsData.attributes.status, plan: plan.name });
    res.json({ ok: true, email, recorded: { plan: plan.name, status: lsData.attributes.status }, entitlements: computeEntitlements(updated.subscription) });
  } catch (err) {
    logger.error('admin', 'recover-subscription-failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── Application Settings ──────────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  const prisma = require('../db/index');
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'global' } });
    res.json(settings || {
      id: 'global',
      adminBypassEnabled: true,
      adminDiagnosticsEnabled: true,
      cloudSubscriptionRequired: true,
      selfHostedBillingRequired: false,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  const prisma = require('../db/index');
  try {
    const data = req.body;
    const settings = await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: {
        adminBypassEnabled: data.adminBypassEnabled,
        adminDiagnosticsEnabled: data.adminDiagnosticsEnabled,
        cloudSubscriptionRequired: data.cloudSubscriptionRequired,
        selfHostedBillingRequired: data.selfHostedBillingRequired,
      },
      create: {
        id: 'global',
        adminBypassEnabled: data.adminBypassEnabled ?? true,
        adminDiagnosticsEnabled: data.adminDiagnosticsEnabled ?? true,
        cloudSubscriptionRequired: data.cloudSubscriptionRequired ?? true,
        selfHostedBillingRequired: data.selfHostedBillingRequired ?? false,
      },
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
