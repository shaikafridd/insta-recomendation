const { Reel } = require('../models/Reel');
const { Interaction } = require('../models/Interaction');
const cloudinaryService = require('../services/cloudinaryService');
const groqService = require('../services/groqService');
const AppError = require('../utils/AppError');

/**
 * Upload reel to Cloudinary and create Reel document in MongoDB
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createReel = async (req, res, next) => {
  try {
    const data = req.validatedBody;
    let cloudinaryUrl = data.cloudinaryUrl;
    let cloudinaryPublicId = data.cloudinaryPublicId;

    // Handle file upload if present in multipart request
    if (req.file) {
      const uploadResult = await cloudinaryService.uploadVideo(req.file.buffer, {
        folder: 'reels_recommender',
        tags: data.tags || []
      });
      cloudinaryUrl = uploadResult.cloudinaryUrl;
      cloudinaryPublicId = uploadResult.cloudinaryPublicId;
    }

    if (!cloudinaryUrl || !cloudinaryPublicId) {
      return next(
        AppError.badRequest('A video file or valid cloudinaryUrl & cloudinaryPublicId must be provided')
      );
    }

    const reel = await Reel.create({
      title: data.title,
      topic: data.topic || 'General Tech',
      caption: data.caption,
      transcript: data.transcript,
      cloudinaryUrl,
      cloudinaryPublicId,
      category: data.category,
      difficulty: data.difficulty,
      tags: data.tags,
      hashtags: data.hashtags || [],
      isHypeBait: data.isHypeBait
    });

    return res.status(201).json({
      success: true,
      message: 'Reel created successfully',
      data: reel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all video assets from Cloudinary, auto-generate titles, topics & hashtags via Groq, and save to MongoDB
 */
const syncCloudinaryReels = async (req, res, next) => {
  try {
    console.log('[Sync] Fetching video resources from Cloudinary...');
    const videos = await cloudinaryService.fetchVideosFromCloudinary();

    if (!videos || videos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No video files found in your Cloudinary media library',
        syncedCount: 0,
        data: []
      });
    }

    console.log(`[Sync] Found ${videos.length} videos in Cloudinary. Processing with Groq LLM...`);
    const syncedReels = [];

    for (const video of videos) {
      // Check if already in MongoDB
      let existing = await Reel.findOne({ cloudinaryPublicId: video.publicId });

      if (existing) {
        syncedReels.push(existing);
        continue;
      }

      // Generate intelligent title, topic, category, caption, hashtags via Groq
      console.log(`[Sync] Generating metadata with Groq for video: "${video.publicId}"`);
      const metadata = await groqService.generateReelMetadata(video);

      const newReel = await Reel.create({
        title: metadata.title,
        topic: metadata.topic,
        caption: metadata.caption,
        cloudinaryUrl: video.url,
        cloudinaryPublicId: video.publicId,
        category: metadata.category,
        difficulty: metadata.difficulty,
        tags: video.tags || [],
        hashtags: metadata.hashtags,
        isHypeBait: metadata.isHypeBait
      });

      syncedReels.push(newReel);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${syncedReels.length} reels from Cloudinary`,
      syncedCount: syncedReels.length,
      data: syncedReels
    });
  } catch (error) {
    console.error('[Sync] Error syncing from Cloudinary:', error.message);
    next(error);
  }
};

/**
 * Helper to randomize/shuffle array for fresh refresh experiences
 * @param {Array} array
 * @returns {Array}
 */
const shuffleReels = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Fetch all reels with dynamic session randomization and study-mode anti-meme filtering
 */
const getAllReels = async (req, res, next) => {
  try {
    const { category, isHypeBait, userId, shuffle = 'true', limit = 50, page = 1 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (isHypeBait !== undefined) filter.isHypeBait = isHypeBait === 'true';

    // Check if user has liked study/educational reels
    let hasLikedStudyReel = false;
    const likedStudyCategories = [];

    if (userId) {
      const recentLikes = await Interaction.find({
        userId,
        eventType: 'like'
      })
        .populate('reelId')
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      for (const interaction of recentLikes) {
        const likedReel = interaction.reelId;
        if (likedReel && likedReel.category && likedReel.category !== 'Entertainment') {
          hasLikedStudyReel = true;
          if (!likedStudyCategories.includes(likedReel.category)) {
            likedStudyCategories.push(likedReel.category);
          }
        }
      }
    }

    // If user has liked study reels, STRICTLY filter out memes & entertainment!
    if (hasLikedStudyReel && !category) {
      filter.category = { $ne: 'Entertainment' };
      filter.isHypeBait = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    let reels = await Reel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // If user liked specific study categories, prioritize them first
    if (likedStudyCategories.length > 0) {
      const matchingReels = reels.filter((r) => likedStudyCategories.includes(r.category));
      const otherStudyReels = reels.filter((r) => !likedStudyCategories.includes(r.category));

      if (shuffle === 'true') {
        reels = [...shuffleReels(matchingReels), ...shuffleReels(otherStudyReels)];
      } else {
        reels = [...matchingReels, ...otherStudyReels];
      }
    } else if (shuffle === 'true') {
      reels = shuffleReels(reels);
    }

    const paginated = reels.slice(skip, skip + Number(limit));
    const total = reels.length;

    return res.status(200).json({
      success: true,
      total,
      studyModeActive: hasLikedStudyReel,
      likedCategories: likedStudyCategories,
      page: Number(page),
      limit: Number(limit),
      data: paginated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a single reel by ID
 */
const getReelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) {
      return next(AppError.notFound(`Reel with ID ${id} was not found`));
    }
    return res.status(200).json({ success: true, data: reel });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream video through backend proxy (bypassing any client-side ISP DNS blocks on Cloudinary)
 */
const streamVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id).lean();
    if (!reel || !reel.cloudinaryUrl) {
      return next(AppError.notFound(`Reel or video URL not found for ID ${id}`));
    }

    const videoUrl = reel.cloudinaryUrl;
    const headers = {};
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(videoUrl, { headers });
    if (!response.ok && response.status !== 206) {
      return res.status(response.status).json({ success: false, error: 'Failed to fetch video upstream' });
    }

    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      if (['content-type', 'content-length', 'accept-ranges', 'content-range'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    const { Readable } = require('stream');
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReel,
  syncCloudinaryReels,
  getAllReels,
  getReelById,
  streamVideo
};
