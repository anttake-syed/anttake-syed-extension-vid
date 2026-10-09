const prisma = require('../db/index');
const lemonSqueezyService = require('../services/lemonSqueezyService');
const logger = require('../utils/logger');
const { hasCloudAccess, subscriptionGrantsAccess } = require('../services/accessRules');

// ── Entitlement computation ───────────────────────────────────────────────────
// Single source of truth for what a subscription record means for the frontend.
// The frontend never derives access rules — it just reads this object.

exports.computeEntitlements = function computeEntitlements(subscription, user = null, appSettings = null) {
  // Check Admin Bypass first
  if (user?.role === 'admin' && appSettings?.adminBypassEnabled) {
     return {
       cloud: true,
       plan: 'cloud', // or equivalent paid plan name
       status: 'active',
       cancelAtPeriodEnd: false,
       currentPeriodEnd: null,
       daysUntilExpiry: null,
       warningLevel: null,
       isAdminBypass: true
     };
  }

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

  // Active, on trial, or cancelled-but-still-in-period all grant access.
  const cloud    = hasCloudAccess(subscription);

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

// LS subscription resource → the fields accessRules reads.
function periodEnd(attributes) {
  const end = attributes.ends_at || attributes.renews_at;
  return end ? new Date(end) : undefined;
}

function toSubscriptionShape(lsSub) {
  return { status: lsSub.attributes.status, currentPeriodEnd: periodEnd(lsSub.attributes) };
}

// Prefer a subscription that grants access; among equals, the newest.
function pickBestSubscription(subs) {
  if (!subs?.length) { return null; }
  return [...subs].sort((a, b) => {
    const accessDiff = subscriptionGrantsAccess(toSubscriptionShape(b)) - subscriptionGrantsAccess(toSubscriptionShape(a));
    if (accessDiff) { return accessDiff; }
    return new Date(b.attributes.created_at) - new Date(a.attributes.created_at);
  })[0];
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

    const appSettings = await prisma.appSettings.findUnique({ where: { id: 'global' } }) || {};

    res.json({
      subscription:  user.subscription,
      entitlements:  exports.computeEntitlements(user.subscription, user, appSettings),
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
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!userRow) return res.status(404).json({ error: 'User not found' });

    const lsCustomer = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId } });
    let lsData = null;

    // Normal path: the webhook already linked a subscription to this user.
    if (lsCustomer?.lsSubscriptionId) {
      try {
        lsData = await lemonSqueezyService.fetchSubscription(lsCustomer.lsSubscriptionId);
      } catch (e) {
        logger.warn('subscription', 'sync-ls-fetch-failed', { userId, error: e.message });
      }
    }

    // Recovery path: nothing linked (webhook dropped / local dev), or the linked
    // subscription no longer grants access but the user bought a newer one.
    if (!lsData || !subscriptionGrantsAccess(toSubscriptionShape(lsData))) {
      try {
        const subs = await lemonSqueezyService.fetchSubscriptionsByEmail(userRow.email);
        const best = pickBestSubscription(subs);
        if (best && best.id !== lsData?.id) {
          lsData = best;
          logger.info('subscription', 'recovered-by-email', { userId, lsSubscriptionId: best.id });
          const mapping = {
            lsCustomerId:     lsData.attributes.customer_id.toString(),
            lsSubscriptionId: lsData.id.toString(),
            lsVariantId:      lsData.attributes.variant_id.toString(),
          };
          await prisma.lemonSqueezyCustomer.upsert({
            where:  { userId },
            update: mapping,
            create: { userId, ...mapping },
          });
        }
      } catch (e) {
        logger.warn('subscription', 'sync-email-recovery-failed', { userId, error: e.message });
      }
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { id: 'global' } }) || {};

    if (!lsData?.attributes?.status) {
      // Still no data — just return current state
      return res.json({
        synced:       false,
        subscription: userRow.subscription || null,
        entitlements: exports.computeEntitlements(userRow.subscription || null, userRow, appSettings),
      });
    }

    // Apply the fresh data from Lemon Squeezy to our DB
    const { getPlanNameFromVariant } = require('./lsWebhookController');
    const { ensurePlan } = require('../services/planService');
    const variantId = lsData.attributes.variant_id.toString();
    const planName = getPlanNameFromVariant(variantId);

    // Self-heals the 'cloud' plan if the DB lacks it, so email recovery records
    // the subscription as cloud (and unlocks) instead of falling back to free.
    const plan = await ensurePlan(planName);

    if (plan) {
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          planId:            plan.id,
          status:            lsData.attributes.status,
          currentPeriodStart: lsData.attributes.created_at ? new Date(lsData.attributes.created_at) : undefined,
          currentPeriodEnd:  periodEnd(lsData.attributes),
          cancelAtPeriodEnd: lsData.attributes.ends_at !== null && lsData.attributes.ends_at !== undefined,
        },
        create: {
          userId,
          planId:            plan.id,
          status:            lsData.attributes.status,
          currentPeriodStart: lsData.attributes.created_at ? new Date(lsData.attributes.created_at) : undefined,
          currentPeriodEnd:  periodEnd(lsData.attributes),
          cancelAtPeriodEnd: lsData.attributes.ends_at !== null && lsData.attributes.ends_at !== undefined,
          lsCustomerId:      lsData.attributes.customer_id.toString(),
        }
      });
    }

    // Invalidate so next check reads fresh from DB
    const { invalidateSubscriptionCache } = require('../services/subscriptionCache');
    invalidateSubscriptionCache(userId);

    logger.info('subscription', 'sync-complete', { userId, newStatus: lsData.attributes.status });

    // Return fresh state
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    res.json({
      synced:       true,
      subscription: updatedUser?.subscription || null,
      entitlements: exports.computeEntitlements(updatedUser?.subscription || null, updatedUser, appSettings),
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

    // Block a second purchase: LemonSqueezy happily creates another subscription
    // (and charges again) for a customer who already has one.
    const existing = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: true },
    });
    if (hasCloudAccess(existing)) {
      return res.status(409).json({
        error: 'You already have an active AntCapture Cloud subscription. Manage it from your subscription settings.',
        code:  'already_subscribed',
      });
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
