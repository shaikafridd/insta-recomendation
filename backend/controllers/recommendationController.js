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

/**
 * GET /recommendations/stream/:userId
 * Server-Sent Events (SSE) stream for live AI recommendation updates
 */
const streamRecommendations = async (req, res, next) => {
  try {
    const { userId } = req.validatedParams;

    // Set SSE HTTP response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial connection handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: new Date() })}\n\n`);

    // Register active SSE client
    recommendationService.registerSseClient(userId, res);

    // Keep connection alive with a 30s heartbeat comment
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeatTimer);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterestProfile,
  getRecommendation,
  streamRecommendations
};
