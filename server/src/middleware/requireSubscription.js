'use strict';

const prisma  = require('../db/index');
const logger  = require('../utils/logger');
const { getCachedSubscription, setCachedSubscription } = require('../services/subscriptionCache');

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

    const userId = req.user.id;

    // 1. Check cache first
    const cached = getCachedSubscription(userId);
    if (cached) {
      if (cached.allowed) {
        // We do not attach dbUser here because subsequent handlers usually don't need the full DB object,
        // and if they do, they should fetch it themselves or we can cache what they need.
        // For the routes using this (boards, captures), they only care about authorization.
        return next();
      } else {
        logger.warn('auth', 'subscription-required-cached', {
          requestId: req.requestId,
          userId: userId,
          path: req.path,
        });
        return res.status(403).json({
          error: 'subscription_required',
          message: 'This feature requires an active AntCapture Cloud plan.',
          upgradeUrl: `${process.env.WEB_UI_URL || ''}/pricing`,
        });
      }
    }

    // 2. Cache miss — fetch from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isAdmin = dbUser.role === 'admin';
    const hasActiveSub = dbUser.subscription && dbUser.subscription.status === 'active';
    const allowed = isAdmin || hasActiveSub;

    // 3. Store in cache
    setCachedSubscription(userId, { allowed, isAdmin });

    if (allowed) {
      // For backwards compatibility if any route depends on req.dbUser
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
