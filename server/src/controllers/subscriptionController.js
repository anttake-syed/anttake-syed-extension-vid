const prisma = require('../db/index');
const lemonSqueezyService = require('../services/lemonSqueezyService');
const logger = require('../utils/logger');

exports.createCheckout = async (req, res) => {
  try {
    const { planName, interval } = req.body;
    
    if (!planName || !interval) {
      return res.status(400).json({ error: 'planName and interval are required' });
    }

    // Map plan info to LemonSqueezy variant ID securely via ENV vars
    const mode = (process.env.LEMONSQUEEZY_MODE || 'test').toUpperCase();
    
    // Support the recommended format: LEMONSQUEEZY_TEST_MONTHLY_VARIANT_ID
    const specificEnvKey = `LEMONSQUEEZY_${mode}_${interval.toUpperCase()}_VARIANT_ID`;
    // Fallback to legacy format just in case
    const legacyEnvKey = `LS_VARIANT_${planName.toUpperCase()}_${interval.toUpperCase()}`;
    
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

    // Everyone gets a calm, generic message — the real cause (LemonSqueezy
    // config, API errors, etc.) isn't something a regular user can act on
    // and shouldn't be exposed to them. An admin hitting the same failure
    // gets the actual error message inline, so they don't have to go dig
    // through the diagnostics error log just to see what broke.
    let isAdmin = false;
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
      isAdmin = dbUser?.role === 'admin';
    } catch { /* best-effort — fall back to the generic message */ }

    res.status(500).json({
      error: 'Something went wrong starting checkout. Please try again in a moment, or contact support if this keeps happening.',
      ...(isAdmin && { adminDetail: err.message }),
    });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { subscription: { include: { plan: true } } }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ subscription: user.subscription });
  } catch (err) {
    logger.error('subscription', 'get-subscription-failed', { requestId: req.requestId, userId: req.user.id, error: err });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};
