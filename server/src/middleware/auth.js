const jwt = require('jsonwebtoken');
const prisma = require('../db/index');
const logger = require('../utils/logger');

// Cached local admin user so we don't hit the DB on every request
let _localAdminUser = null;

async function getOrCreateLocalAdmin() {
  if (_localAdminUser) return _localAdminUser;

  _localAdminUser = await prisma.user.upsert({
    where: { email: 'admin@localhost' },
    update: {},
    create: {
      email: 'admin@localhost',
      name: 'Local Admin',
      googleId: 'local-admin',
      role: 'admin', // Local admin always has admin role
    }
  });

  return _localAdminUser;
}

/**
 * If a JWT was verified but is missing `id` (old V1 tokens only had email),
 * look up the real DB user by email so every controller gets a valid DB id.
 */
async function resolveUserFromDecoded(decoded) {
  if (decoded.id) return decoded; // fast path — already has DB id

  if (decoded.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (dbUser) return { ...decoded, id: dbUser.id };
  }

  return null; // cannot resolve
}

// ── requireAuth ───────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header     = req.headers['authorization'];
  const queryToken = req.query.token;

  let token = null;
  if (header?.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

  // ── Local self-hosted mode ────────────────────────────────────────────────
  if ((process.env.SERVER_MODE || process.env.STORAGE_BACKEND) === 'local') {
    // If there's a real JWT (not legacy bypass), verify and resolve it
    if (token && token !== 'local-mode') {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user    = await resolveUserFromDecoded(decoded);
        if (user?.id) {
          req.user = user;
          return next();
        }
        // Has JWT but couldn't get a valid id → fall through to admin
      } catch {
        // Invalid JWT → fall through to admin
      }
    }

    // 'local-mode' bypass, no token, or unresolvable → upsert the admin user in DB
    try {
      req.user = await getOrCreateLocalAdmin();
      return next();
    } catch (err) {
      logger.error('auth', 'local-admin-setup', { requestId: req.requestId, error: err });
      return res.status(500).json({
        error: 'Local admin setup failed. Is your database initialized? Run: npm run setup',
      });
    }
  }

  // ── Cloud mode: strict JWT required ──────────────────────────────────────
  if (!token) {
    logger.warn('auth', 'missing-token', { requestId: req.requestId, path: req.path });
    return res.status(401).json({ error: 'Missing Authorization header or token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await resolveUserFromDecoded(decoded);
    if (!user?.id) {
      logger.warn('auth', 'user-not-found', { requestId: req.requestId });
      return res.status(401).json({ error: 'User account not found. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch (err) {
    logger.warn('auth', 'invalid-token', { requestId: req.requestId, error: err });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
/**
 * Authorization middleware — runs AFTER requireAuth.
 *
 * Security model:
 *   1. requireAuth already verified the JWT → req.user is a valid DB user.
 *   2. We re-query the DB here to read the `role` field server-side.
 *      We NEVER trust a role embedded in the JWT (client-controlled).
 *   3. Only role === 'admin' is granted access.
 *
 * Usage:
 *   router.get('/diagnostics', requireAuth, requireAdmin, handler);
 */
async function requireAdmin(req, res, next) {
  try {
    // Always re-read from DB — never trust client-supplied role
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!dbUser) {
      logger.warn('auth', 'admin-check-user-missing', { requestId: req.requestId, userId: req.user.id });
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (dbUser.role !== 'admin') {
      logger.warn('auth', 'admin-access-denied', {
        requestId: req.requestId,
        userId:    dbUser.id,
        role:      dbUser.role,
        path:      req.path,
      });
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    // Attach full db user so downstream can use it
    req.dbUser = dbUser;
    logger.info('auth', 'admin-access-granted', { requestId: req.requestId, userId: dbUser.id });
    next();
  } catch (err) {
    logger.error('auth', 'admin-check-failed', { requestId: req.requestId, error: err });
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = requireAuth;
module.exports.requireAdmin = requireAdmin;