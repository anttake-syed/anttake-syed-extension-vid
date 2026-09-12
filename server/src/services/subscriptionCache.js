/**
 * In-memory TTL cache for user subscription status.
 * Reduces DB queries on heavily polled endpoints.
 */

// userId -> { timestamp, data }
const cache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

function getCachedSubscription(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  
  return entry.data;
}

function setCachedSubscription(userId, data) {
  cache.set(userId, {
    timestamp: Date.now(),
    data
  });
}

function invalidateSubscriptionCache(userId) {
  cache.delete(userId);
}

module.exports = {
  getCachedSubscription,
  setCachedSubscription,
  invalidateSubscriptionCache
};
