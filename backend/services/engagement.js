/**
 * Engagement-Weighted Scoring Engine
 * Computes deterministic engagement signals across watch time, replays, likes, and skips.
 */

const { ENGAGEMENT_CONFIG } = require('../constants');

const ENGAGEMENT_THRESHOLD = ENGAGEMENT_CONFIG.THRESHOLD;

/**
 * Computes engagement score from interaction signals
 * Formula: score = (watchPercent / 100) + (replayCount * 0.5) + (isLiked ? 1.5 : 0) - (isSkipped ? 1 : 0)
 * @param {Object} interaction - Telemetry interaction payload
 * @param {number} [interaction.watchPercent=0] - Percentage of video watched (0-100+)
 * @param {number} [interaction.replayCount=0] - Replay count
 * @param {'watch'|'like'|'skip'|'replay'|'share'} [interaction.eventType='watch'] - Event classification
 * @returns {number} Deterministic engagement score rounded to 2 decimal places
 */
const computeEngagementScore = (interaction = {}) => {
  const watchPercent = Number(interaction.watchPercent) || 0;
  const replayCount = Number(interaction.replayCount) || (interaction.eventType === 'replay' ? 1 : 0);
  const isLiked = interaction.eventType === 'like';
  const isSkipped = interaction.eventType === 'skip' || (watchPercent < 20 && !isLiked && replayCount === 0);

  const watchScore = Math.min(ENGAGEMENT_CONFIG.MAX_WATCH_SCORE, watchPercent / 100);
  const replayScore = replayCount * ENGAGEMENT_CONFIG.REPLAY_WEIGHT;
  const likeBonus = isLiked ? ENGAGEMENT_CONFIG.LIKE_BONUS : 0;
  const skipPenalty = isSkipped ? ENGAGEMENT_CONFIG.SKIP_PENALTY : 0;

  const score = watchScore + replayScore + likeBonus - skipPenalty;
  return Number(score.toFixed(2));
};

/**
 * Determines whether the interaction crossed the threshold to trigger a Groq recommendation run
 * @param {number} score - Computed engagement score
 * @returns {boolean} True if threshold is crossed (>= 1.5)
 */
const shouldTriggerRecommendation = (score) => {
  return score >= ENGAGEMENT_THRESHOLD;
};

/**
 * Determines the primary trigger signal for logging
 * @param {Object} interaction - Telemetry payload
 * @returns {'like' | 'replay' | 'watchtime'}
 */
const getTriggerSignal = (interaction = {}) => {
  if (interaction.eventType === 'like') return 'like';
  if ((interaction.replayCount && interaction.replayCount > 0) || interaction.eventType === 'replay') {
    return 'replay';
  }
  return 'watchtime';
};

module.exports = {
  computeEngagementScore,
  shouldTriggerRecommendation,
  getTriggerSignal,
  ENGAGEMENT_THRESHOLD
};
