const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { userIdParamSchema, validateParams } = require('../validators/schemas');

const router = express.Router();

/**
 * @route   GET /stream/:userId OR /recommendations/stream/:userId
 * @desc    Server-Sent Events (SSE) live recommendation stream
 */
router.get(
  ['/stream/:userId', '/recommendations/stream/:userId'],
  validateParams(userIdParamSchema),
  recommendationController.streamRecommendations
);

/**
 * @route   GET /:userId OR /recommendations/:userId
 * @desc    Generate structured recommendation based on inferred interest
 */
router.get(
  ['/:userId', '/recommendations/:userId'],
  validateParams(userIdParamSchema),
  recommendationController.getRecommendation
);

module.exports = router;
