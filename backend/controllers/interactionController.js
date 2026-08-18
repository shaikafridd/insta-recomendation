const { Interaction } = require('../models/Interaction');
const { Reel } = require('../models/Reel');
const profileService = require('../services/profileService');
const {
  computeEngagementScore,
  shouldTriggerRecommendation,
  getTriggerSignal
} = require('../services/engagement');
const {
  recommendFromSameCategory,
  triggerDebouncedRecommendation
} = require('../services/recommendationService');

const AppError = require('../utils/AppError');

/**
 * Log a user interaction with a reel and conditionally trigger engagement-weighted recommendations
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const logInteraction = async (req, res, next) => {
  try {
    const { userId, reelId, eventType, watchPercent, dwellMs, replayCount, timestamp } =
      req.validatedBody;

    // 1. Verify reel exists
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return next(AppError.notFound(`Reel with ID ${reelId} was not found`));
    }

    // 2. Save Interaction Record
    const interaction = await Interaction.create({
      userId,
      reelId,
      eventType,
      watchPercent: watchPercent || 0,
      dwellMs: dwellMs || 0,
      replayCount: replayCount || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // 3. Compute Engagement Score
    const engagementScore = computeEngagementScore({
      watchPercent: interaction.watchPercent,
      replayCount: interaction.replayCount,
      eventType: interaction.eventType
    });

    let triggeredAction = 'none';

    // 4. Engagement Path Branching (Token Saver)
    if (eventType === 'like') {
      // Path A: Like is the highest priority signal -> Recommend from same category
      triggeredAction = 'recommend_same_category';
      setImmediate(async () => {
        try {
          await recommendFromSameCategory(userId, reel);
          profileService.refreshUserProfileAsync(userId);
        } catch (err) {
          console.error(`[InteractionController] Same category rec error: ${err.message}`);
        }
      });
    } else if (shouldTriggerRecommendation(engagementScore)) {
      // Path B: Score threshold crossed (e.g. >= 1.5 due to high watch% or replay) -> debounced recommendation
      const signal = getTriggerSignal(interaction);
      triggeredAction = `recommend_interest_${signal}`;
      triggerDebouncedRecommendation(userId, reel, signal);
      profileService.refreshUserProfileAsync(userId);
    } else {
      // Path C: Weak signal (watched once briefly or skipped) -> Logged only, NO Groq call
      triggeredAction = 'logged_only_token_saved';
    }

    return res.status(201).json({
      success: true,
      message: 'Interaction logged successfully',
      data: interaction,
      engagement: {
        score: engagementScore,
        action: triggeredAction
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent interaction history for a user
 */
const getUserInteractions = async (req, res, next) => {
  try {
    const { userId } = req.validatedParams;
    const { limit = 20 } = req.query;

    const interactions = await Interaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .populate('reelId')
      .lean();

    return res.status(200).json({
      success: true,
      count: interactions.length,
      data: interactions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logInteraction,
  getUserInteractions
};
