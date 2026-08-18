const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { userIdParamSchema, validateParams } = require('../validators/schemas');

const router = express.Router();

/**
 * @route   GET /recommendations/:userId
 * @desc    Generate structured recommendation based on inferred interest
 */
router.get(
  '/recommendations/:userId',
  validateParams(userIdParamSchema),
  recommendationController.getRecommendation
);

/**
 * @route   GET /interest-profile/:userId
 * @desc    Inspect cached or computed user interest profile
 */
router.get(
  '/interest-profile/:userId',
  validateParams(userIdParamSchema),
  recommendationController.getInterestProfile
);

module.exports = router;
