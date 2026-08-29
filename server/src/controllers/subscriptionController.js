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
    const envKey = `LS_VARIANT_${planName.toUpperCase()}_${interval.toUpperCase()}`;
    const variantId = process.env[envKey];

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
    res.status(500).json({ error: 'Failed to create checkout session' });
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
