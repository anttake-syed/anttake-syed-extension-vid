const crypto = require('crypto');
const prisma = require('../db/index');
const logger = require('../utils/logger');

const WEBHOOK_SECRET = process.env.LS_WEBHOOK_SECRET;

/**
 * Maps a LemonSqueezy variant ID to the internal plan name.
 * We only have one paid plan: 'cloud' (monthly or yearly).
 */
exports.getPlanNameFromVariant = function(variantId) {
  const id = variantId.toString();
  // Same env names the checkout uses (subscriptionController), plus legacy ones
  const cloudVariants = [
    'LEMONSQUEEZY_TEST_MONTHLY_VARIANT_ID',
    'LEMONSQUEEZY_TEST_YEARLY_VARIANT_ID',
    'LEMONSQUEEZY_LIVE_MONTHLY_VARIANT_ID',
    'LEMONSQUEEZY_LIVE_YEARLY_VARIANT_ID',
    'LS_VARIANT_CLOUD_MONTHLY',
    'LS_VARIANT_CLOUD_YEARLY',
  ].map((name) => process.env[name]).filter(Boolean);

  if (cloudVariants.includes(id)) { return 'cloud'; }

  // No configured variant matched. This store has a single paid plan ('cloud'),
  // and only paid subscriptions ever produce subscription_* webhooks — so the
  // purchase IS Cloud. Defaulting to 'free' here (the old behaviour) silently
  // left paying customers locked out whenever the variant-id/mode env vars were
  // slightly off, which is the #1 cause of "I paid but nothing unlocked".
  // Resolve to 'cloud' and warn loudly instead. Set LEMONSQUEEZY_STRICT_VARIANTS
  // =true to require an exact match (e.g. once you sell more than one plan).
  const strict = String(process.env.LEMONSQUEEZY_STRICT_VARIANTS || '').toLowerCase() === 'true';
  logger.warn('webhook', 'variant-id-not-mapped-to-cloud', {
    variantId: id,
    mode: process.env.LEMONSQUEEZY_MODE || 'test',
    configuredVariants: cloudVariants,
    resolvedPlan: strict ? 'free' : 'cloud',
    hint: 'Add this id to LEMONSQUEEZY_TEST_/LIVE_*_VARIANT_ID to silence this warning.',
  });
  return strict ? 'free' : 'cloud';
}


exports.handleWebhook = async (req, res) => {
  try {
    // ── 1. Verify HMAC signature ─────────────────────────────────────────────
    // Without a secret anyone could sign a fake event with an empty key — fail closed.
    if (!WEBHOOK_SECRET) {
      logger.error('webhook', 'missing-webhook-secret', { requestId: req.requestId });
      return res.status(500).send('Webhook not configured');
    }
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      logger.warn('webhook', 'invalid-signature', { requestId: req.requestId, ip: req.ip });
      return res.status(403).send('Invalid signature');
    }

    // ── 2. Parse payload ─────────────────────────────────────────────────────
    const payload = JSON.parse(req.body.toString());
    const eventName  = payload.meta.event_name;
    const obj        = payload.data;
    const attributes = obj.attributes;
    const customData = payload.meta.custom_data;
    const userId     = customData?.user_id;
    // LemonSqueezy sends no per-event ID (meta.webhook_id is not unique per
    // event), so dedupe on a hash of the signed body: a retry/resend of the
    // same delivery is byte-identical, while every distinct event differs.
    const eventId    = crypto.createHash('sha256').update(req.body).digest('hex');

    logger.info('webhook', 'event-received', { requestId: req.requestId, eventName, userId, eventId });

    // ── 2b. Idempotency Check ────────────────────────────────────────────────
    if (eventId) {
      const existing = await prisma.lemonSqueezyEvent.findUnique({
        where: { lsEventId: eventId.toString() }
      });
      if (existing) {
        logger.info('webhook', 'event-already-processed', { eventId });
        return res.status(200).send('Already processed');
      }
    }

    // ── 2c. Ignore events for a superseded subscription ─────────────────────
    // A user who bought more than once has several LS subscriptions. Only the
    // one we currently track may change their access — otherwise e.g. the old
    // subscription expiring would lock out a user whose new one is active.
    // subscription_created always wins: it is the newest purchase.
    const eventSubscriptionId = eventName.startsWith('subscription_payment_')
      ? attributes.subscription_id?.toString()
      : obj.id?.toString();
    if (userId && eventSubscriptionId && eventName !== 'subscription_created') {
      const tracked = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId } });
      if (tracked?.lsSubscriptionId && tracked.lsSubscriptionId !== eventSubscriptionId) {
        logger.info('webhook', 'stale-subscription-event-ignored', {
          eventName, userId, eventSubscriptionId, trackedSubscriptionId: tracked.lsSubscriptionId,
        });
        return res.status(200).send('Ignored: superseded subscription');
      }
    }

    // ── 3. Route events ──────────────────────────────────────────────────────
    switch (eventName) {

      // --- Subscription created or updated (also covers resumed/unpaused) ---
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        if (!userId) throw new Error('No user_id in custom_data');

        const variantId = attributes.variant_id.toString();
        const planName  = exports.getPlanNameFromVariant(variantId);
        // Fall back to the free plan row so a paid subscription is still
        // recorded (and unlocks cloud) if the 'cloud' row hasn't been created.
        const plan      = await prisma.plan.findUnique({ where: { name: planName } })
          || await prisma.plan.findUnique({ where: { name: 'free' } });

        if (!plan) {
          logger.warn('webhook', 'plan-not-found', { planName, variantId });
          break;
        }

        // Upsert LS customer record
        await prisma.lemonSqueezyCustomer.upsert({
          where:  { userId },
          update: {
            lsCustomerId:     attributes.customer_id.toString(),
            lsSubscriptionId: obj.id,
            lsVariantId:      variantId,
          },
          create: {
            userId,
            lsCustomerId:     attributes.customer_id.toString(),
            lsSubscriptionId: obj.id,
            lsVariantId:      variantId,
          }
        });

        // Upsert subscription
        await prisma.subscription.upsert({
          where:  { userId },
          update: {
            planId:              plan.id,
            status:              attributes.status,
            currentPeriodStart:  attributes.created_at ? new Date(attributes.created_at) : undefined,
            currentPeriodEnd:    (attributes.ends_at || attributes.renews_at) ? new Date(attributes.ends_at || attributes.renews_at) : undefined,
            cancelAtPeriodEnd:   attributes.ends_at !== null && attributes.ends_at !== undefined,
            lsCustomerId:        attributes.customer_id.toString(),
          },
          create: {
            userId,
            planId:              plan.id,
            status:              attributes.status,
            currentPeriodStart:  attributes.created_at ? new Date(attributes.created_at) : undefined,
            currentPeriodEnd:    (attributes.ends_at || attributes.renews_at) ? new Date(attributes.ends_at || attributes.renews_at) : undefined,
            lsCustomerId:        attributes.customer_id.toString(),
          }
        });

        logger.info('webhook', 'subscription-upserted', { userId, planName, status: attributes.status });
        break;
      }

      // --- Subscription cancelled or expired ---
      case 'subscription_cancelled':
      case 'subscription_expired': {
        if (!userId) break;
        await prisma.subscription.updateMany({
          where: { userId },
          data:  { status: attributes.status, cancelAtPeriodEnd: true }
        });
        logger.info('webhook', 'subscription-cancelled-or-expired', { userId, eventName, status: attributes.status });
        break;
      }

      // --- Payment success --- update status to 'active' in case it was past_due
      case 'subscription_payment_success': {
        if (!userId) break;
        await prisma.subscription.updateMany({
          where: { userId },
          data:  { status: 'active' }
        });

        // Record the payment
        const customer = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId } });
        if (customer) {
          await prisma.lemonSqueezyPayment.create({
            data: {
              customerId:    customer.id,
              lsOrderItemId: obj.id,
              amount:        Math.round((attributes.total || 0)),
              currency:      attributes.currency || 'USD',
              status:        'paid',
              billingReason: 'subscription_cycle',
            }
          }).catch(() => {}); // ignore duplicate key if already recorded
        }
        logger.info('webhook', 'payment-success', { userId });
        break;
      }

      // --- Payment failed --- mark as past_due
      case 'subscription_payment_failed': {
        if (!userId) break;
        await prisma.subscription.updateMany({
          where: { userId },
          data:  { status: 'past_due' }
        });
        logger.warn('webhook', 'payment-failed', { userId });
        break;
      }

      // --- Payment recovered (previously failed, now paid) ---
      case 'subscription_payment_recovered': {
        if (!userId) break;
        await prisma.subscription.updateMany({
          where: { userId },
          data:  { status: 'active' }
        });
        logger.info('webhook', 'payment-recovered', { userId });
        break;
      }

      // --- Payment refunded ---
      case 'subscription_payment_refunded': {
        if (!userId) break;
        // Log the refund — no automatic status change, admin handles case-by-case
        logger.info('webhook', 'payment-refunded', { userId, amount: attributes.total });
        break;
      }

      default:
        logger.info('webhook', 'unhandled-event', { eventName });
    }

    // Invalidate the cache for this user if their subscription status changed
    if (userId) {
      const { invalidateSubscriptionCache } = require('../services/subscriptionCache');
      invalidateSubscriptionCache(userId);
    }

    // ── 4. Log event to DB ───────────────────────────────────────────────────
    if (eventId) {
      let customerIdStr = null;
      if (userId) {
        const customer = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId } });
        if (customer) customerIdStr = customer.id;
      }
      
      await prisma.lemonSqueezyEvent.create({
        data: {
          lsEventId:  eventId.toString(),
          eventName:  eventName,
          payload:    JSON.stringify(payload),
          ...(customerIdStr ? { customerId: customerIdStr } : {})
        }
      }).catch(err => {
        logger.error('webhook', 'failed-to-save-event', { eventId, error: err });
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    logger.error('webhook', 'processing-error', { requestId: req.requestId, error: err });
    res.status(500).send('Webhook error');
  }
};
