const prisma = require('../db/index');
const lemonSqueezyService = require('../services/lemonSqueezyService');
const logger = require('../utils/logger');

// ── Entitlement computation ───────────────────────────────────────────────────
// Single source of truth for what a subscription record means for the frontend.
// The frontend never derives access rules — it just reads this object.

function computeEntitlements(subscription) {
  if (!subscription) {
    return {
      cloud: false,
      plan: 'free',
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      daysUntilExpiry: null,
      warningLevel: null,  // null | 'info' | 'warning' | 'critical' | 'payment_failed'
    };
  }

  const status           = subscription.status;
  const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd || false;
  const currentPeriodEnd  = subscription.currentPeriodEnd  || null;
  const planName          = subscription.plan?.name        || 'free';

  // Active = paid and not expired. Cancelled-but-in-period still grants access.
  const isActive = status === 'active';
  const cloud    = isActive && planName !== 'free';

  // Days until period end (for cancellation/expiry warnings)
  let daysUntilExpiry = null;
  if (currentPeriodEnd) {
    const msLeft = new Date(currentPeriodEnd) - Date.now();
    daysUntilExpiry = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  }

  // Warning level — only shown to cloud users
  let warningLevel = null;
  if (status === 'past_due') {
    warningLevel = 'payment_failed';
  } else if (cloud && cancelAtPeriodEnd && daysUntilExpiry !== null) {
    if (daysUntilExpiry <= 1)      warningLevel = 'critical';
    else if (daysUntilExpiry <= 3) warningLevel = 'warning';
    else if (daysUntilExpiry <= 7) warningLevel = 'info';
  }

  return {
    cloud,
    plan:            planName,
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    daysUntilExpiry,
    warningLevel,
  };
}

// ── GET /subscription ─────────────────────────────────────────────────────────
exports.getSubscription = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      subscription:  user.subscription,
      entitlements:  computeEntitlements(user.subscription),
    });
  } catch (err) {
    logger.error('subscription', 'get-subscription-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// ── POST /subscription/sync ───────────────────────────────────────────────────
// Called by the frontend after a successful checkout redirect (?billing=success).
// Fetches the live subscription state from LemonSqueezy, writes it to DB,
// invalidates the cache, and returns fresh entitlements.
// This recovers from webhook delivery delays without trusting the browser.
exports.syncSubscription = async (req, res) => {
  const userId = req.user.id;
  try {
    // Find the user's LS subscription ID
    const lsCustomer = await prisma.lemonSqueezyCustomer.findUnique({
      where: { userId },
    });

    if (!lsCustomer?.lsSubscriptionId) {
      // No record yet — webhook hasn't arrived. Return current state.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: { include: { plan: true } } },
      });
      return res.json({
        synced:       false,
        subscription: user?.subscription || null,
        entitlements: computeEntitlements(user?.subscription || null),
      });
    }

    // Fetch live from LemonSqueezy
    let lsData = null;
    try {
      lsData = await lemonSqueezyService.fetchSubscription(lsCustomer.lsSubscriptionId);
    } catch (fetchErr) {
      logger.warn('subscription', 'sync-ls-fetch-failed', { userId, error: fetchErr.message });
    }

    if (lsData?.attributes?.status) {
      const newStatus = lsData.attributes.status;
      await prisma.subscription.updateMany({
        where: { userId },
        data: {
          status:            newStatus,
          currentPeriodEnd:  lsData.attributes.renews_at  ? new Date(lsData.attributes.renews_at)  : undefined,
          cancelAtPeriodEnd: lsData.attributes.ends_at !== null && lsData.attributes.ends_at !== undefined,
        },
      });

      // Invalidate so next check reads fresh from DB
      const { invalidateSubscriptionCache } = require('../services/subscriptionCache');
      invalidateSubscriptionCache(userId);

      logger.info('subscription', 'sync-complete', { userId, newStatus });
    }

    // Return fresh state
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    res.json({
      synced:       !!lsData,
      subscription: updatedUser?.subscription || null,
      entitlements: computeEntitlements(updatedUser?.subscription || null),
    });
  } catch (err) {
    logger.error('subscription', 'sync-failed', { requestId: req.requestId, userId, error: err });
    res.status(500).json({ error: 'Subscription sync failed' });
  }
};

// ── POST /subscription/checkout ───────────────────────────────────────────────
exports.createCheckout = async (req, res) => {
  try {
    const { planName, interval } = req.body;

    if (!planName || !interval) {
      return res.status(400).json({ error: 'planName and interval are required' });
    }

    const mode = (process.env.LEMONSQUEEZY_MODE || 'test').toUpperCase();

    const specificEnvKey = `LEMONSQUEEZY_${mode}_${interval.toUpperCase()}_VARIANT_ID`;
    const legacyEnvKey   = `LS_VARIANT_${planName.toUpperCase()}_${interval.toUpperCase()}`;

    const variantId = process.env[specificEnvKey] || process.env[legacyEnvKey];

    if (!variantId) {
      return res.status(400).json({ error: 'Invalid plan or interval, or variant not configured' });
    }

    const checkoutUrl = await lemonSqueezyService.createCheckoutSession(
      variantId,
      req.user.id,
      req.user.email
    );

    res.json({ success: true, checkoutUrl });
  } catch (err) {
    logger.error('subscription', 'create-checkout-failed', { requestId: req.requestId, userId: req.user.id, error: err });

    let isAdmin = false;
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
      isAdmin = dbUser?.role === 'admin';
    } catch { /* best-effort */ }

    res.status(500).json({
      error: 'Something went wrong starting checkout. Please try again in a moment, or contact support if this keeps happening.',
      ...(isAdmin && { adminDetail: err.message }),
    });
  }
};
