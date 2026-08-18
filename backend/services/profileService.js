const { Interaction } = require('../models/Interaction');
const cache = require('../config/redis');
const groqService = require('./groqService');

const { CACHE_CONFIG } = require('../constants');

const PROFILE_CACHE_TTL_SECONDS = CACHE_CONFIG.REDIS_PROFILE_TTL_SECONDS; // 1 hour TTL
const RECENT_INTERACTIONS_LIMIT = 15;

/**
 * Get or compute user's interest profile
 * @param {string} userId
 * @param {boolean} forceRefresh - If true, recomputes profile even if cached
 * @returns {Promise<Object>}
 */
const getUserInterestProfile = async (userId, forceRefresh = false) => {
  const cacheKey = `profile:${userId}`;

  if (!forceRefresh) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[ProfileService] Cache read error for user ${userId}: ${err.message}`);
    }
  }

  // Fetch last N interactions joined with Reel metadata
  const recentInteractions = await Interaction.find({ userId })
    .sort({ timestamp: -1 })
    .limit(RECENT_INTERACTIONS_LIMIT)
    .populate('reelId')
    .lean();

  // If no reelId populated or empty, still provide safe inference
  const validInteractions = recentInteractions.filter((item) => item.reelId);

  const inference = await groqService.inferInterest(validInteractions);

  const profile = {
    userId,
    primaryInterest: inference.primaryInterest,
    evidence: inference.evidence,
    confidence: inference.confidence,
    updatedAt: new Date().toISOString()
  };

  // Cache to Redis with TTL
  try {
    await cache.set(cacheKey, JSON.stringify(profile), 'EX', PROFILE_CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn(`[ProfileService] Cache write error for user ${userId}: ${err.message}`);
  }

  return profile;
};

/**
 * Asynchronously refresh a user's interest profile (used by interaction event logger)
 * @param {string} userId
 */
const refreshUserProfileAsync = (userId) => {
  setImmediate(async () => {
    try {
      await getUserInterestProfile(userId, true);
      console.log(`[ProfileService] Refreshed interest profile for user: ${userId}`);
    } catch (err) {
      console.error(`[ProfileService] Async refresh failed for user ${userId}:`, err.message);
    }
  });
};

module.exports = {
  getUserInterestProfile,
  refreshUserProfileAsync,
  PROFILE_CACHE_TTL_SECONDS
};
