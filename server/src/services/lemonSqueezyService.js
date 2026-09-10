const { lemonSqueezySetup, createCheckout, getCustomer, getSubscription } = require('@lemonsqueezy/lemonsqueezy.js');

class LemonSqueezyService {
  constructor() {
    this.apiKey = process.env.LS_API_KEY;
    this.storeId = process.env.LS_STORE_ID;
    
    if (this.apiKey) {
      lemonSqueezySetup({ apiKey: this.apiKey });
    }
  }

  /**
   * Creates a checkout session for a specific variant (Plan)
   */
  async createCheckoutSession(variantId, userId, userEmail) {
    if (!this.apiKey || !this.storeId) {
      throw new Error('LemonSqueezy is not configured (missing LS_API_KEY or LS_STORE_ID)');
    }

    // parseInt on a malformed env var (empty, whitespace, non-numeric) silently
    // yields NaN, which JSON.stringify turns into `null` in the request body —
    // LemonSqueezy then rejects the whole checkout with an opaque 422
    // "Unprocessable Entity" that gives no hint it was actually a config
    // problem. Catch it here with a specific, actionable message instead.
    const numericStoreId = parseInt(this.storeId, 10);
    const numericVariantId = parseInt(variantId, 10);
    if (!Number.isFinite(numericStoreId)) {
      throw new Error(`LS_STORE_ID is not a valid number: "${this.storeId}"`);
    }
    if (!Number.isFinite(numericVariantId)) {
      throw new Error(`Configured LemonSqueezy variant id is not a valid number: "${variantId}"`);
    }

    try {
      const { data, error } = await createCheckout(
        numericStoreId,   // SDK requires numeric store ID
        numericVariantId, // SDK requires numeric variant ID
        {
          checkoutData: {
            email: userEmail,
            custom: {
              user_id: userId,
            },
          },
          productOptions: {
            redirectUrl:         `${process.env.WEB_UI_URL}/dashboard?billing=success`,
            receiptButtonText:   'Go to Dashboard',
            receiptThankYouNote: 'Thank you for upgrading AntCapture!',
          }
        }
      );

      if (error) {
        // The SDK's error.message is often just the HTTP status text (e.g.
        // "Unprocessable Entity"), which tells you a request was rejected
        // but not why. Surface whatever additional detail the SDK attached
        // (cause / body / JSON:API error list) so it isn't silently dropped.
        const detail = error.cause ?? error.body ?? error.errors ?? null;
        const detailStr = detail ? ` — ${JSON.stringify(detail)}` : '';
        throw new Error(`LemonSqueezy API error: ${error.message}${detailStr}`);
      }

      if (!data?.data?.attributes?.url) {
        throw new Error('LemonSqueezy returned no checkout URL');
      }

      return data.data.attributes.url;
    } catch (err) {
      console.error('LemonSqueezy Checkout Error:', err);
      throw err;
    }
  }

  /**
   * Fetches the latest subscription status directly from LemonSqueezy API
   */
  async fetchSubscription(lsSubscriptionId) {
    if (!this.apiKey) return null;
    try {
      const { data, error } = await getSubscription(lsSubscriptionId);
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      console.error('Fetch Subscription Error:', err);
      return null;
    }
  }
}

module.exports = new LemonSqueezyService();
