const { lemonSqueezySetup, createCheckout, getCustomer, getSubscription } = require('@lemonsqueezy/lemonsqueezy.js');

class LemonSqueezyService {
  constructor() {
    this.mode = process.env.LEMONSQUEEZY_MODE || 'test';
    this.apiKey = this.mode === 'live' 
      ? process.env.LEMONSQUEEZY_LIVE_API_KEY 
      : process.env.LEMONSQUEEZY_TEST_API_KEY;
    
    // Fallback to legacy LS_API_KEY if the new ones aren't set
    if (!this.apiKey) {
      this.apiKey = process.env.LS_API_KEY;
    }

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

    // redirectUrl was built by string-interpolating WEB_UI_URL directly with
    // no validation — an unset/empty/malformed env var (missing http(s)://,
    // stray whitespace, etc.) silently produces a garbage string like
    // "undefined/dashboard?billing=success", which LemonSqueezy rejects with
    // exactly the 422 "product_options.redirect_url field format is invalid"
    // this whole service was surfacing without explaining why. Validate it's
    // a real absolute URL first, and normalize away a trailing slash so we
    // don't produce a double slash when appending the path.
    let redirectUrl;
    try {
      const base = new URL(process.env.WEB_UI_URL);
      redirectUrl = `${base.origin}${base.pathname.replace(/\/$/, '')}/dashboard?billing=success`;
    } catch {
      throw new Error(`WEB_UI_URL is not a valid absolute URL: "${process.env.WEB_UI_URL}"`);
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
            redirectUrl,
            receiptButtonText:   'Go to Dashboard',
            receiptThankYouNote: 'Thank you for upgrading AntCapture!',
            enabledVariants:     [numericVariantId],
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
