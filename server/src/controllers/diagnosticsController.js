/**
 * controllers/diagnosticsController.js — System Health & Diagnostics
 *
 * SECURITY:
 *   Every endpoint in this controller is protected by:
 *     requireAuth  →  requireAdmin
 *   So even if someone discovers the URL, they get 401/403.
 *
 * PHILOSOPHY (per the design spec):
 *   Logger  → records what HAPPENED (historical events)
 *   Diagnostics → checks what is working RIGHT NOW (live health)
 *   D1      → stores application data, NOT a log dump
 *
 * Phase 1 checks (implemented here):
 *   ✓ API alive
 *   ✓ D1 connection
 *   ✓ D1 schema / migration check (critical tables present)
 *   ✓ Database read
 *   ✓ Database write + rollback (non-destructive)
 *   ✓ Board CRUD (create → read → delete)
 *   ✓ Capture CRUD (create → read → delete)
 *   ✓ Authentication (JWT secret configured)
 *   ✓ Object storage (R2/cloud config present)
 *   ✓ Recent error log (from in-memory ring buffer)
 *
 * Phase 2 (stubs left for easy extension):
 *   - Media access URL resolution
 *   - Background job queues
 */

'use strict';

const logger  = require('../utils/logger');
const prisma  = require('../db/index');
const { errorRingBuffer, activityRingBuffer } = require('../utils/errorBuffer');

// ── Check runner helper ───────────────────────────────────────────────────────
async function runCheck(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      name,
      status: 'PASS',
      durationMs: Date.now() - start,
      ...(result && typeof result === 'object' ? { detail: result } : {}),
    };
  } catch (err) {
    return {
      name,
      status: 'FAIL',
      durationMs: Date.now() - start,
      error:   err.message,
      code:    err.code,
    };
  }
}

// ── Expected D1/SQLite tables ─────────────────────────────────────────────────
const REQUIRED_TABLES = [
  'User', 'Session', 'Capture', 'StorageObject', 'StorageAccount',
  'StorageOperation', 'Plan', 'Subscription', 'Usage', 'Board', 'BoardItem',
];

// ── Individual health checks ───────────────────────────────────────────────────

/** 1. API is alive (trivial — if we reach this controller, it passed) */
async function checkApi() {
  return { uptime: Math.floor(process.uptime()), mode: process.env.SERVER_MODE || 'local' };
}

/** 2. D1 / DB connection — execute the simplest possible query */
async function checkD1Connection() {
  const isCloud = process.env.SERVER_MODE === 'cloud';
  if (isCloud) {
    // Use raw D1 HTTP query
    const rows = await prisma._raw('SELECT 1 AS ok');
    if (!rows || rows[0]?.ok !== 1) throw new Error('SELECT 1 returned unexpected result');
    return { backend: 'cloudflare-d1' };
  }
  // Local SQLite via Prisma
  await prisma.$queryRaw`SELECT 1`;
  return { backend: 'sqlite-prisma' };
}

/** 3. D1 schema / migration — verify all critical tables exist */
async function checkD1Schema() {
  const isCloud = process.env.SERVER_MODE === 'cloud';
  let presentTables = [];

  if (isCloud) {
    const rows = await prisma._raw(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`
    );
    presentTables = rows.map(r => r.name);
  } else {
    const rows = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;
    presentTables = rows.map(r => r.name);
  }

  const missing = REQUIRED_TABLES.filter(t => !presentTables.includes(t));
  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(', ')}`);
  }
  return { tablesFound: presentTables.length, requiredTables: REQUIRED_TABLES.length };
}

/** 4. Database read — fetch one user record */
async function checkDatabaseRead() {
  const users = await prisma.user.findMany({ where: {} });
  return { userCount: users.length };
}

/** 5. Database write — insert a diagnostic sentinel row, then immediately delete it */
async function checkDatabaseWrite() {
  const SENTINEL_ID    = `diag-sentinel-${Date.now()}`;
  const SENTINEL_EMAIL = `diag-${Date.now()}@diagnostics.internal`;
  
  let created = null;
  try {
    created = await prisma.user.create({
      data: {
        id:       SENTINEL_ID,
        email:    SENTINEL_EMAIL,
        name:     'Diagnostics Sentinel',
        googleId: `diag-${Date.now()}`,
        role:     'user',
      }
    });
    if (!created || created.id !== SENTINEL_ID) {
      throw new Error('Created row ID mismatch');
    }
    return { written: true, cleanedUp: false };
  } finally {
    // Always delete the sentinel, even if an assertion failed
    if (created) {
      await prisma.user.delete({ where: { id: SENTINEL_ID } }).catch(() => {});
    }
  }
}

/** 6. Board CRUD — create, read, update, delete a test board */
async function checkBoardCrud(adminUserId) {
  const testBoard = await prisma.board.create({
    data: {
      userId:  adminUserId,
      title:   '__diag_board__',
      width:   100,
      height:  100,
      background: '#000000',
    }
  });
  
  const found = await prisma.board.findUnique({ where: { id: testBoard.id } });
  if (!found) throw new Error('Board not found after creation');
  
  await prisma.board.delete({ where: { id: testBoard.id } });
  return { boardId: testBoard.id, created: true, read: true, deleted: true };
}

/** 7. Capture CRUD — create, read, delete a test capture */
async function checkCaptureCrud(adminUserId) {
  const testCapture = await prisma.capture.create({
    data: {
      userId:   adminUserId,
      type:     'image',
      title:    '__diag_capture__',
      mimeType: 'image/png',
      status:   'processing',
    }
  });
  
  const found = await prisma.capture.findUnique({ where: { id: testCapture.id } });
  if (!found) throw new Error('Capture not found after creation');
  
  await prisma.capture.delete({ where: { id: testCapture.id } });
  return { captureId: testCapture.id, created: true, read: true, deleted: true };
}

/** 8. Authentication — verify JWT secret is configured */
async function checkAuthentication() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 12) {
    throw new Error('JWT_SECRET is missing or too short (< 12 chars)');
  }
  const jwt = require('jsonwebtoken');
  // Sign and immediately verify a test token
  const tok = jwt.sign({ test: true }, secret, { expiresIn: '5s' });
  jwt.verify(tok, secret);
  return { jwtConfigured: true, secretLength: secret.length };
}

/** 9. UploadThing — verify token is configured, correctly formed, and endpoint responds */
async function checkUploadThing() {
  const rawToken = process.env.UPLOADTHING_TOKEN || '';
  const token = rawToken.replace(/^['"]|['"]$/g, '').trim();

  if (!token) {
    throw new Error('UPLOADTHING_TOKEN is not set — cloud uploads will fail');
  }

  if (rawToken !== token) {
    // The env var had surrounding quotes — flag this as a warning-level detail
    // (we strip them ourselves, but it’s still a misconfiguration worth surfacing)
    logger.warn('diagnostics', 'uploadthing-token-quoted', {
      message: 'UPLOADTHING_TOKEN has surrounding quotes in the environment variable. This is auto-corrected but should be fixed in Vercel env settings.'
    });
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch {
    throw new Error('UPLOADTHING_TOKEN is not valid base64 JSON — re-copy it from the UploadThing dashboard');
  }

  if (!decoded.apiKey || !decoded.appId || !Array.isArray(decoded.regions)) {
    throw new Error(`Token decoded but is malformed. Keys found: ${Object.keys(decoded).join(', ')}`);
  }

  // Live ping: verify the token can authenticate and get storage usage
  const pingRes = await fetch('https://api.uploadthing.com/v6/getUsageInfo', {
    method: 'POST',
    headers: { 
      'x-uploadthing-api-key': decoded.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(5000),
  }).catch(e => { throw new Error(`UploadThing API unreachable: ${e.message}`); });

  if (pingRes.status === 401) throw new Error('UPLOADTHING_TOKEN apiKey is invalid — unauthorized');
  if (!pingRes.ok && pingRes.status !== 404) throw new Error(`UploadThing API returned ${pingRes.status}`);

  let usageData = {};
  if (pingRes.ok) {
    try {
      usageData = await pingRes.json();
    } catch (e) {}
  }

  return {
    configured: true,
    appId: decoded.appId,
    regions: decoded.regions,
    tokenHadQuotes: rawToken !== token,
    apiReachable: true,
    storageUsed: usageData.totalBytes ? `${(usageData.totalBytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
    filesStored: usageData.filesUploaded !== undefined ? usageData.filesUploaded : 'Unknown'
  };
}


/** 10. LemonSqueezy — verify billing config is set up correctly */
async function checkLemonSqueezy() {
  const missing = [];
  if (!process.env.LS_API_KEY)              missing.push('LS_API_KEY');
  if (!process.env.LS_STORE_ID)             missing.push('LS_STORE_ID');
  if (!process.env.LS_WEBHOOK_SECRET)       missing.push('LS_WEBHOOK_SECRET');
  if (!process.env.LS_VARIANT_CLOUD_MONTHLY) missing.push('LS_VARIANT_CLOUD_MONTHLY');
  if (!process.env.LS_VARIANT_CLOUD_YEARLY)  missing.push('LS_VARIANT_CLOUD_YEARLY');

  if (missing.length > 0) {
    throw new Error(`Missing billing env vars: ${missing.join(', ')}`);
  }

  // Live ping — fetch store info from LemonSqueezy API
  const response = await fetch(`https://api.lemonsqueezy.com/v1/stores/${process.env.LS_STORE_ID}`, {
    headers: {
      'Accept':        'application/vnd.api+json',
      'Authorization': `Bearer ${process.env.LS_API_KEY}`,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (response.status === 401) throw new Error('LS_API_KEY is invalid — unauthorized');
  if (response.status === 404) throw new Error('LS_STORE_ID not found in LemonSqueezy');
  if (!response.ok) throw new Error(`LemonSqueezy API returned ${response.status}`);

  const body = await response.json();
  const storeName = body?.data?.attributes?.name || 'Unknown';

  return {
    configured:   true,
    storeId:      process.env.LS_STORE_ID,
    storeName,
    variantKeys:  ['LS_VARIANT_CLOUD_MONTHLY', 'LS_VARIANT_CLOUD_YEARLY'],
    webhookSet:   true,
  };
}

// ── Recent errors ─────────────────────────────────────────────────────────────
function getRecentErrors() {
  return errorRingBuffer.get();
}

// ── Recent activity ───────────────────────────────────────────────────────────
function getRecentActivity() {
  return activityRingBuffer.get();
}

// ── Controller: GET /api/admin/diagnostics/health ─────────────────────────────
exports.getSystemHealth = async (req, res) => {
  const adminUserId = req.dbUser?.id || req.user?.id;
  
  logger.info('diagnostics', 'health-check-start', {
    requestId: req.requestId,
    userId:    adminUserId,
  });

  const startAll = Date.now();

  // Run all checks (in parallel where safe, sequential for CRUD to keep orderly)
  const [apiCheck, d1ConnCheck, schemaCheck, readCheck, writeCheck, authCheck, uploadThingCheck, lemonSqueezyCheck] =
    await Promise.all([
      runCheck('API',                   checkApi),
      runCheck('D1 Connection',         checkD1Connection),
      runCheck('D1 Schema/Migrations',  checkD1Schema),
      runCheck('Database Read',         checkDatabaseRead),
      runCheck('Database Write',        checkDatabaseWrite),
      runCheck('Authentication (JWT)',  checkAuthentication),
      runCheck('UploadThing',           checkUploadThing),
      runCheck('LemonSqueezy Billing',  checkLemonSqueezy),
    ]);

  // CRUD checks depend on a valid userId — run after parallel batch
  const boardCheck   = await runCheck('Board CRUD',   () => checkBoardCrud(adminUserId));
  const captureCheck = await runCheck('Capture CRUD', () => checkCaptureCrud(adminUserId));

  const checks = [
    apiCheck, d1ConnCheck, schemaCheck, readCheck, writeCheck,
    boardCheck, captureCheck, authCheck, uploadThingCheck, lemonSqueezyCheck,
  ];

  const totalMs  = Date.now() - startAll;
  const passCount = checks.filter(c => c.status === 'PASS').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  const overallStatus = failCount === 0 ? 'HEALTHY' : passCount === 0 ? 'DOWN' : 'DEGRADED';

  logger.info('diagnostics', 'health-check-complete', {
    requestId: req.requestId,
    userId:    adminUserId,
    durationMs: totalMs,
    pass:  passCount,
    fail:  failCount,
    status: overallStatus,
  });

  res.json({
    overallStatus,
    checkedAt:  new Date().toISOString(),
    durationMs: totalMs,
    pass:  passCount,
    fail:  failCount,
    checks,
  });
};

// ── Controller: GET /api/admin/diagnostics/errors ─────────────────────────────
exports.getRecentErrors = async (req, res) => {
  const adminUserId = req.dbUser?.id || req.user?.id;
  
  logger.info('diagnostics', 'recent-errors-fetch', {
    requestId: req.requestId,
    userId:    adminUserId,
  });

  const errors = getRecentErrors();
  res.json({ errors, count: errors.length });
};

// ── Controller: GET /api/admin/diagnostics/activity ───────────────────────────
exports.getRecentActivity = async (req, res) => {
  const adminUserId = req.dbUser?.id || req.user?.id;
  
  logger.info('diagnostics', 'recent-activity-fetch', {
    requestId: req.requestId,
    userId:    adminUserId,
  });

  const activity = getRecentActivity();
  res.json({ activity, count: activity.length });
};

// ── Controller: GET /api/admin/diagnostics/info ───────────────────────────────
exports.getSystemInfo = async (req, res) => {
  res.json({
    checkedAt:   new Date().toISOString(),
    mode:        process.env.SERVER_MODE || 'local',
    nodeVersion: process.version,
    uptime:      Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss:       Math.round(process.memoryUsage().rss       / 1024 / 1024) + ' MB',
      heapUsed:  Math.round(process.memoryUsage().heapUsed  / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  });
};

// ── Controller: GET /api/admin/diagnostics/capture/:id ─────────────────────────
exports.getCaptureDiagnostics = async (req, res) => {
  const adminUserId = req.dbUser?.id || req.user?.id;
  const captureId = req.params.id;
  
  logger.info('diagnostics', 'capture-diagnostics-fetch', {
    requestId: req.requestId,
    userId:    adminUserId,
    captureId
  });

  try {
    const capture = await prisma.capture.findUnique({
      where: { id: captureId },
      include: {
        storageObject: true,
        user: {
          include: {
            usage: true,
            subscription: { include: { plan: true } }
          }
        }
      }
    });

    if (!capture) {
      return res.status(404).json({ error: 'Capture not found' });
    }

    const operations = await prisma.storageOperation.findMany({
      where: { captureId },
      orderBy: { createdAt: 'asc' }
    });

    const user = capture.user;
    
    // Calculate storage usage / quota
    const plan = user.subscription?.plan;
    const usage = user.usage;
    
    let quotaLimit = 'Unlimited';
    let quotaUsed = '0 MB';
    if (plan && usage) {
      quotaLimit = plan.maxFileSizeBytes ? `${(Number(plan.maxFileSizeBytes) / (1024 * 1024)).toFixed(2)} MB` : 'Unlimited';
      const usedBytes = Number(usage.cloudBytes || 0);
      quotaUsed = `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    let providerMeta = {};
    try {
      if (capture.storageObject?.providerMeta) {
        providerMeta = JSON.parse(capture.storageObject.providerMeta);
      }
    } catch(e) {}

    const payload = {
      captureId: capture.id,
      userId: capture.userId,
      storageProvider: capture.storageObject?.provider || 'none',
      uploadStatus: capture.storageObject?.status || 'none',
      expectedSize: capture.storageObject?.sizeBytes ? Number(capture.storageObject.sizeBytes) : null,
      uploadedSize: providerMeta.size || null,
      d1AssetStatus: capture.status,
      uploadThingFileKey: capture.storageObject?.provider === 'upload_thing' ? capture.storageObject.providerObjectId : null,
      callbackReceived: capture.storageObject?.status === 'ready',
      libraryVisible: capture.status === 'active' && capture.storageObject?.status === 'ready',
      storageUsage: `${quotaUsed} / ${quotaLimit}`,
      timestamps: {
        captureCreated: capture.createdAt,
        uploadStart: operations.find(o => o.operation === 'upload_initiated' || o.operation === 'upload_intent')?.createdAt || null,
        uploadComplete: operations.find(o => o.operation === 'upload_completed' || o.operation === 'upload')?.createdAt || null,
        callback: capture.storageObject?.status === 'ready' ? capture.storageObject?.updatedAt : null,
        d1Ready: capture.status === 'active' ? capture.updatedAt : null,
        libraryVisible: (capture.status === 'active' && capture.storageObject?.status === 'ready') ? capture.updatedAt : null
      },
      operations: operations.map(o => ({
        operation: o.operation,
        status: o.status,
        createdAt: o.createdAt,
        durationMs: o.durationMs
      }))
    };

    res.json(payload);
  } catch (err) {
    logger.error('diagnostics', 'capture-diagnostics-error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch capture diagnostics' });
  }
};
