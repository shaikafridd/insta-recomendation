/**
 * Engagement-Weighted Scoring Engine
 * Computes deterministic engagement signals across watch time, replays, likes, and skips.
 */

const ENGAGEMENT_THRESHOLD = 1.5;

/**
 * Computes engagement score from interaction signals
 * Formula: score = (watchPercent / 100) + (replayCount * 0.5) + (isLiked ? 1.5 : 0) - (isSkipped ? 1 : 0)
 * @param {Object} interaction
 * @returns {number}
 */
const computeEngagementScore = (interaction = {}) => {
  const watchPercent = Number(interaction.watchPercent) || 0;
  const replayCount = Number(interaction.replayCount) || (interaction.eventType === 'replay' ? 1 : 0);
  const isLiked = interaction.eventType === 'like';
  const isSkipped = interaction.eventType === 'skip' || (watchPercent < 20 && !isLiked && replayCount === 0);

  const watchScore = Math.min(1.2, watchPercent / 100);
  const replayScore = replayCount * 0.5;
  const likeBonus = isLiked ? 1.5 : 0;
  const skipPenalty = isSkipped ? 1.0 : 0;

  const score = watchScore + replayScore + likeBonus - skipPenalty;
  return Number(score.toFixed(2));
};

/**
 * Determines whether the interaction crossed the threshold to trigger a Groq recommendation run
 * @param {number} score
 * @returns {boolean}
 */
const shouldTriggerRecommendation = (score) => {
  return score >= ENGAGEMENT_THRESHOLD;
};

/**
 * Determines the primary trigger signal for logging
 * @param {Object} interaction
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
