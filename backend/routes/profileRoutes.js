const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { userIdParamSchema, validateParams } = require('../validators/schemas');

const router = express.Router();

/**
 * @route   GET /:userId OR /interest-profile/:userId
 * @desc    Inspect cached or computed user interest profile
 */
router.get(
  ['/:userId', '/interest-profile/:userId'],
  validateParams(userIdParamSchema),
  recommendationController.getInterestProfile
);

module.exports = router;
