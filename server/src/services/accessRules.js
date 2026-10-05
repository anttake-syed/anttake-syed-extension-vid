/**
 * Single source of truth for "does this subscription grant paid access?".
 * Used by the entitlements endpoint (frontend gating), requireSubscription
 * (route gating) and the quota service, so they can never disagree.
 *
 * LemonSqueezy statuses: on_trial | active | paused | past_due | unpaid | cancelled | expired
 *   - on_trial            → access (trial of the paid plan)
 *   - active              → access
 *   - cancelled           → access until the period ends (LS grace period)
 *   - everything else     → no access
 */

const ACCESS_STATUSES = new Set(['active', 'on_trial']);

function subscriptionGrantsAccess(subscription) {
  if (!subscription) { return false; }
  const { status, currentPeriodEnd } = subscription;

  if (ACCESS_STATUSES.has(status)) { return true; }

  if (status === 'cancelled' && currentPeriodEnd) {
    return new Date(currentPeriodEnd).getTime() > Date.now();
  }

  return false;
}

/** Paid access to cloud features: an access-granting status on a non-free plan. */
function hasCloudAccess(subscription) {
  if (!subscriptionGrantsAccess(subscription)) { return false; }
  // Older rows may lack the plan include — fall back to status only.
  const planName = subscription.plan?.name;
  return planName === undefined || planName !== 'free';
}

module.exports = { ACCESS_STATUSES, subscriptionGrantsAccess, hasCloudAccess };
