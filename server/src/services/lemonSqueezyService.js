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
      throw new Error('LemonSqueezy is not configured');
    }

    try {
      const { data, error } = await createCheckout(this.storeId, variantId, {
        checkoutData: {
          email: userEmail,
          custom: {
            user_id: userId,
          },
        },
        productOptions: {
          redirectUrl: `${process.env.WEB_UI_URL}/dashboard?billing=success`,
          receiptButtonText: 'Go to Dashboard',
          receiptThankYouNote: 'Thank you for upgrading AntCapture!'
        }
      });

      if (error) {
        throw new Error(error.message);
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
