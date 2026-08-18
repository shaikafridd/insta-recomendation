const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const streamifier = require('stream');

/**
 * Uploads a video buffer or stream to Cloudinary
 * @param {Buffer} fileBuffer - Video file buffer from Multer
 * @param {Object} options - Optional upload settings (folder, tags, etc.)
 * @returns {Promise<{ cloudinaryUrl: string, cloudinaryPublicId: string, duration?: number }>}
 */
const uploadVideo = async (fileBuffer, options = {}) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    if (env.NODE_ENV !== 'production') {
      const mockId = `mock_reel_${Date.now()}`;
      return {
        cloudinaryUrl: `https://res.cloudinary.com/demo/video/upload/${mockId}.mp4`,
        cloudinaryPublicId: mockId,
        duration: 15
      };
    }
    throw new Error('Cloudinary environment credentials are not configured');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: options.folder || 'reels',
        tags: options.tags || ['reels', 'education'],
        ...options
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary Upload Failed: ${error.message}`));
        }
        resolve({
          cloudinaryUrl: result.secure_url || result.url,
          cloudinaryPublicId: result.public_id,
          duration: result.duration
        });
      }
    );

    const bufferStream = new streamifier.PassThrough();
    bufferStream.end(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Fetch all video resources currently stored in Cloudinary
 * @param {number} maxResults
 * @returns {Promise<Array<Object>>}
 */
const fetchVideosFromCloudinary = async (maxResults = 50) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME is missing in .env. Please provide your Cloud Name to fetch videos directly from your Cloudinary account.'
    );
  }

  try {
    const result = await cloudinary.api.resources({
      resource_type: 'video',
      type: 'upload',
      max_results: maxResults,
      tags: true,
      context: true
    });

    return (result.resources || []).map((item) => ({
      publicId: item.public_id,
      url: item.secure_url || item.url,
      format: item.format,
      bytes: item.bytes,
      duration: item.duration || 15,
      tags: item.tags || [],
      context: item.context || {},
      createdAt: item.created_at
    }));
  } catch (error) {
    throw new Error(`Cloudinary API Error: ${error.message}`);
  }
};

/**
 * Deletes a video from Cloudinary
 * @param {string} publicId
 */
const deleteVideo = async (publicId) => {
  if (!env.CLOUDINARY_CLOUD_NAME || publicId.startsWith('mock_')) {
    return { result: 'ok' };
  }
  return await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
};

module.exports = {
  uploadVideo,
  fetchVideosFromCloudinary,
  deleteVideo
};
