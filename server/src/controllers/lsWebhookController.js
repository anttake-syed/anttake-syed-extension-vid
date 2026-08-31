const crypto = require('crypto');
const prisma = require('../db/index');
const logger = require('../utils/logger');

const WEBHOOK_SECRET = process.env.LS_WEBHOOK_SECRET;

/**
 * Maps a LemonSqueezy variant ID to the internal plan name.
 * We only have one paid plan: 'cloud' (monthly or yearly).
 */
function getPlanNameFromVariant(variantId) {
  const id = variantId.toString();
  if (
    id === process.env.LS_VARIANT_CLOUD_MONTHLY ||
    id === process.env.LS_VARIANT_CLOUD_YEARLY
  ) {
    return 'cloud';
  }
  return 'free';
}

exports.handleWebhook = async (req, res) => {
  try {
    // ── 1. Verify HMAC signature ─────────────────────────────────────────────
    const secret = WEBHOOK_SECRET || '';
    const hmac = crypto.createHmac('sha256', secret);
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

    logger.info('webhook', 'event-received', { requestId: req.requestId, eventName, userId });

    // ── 3. Route events ──────────────────────────────────────────────────────
    switch (eventName) {

      // --- Subscription created or updated (also covers resumed/unpaused) ---
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        if (!userId) throw new Error('No user_id in custom_data');

        const variantId = attributes.variant_id.toString();
        const planName  = getPlanNameFromVariant(variantId);
        const plan      = await prisma.plan.findUnique({ where: { name: planName } });

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
            currentPeriodEnd:    attributes.renews_at  ? new Date(attributes.renews_at)  : undefined,
            cancelAtPeriodEnd:   attributes.ends_at !== null && attributes.ends_at !== undefined,
            lsCustomerId:        attributes.customer_id.toString(),
          },
          create: {
            userId,
            planId:              plan.id,
            status:              attributes.status,
            currentPeriodStart:  attributes.created_at ? new Date(attributes.created_at) : undefined,
            currentPeriodEnd:    attributes.renews_at  ? new Date(attributes.renews_at)  : undefined,
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

    // ── 4. Log event to DB ───────────────────────────────────────────────────
    if (userId) {
      const customer = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId } });
      if (customer) {
        await prisma.lemonSqueezyEvent.create({
          data: {
            customerId: customer.id,
            eventName:  eventName,
            lsEventId:  payload.meta.event_id || `evt_${Date.now()}_${Math.random()}`,
            payload:    JSON.stringify(payload)
          }
        }).catch(() => {}); // ignore duplicate lsEventId (idempotency)
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    logger.error('webhook', 'processing-error', { requestId: req.requestId, error: err });
    res.status(500).send('Webhook error');
  }
};
