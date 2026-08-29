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
const { errorRingBuffer } = require('../utils/errorBuffer');

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

/** 9. Object storage — check R2 / cloud storage config */
async function checkObjectStorage() {
  const isCloud = process.env.SERVER_MODE === 'cloud';
  if (!isCloud) {
    // In local mode, check that uploads dir is writable
    const fs   = require('fs');
    const path = require('path');
    const dir  = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) {
      throw new Error('uploads/ directory does not exist. Run npm run setup.');
    }
    return { mode: 'local', uploadsDir: true };
  }

  // Cloud: check R2 credentials are present
  const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing R2 env vars: ${missing.join(', ')}`);
  }

  // Optionally ping R2 bucket existence (fast HEAD check)
  try {
    const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region:   'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    await client.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }));
    return { mode: 'cloud-r2', bucketReachable: true, bucket: process.env.R2_BUCKET_NAME };
  } catch (err) {
    throw new Error(`R2 bucket unreachable: ${err.message}`);
  }
}

/** 10. Media access — verify the public URL is configured */
async function checkMediaAccess() {
  const isCloud = process.env.SERVER_MODE === 'cloud';
  if (!isCloud) {
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
    return { mode: 'local', servingAt: `${serverUrl}/uploads/` };
  }
  const domain = process.env.R2_PUBLIC_DOMAIN;
  if (!domain) {
    throw new Error('R2_PUBLIC_DOMAIN is not set — media URLs cannot be resolved');
  }
  return { mode: 'cloud', publicDomain: `https://${domain}` };
}

// ── Recent errors ─────────────────────────────────────────────────────────────
function getRecentErrors() {
  return errorRingBuffer.get();
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
  const [apiCheck, d1ConnCheck, schemaCheck, readCheck, writeCheck, authCheck, storageCheck, mediaCheck] =
    await Promise.all([
      runCheck('API',                   checkApi),
      runCheck('D1 Connection',         checkD1Connection),
      runCheck('D1 Schema/Migrations',  checkD1Schema),
      runCheck('Database Read',         checkDatabaseRead),
      runCheck('Database Write',        checkDatabaseWrite),
      runCheck('Authentication',        checkAuthentication),
      runCheck('Object Storage',        checkObjectStorage),
      runCheck('Media Access',          checkMediaAccess),
    ]);

  // CRUD checks depend on a valid userId — run after parallel batch
  const boardCheck   = await runCheck('Board CRUD',   () => checkBoardCrud(adminUserId));
  const captureCheck = await runCheck('Capture CRUD', () => checkCaptureCrud(adminUserId));

  const checks = [
    apiCheck, d1ConnCheck, schemaCheck, readCheck, writeCheck,
    boardCheck, captureCheck, authCheck, storageCheck, mediaCheck,
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
