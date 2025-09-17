// backend/services/responseCache.js
const NodeCache = require('node-cache');

// Create cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Generate cache key for a request
 */
function generateCacheKey(message, dbId, userId) {
  return `ai_response_${userId}_${dbId || 'no_db'}_${Buffer.from(message).toString('base64').slice(0, 50)}`;
}

/**
 * Get cached response
 */
function getCachedResponse(message, dbId, userId) {
  const key = generateCacheKey(message, dbId, userId);
  return cache.get(key);
}

/**
 * Cache a response
 */
function cacheResponse(message, dbId, userId, response) {
  const key = generateCacheKey(message, dbId, userId);
  cache.set(key, response);
}

/**
 * Clear cache for a user
 */
function clearUserCache(userId) {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.includes(`_${userId}_`)) {
      cache.del(key);
    }
  });
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.flushAll();
}

module.exports = {
  getCachedResponse,
  cacheResponse,
  clearUserCache,
  clearAllCache
};
