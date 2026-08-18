const { Reel } = require('../models/Reel');
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
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch all reels with optional category & isHypeBait filtering
 */
const getAllReels = async (req, res, next) => {
  try {
    const { category, isHypeBait, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (isHypeBait !== undefined) filter.isHypeBait = isHypeBait === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const reels = await Reel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Reel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: reels
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
