/**
 * System Constants - Frozen and Immutable
 * Central source of truth for categories, difficulties, event types, and algorithms.
 */

const CATEGORIES = Object.freeze([
  'AI',
  'DSA',
  'JavaScript',
  'HLD',
  'Cybersecurity',
  'Cloud',
  'Hardware',
  'Career',
  'Other'
]);

const DIFFICULTIES = Object.freeze(['Beginner', 'Intermediate', 'Advanced']);

const EVENT_TYPES = Object.freeze(['watch', 'like', 'skip', 'replay', 'share']);

const ENGAGEMENT_CONFIG = Object.freeze({
  THRESHOLD: 1.5,
  WATCH_WEIGHT: 1.0,
  REPLAY_WEIGHT: 0.5,
  LIKE_BONUS: 1.5,
  SKIP_PENALTY: 1.0,
  MAX_WATCH_SCORE: 1.2
});

const CACHE_CONFIG = Object.freeze({
  DB_REC_VALIDITY_MS: 24 * 60 * 60 * 1000, // 24 hours
  REDIS_PROFILE_TTL_SECONDS: 3600, // 1 hour
  EXCLUSION_WINDOW_DAYS: 7,
  DEBOUNCE_DELAY_MS: 5000
});

const RATE_LIMITS = Object.freeze({
  GENERAL_WINDOW_MS: 15 * 60 * 1000,
  GENERAL_MAX: 300,
  INTERACTIONS_WINDOW_MS: 60 * 1000,
  INTERACTIONS_MAX: 120,
  RECOMMENDATIONS_WINDOW_MS: 60 * 1000,
  RECOMMENDATIONS_MAX: 60,
  SYNC_WINDOW_MS: 15 * 60 * 1000,
  SYNC_MAX: 10
});

module.exports = {
  CATEGORIES,
  DIFFICULTIES,
  EVENT_TYPES,
  ENGAGEMENT_CONFIG,
  CACHE_CONFIG,
  RATE_LIMITS
};
