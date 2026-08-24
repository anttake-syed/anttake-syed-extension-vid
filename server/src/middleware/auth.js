const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');

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

async function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
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
        const user = await resolveUserFromDecoded(decoded);
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
      console.error('Failed to get/create local admin user:', err.message);
      return res.status(500).json({ error: 'Local admin setup failed. Is your database initialized? Run: npm run setup' });
    }
  }

  // ── Cloud mode: strict JWT required ──────────────────────────────────────
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header or token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await resolveUserFromDecoded(decoded);
    if (!user?.id) {
      return res.status(401).json({ error: 'User account not found. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;