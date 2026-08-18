const profileService = require('../services/profileService');
const recommendationService = require('../services/recommendationService');

/**
 * GET /interest-profile/:userId
 * Returns cached interest profile or computes it now
 */
const getInterestProfile = async (req, res, next) => {
  try {
    const { userId } = req.validatedParams;
    const forceRefresh = req.query.refresh === 'true';

    const profile = await profileService.getUserInterestProfile(userId, forceRefresh);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /recommendations/:userId
 * Main recommendation endpoint returning exact structured format
 */
const getRecommendation = async (req, res, next) => {
  try {
    const { userId } = req.validatedParams;

    const recommendation = await recommendationService.getRecommendationForUser(userId);

    // Return exact schema required
    return res.status(200).json(recommendation);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterestProfile,
  getRecommendation
};
