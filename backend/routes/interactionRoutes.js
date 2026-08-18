const express = require('express');
const interactionController = require('../controllers/interactionController');
const {
  createInteractionSchema,
  userIdParamSchema,
  validateBody,
  validateParams
} = require('../validators/schemas');

const router = express.Router();

/**
 * @route   POST /interactions
 * @desc    Log a user interaction event
 */
router.post(
  '/',
  validateBody(createInteractionSchema),
  interactionController.logInteraction
);

/**
 * @route   GET /interactions/:userId
 * @desc    Get user's recent interactions
 */
router.get(
  '/:userId',
  validateParams(userIdParamSchema),
  interactionController.getUserInteractions
);

module.exports = router;
