'use strict';

const prisma  = require('../db/index');
const logger  = require('../utils/logger');

/**
 * requireSubscription — Authorization middleware (runs AFTER requireAuth).
 *
 * Access logic:
 *   admin role  → full access, no subscription required
 *   active subscription → full access
 *   everything else → 403 subscription_required
 *
 * Usage:
 *   router.post('/boards', requireAuth, requireSubscription, handler);
 */
async function requireSubscription(req, res, next) {
  try {
    // In local self-hosted mode, subscriptions don't apply
    if (process.env.SERVER_MODE === 'local') {
      return next();
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Admin: full bypass
    if (dbUser.role === 'admin') {
      req.dbUser = dbUser;
      return next();
    }

    // Check for an active subscription
    if (dbUser.subscription && dbUser.subscription.status === 'active') {
      req.dbUser = dbUser;
      return next();
    }

    logger.warn('auth', 'subscription-required', {
      requestId: req.requestId,
      userId: dbUser.id,
      path: req.path,
      subscriptionStatus: dbUser.subscription?.status || 'none',
    });

    return res.status(403).json({
      error: 'subscription_required',
      message: 'This feature requires an active AntCapture Cloud plan.',
      upgradeUrl: `${process.env.WEB_UI_URL || ''}/pricing`,
    });
  } catch (err) {
    logger.error('auth', 'subscription-check-failed', { requestId: req.requestId, error: err });
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = requireSubscription;
