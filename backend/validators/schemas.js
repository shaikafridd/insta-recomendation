const { z } = require('zod');
const { CATEGORIES, DIFFICULTIES, EVENT_TYPES } = require('../constants');

// Custom validator for MongoDB ObjectId string (24 hexadecimal characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod Schema for Reel creation and validation
 */
const createReelSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  topic: z.string().trim().optional().default('General Tech'),
  caption: z.string().trim().optional().default(''),
  transcript: z.string().trim().optional().default(''),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` })
  }),
  difficulty: z.enum(DIFFICULTIES).optional().default('Beginner'),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val.split(',').map((t) => t.trim()).filter(Boolean);
    }),
  hashtags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val.split(',').map((t) => t.trim()).filter(Boolean);
    }),
  isHypeBait: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
      return false;
    }),
  cloudinaryUrl: z.string().url().optional(),
  cloudinaryPublicId: z.string().optional()
});

/**
 * Zod Schema for User Telemetry & Interaction logging
 */
const createInteractionSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  reelId: z.string().trim().regex(objectIdRegex, 'Invalid Reel ID format (must be 24-char ObjectId)'),
  eventType: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: `EventType must be one of: ${EVENT_TYPES.join(', ')}` })
  }),
  watchPercent: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined && val !== null ? Number(val) : 0))
    .refine((val) => !isNaN(val) && val >= 0 && val <= 1000, {
      message: 'watchPercent must be a positive number between 0 and 1000'
    }),
  dwellMs: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined && val !== null ? Number(val) : 0))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'dwellMs must be a positive number'
    }),
  replayCount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val !== undefined && val !== null ? Number(val) : 0))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'replayCount must be a positive number'
    }),
  timestamp: z.string().datetime().optional()
});

/**
 * Zod Schema for User ID URL parameters
 */
const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, 'User ID parameter is required')
});

/**
 * Higher-order middleware for validating request bodies against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    req.validatedBody = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

/**
 * Higher-order middleware for validating request URL parameters
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
const validateParams = (schema) => (req, res, next) => {
  try {
    req.validatedParams = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parameter Validation Error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

module.exports = {
  createReelSchema,
  createInteractionSchema,
  userIdParamSchema,
  validateBody,
  validateParams
};
