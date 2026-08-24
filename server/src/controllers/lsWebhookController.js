const crypto = require('crypto');
const prisma = require('../db/index');

const WEBHOOK_SECRET = process.env.LS_WEBHOOK_SECRET;

exports.handleWebhook = async (req, res) => {
  try {
    // 1. Verify Signature
    // Note: req.body MUST be raw Buffer here. Ensure `express.raw({type: 'application/json'})` is used for this route in index.js.
    const secret = WEBHOOK_SECRET || '';
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      console.error('Invalid LemonSqueezy webhook signature');
      return res.status(403).send('Invalid signature');
    }

    // 2. Parse payload
    const payload = JSON.parse(req.body.toString());
    const eventName = payload.meta.event_name;
    const obj = payload.data;
    const attributes = obj.attributes;
    const customData = payload.meta.custom_data;

    console.log(`[Webhook] Received LemonSqueezy Event: ${eventName}`);

    // 3. Process events
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const userId = customData?.user_id;
      if (!userId) {
        throw new Error('No user_id found in custom_data');
      }

      // Map variant ID to our Plan ID
      const variantId = attributes.variant_id.toString();
      
      // Determine plan name based on variant (assuming env vars configured)
      let planName = 'free';
      if (variantId === process.env.LS_VARIANT_BASIC_MONTHLY || variantId === process.env.LS_VARIANT_BASIC_YEARLY) planName = 'basic';
      if (variantId === process.env.LS_VARIANT_PRO_MONTHLY || variantId === process.env.LS_VARIANT_PRO_YEARLY) planName = 'pro';

      const plan = await prisma.plan.findUnique({ where: { name: planName } });

      if (plan) {
        // Upsert customer
        await prisma.lemonSqueezyCustomer.upsert({
          where: { userId },
          update: {
            lsCustomerId: attributes.customer_id.toString(),
            lsSubscriptionId: obj.id,
            lsVariantId: variantId,
          },
          create: {
            userId,
            lsCustomerId: attributes.customer_id.toString(),
            lsSubscriptionId: obj.id,
            lsVariantId: variantId,
          }
        });

        // Upsert subscription
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            planId: plan.id,
            status: attributes.status,
            currentPeriodEnd: new Date(attributes.renews_at),
            cancelAtPeriodEnd: attributes.ends_at !== null,
            lsCustomerId: attributes.customer_id.toString()
          },
          create: {
            userId,
            planId: plan.id,
            status: attributes.status,
            currentPeriodEnd: new Date(attributes.renews_at),
            lsCustomerId: attributes.customer_id.toString()
          }
        });
      }
    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const userId = customData?.user_id;
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { status: attributes.status }
        });
      }
    }

    // 4. Log event
    if (customData?.user_id) {
      const customer = await prisma.lemonSqueezyCustomer.findUnique({ where: { userId: customData.user_id }});
      if (customer) {
        await prisma.lemonSqueezyEvent.create({
          data: {
            customerId: customer.id,
            eventName: eventName,
            lsEventId: payload.meta.event_id || `evt_${Date.now()}`,
            payload: JSON.stringify(payload)
          }
        });
      }
    }

    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook error');
  }
};
