const express = require('express');
const multer = require('multer');
const reelController = require('../controllers/reelController');
const { createReelSchema, validateBody } = require('../validators/schemas');

const router = express.Router();

// Configure multer memory storage for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max video size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Middleware to parse body if multipart form data was sent
const parseFormDataBody = (req, res, next) => {
  if (req.body && typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch (e) {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim());
    }
  }
  next();
};

/**
 * @route   POST /reels
 * @desc    Upload video to Cloudinary & create Reel doc
 */
router.post(
  '/',
  upload.single('video'),
  parseFormDataBody,
  validateBody(createReelSchema),
  reelController.createReel
);

/**
 * @route   GET /reels
 * @desc    List catalog reels with pagination & filter
 */
router.get('/', reelController.getAllReels);

/**
 * @route   POST /reels/sync-cloudinary
 * @desc    Fetch reels from Cloudinary, generate titles/topics/hashtags with Groq, and save to DB
 */
router.post('/sync-cloudinary', reelController.syncCloudinaryReels);

/**
 * @route   GET /reels/:id/stream
 * @desc    Stream video through backend proxy
 */
router.get('/:id/stream', reelController.streamVideo);

/**
 * @route   GET /reels/:id
 * @desc    Get single reel by ID
 */
router.get('/:id', reelController.getReelById);

module.exports = router;
