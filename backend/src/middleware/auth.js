const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];

  // Local self-hosted mode: try to verify JWT first, then fall back
  if (process.env.STORAGE_BACKEND === 'local') {
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      // Legacy 'local-mode' token (from old auto-bypass) — accept as admin
      if (token === 'local-mode') {
        req.user = { email: 'admin@localhost', name: 'Local Admin' };
        return next();
      }
      // Real JWT issued by /auth/local — verify it
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
      } catch {
        return res.status(401).json({ error: 'Invalid or expired local token. Please sign in again.' });
      }
    }
    // No token at all in local mode — still allow as admin (for extension sync)
    req.user = { email: 'admin@localhost', name: 'Local Admin' };
    return next();
  }

  // Cloud mode: strict JWT required
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;