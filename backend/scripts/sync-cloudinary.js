const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const env = require('../config/env');
const { Reel } = require('../models/Reel');
const cloudinaryService = require('../services/cloudinaryService');
const groqService = require('../services/groqService');

const runSync = async () => {
  try {
    console.log('===========================================================');
    console.log('☁️ Cloudinary to MongoDB Reels Synchronization');
    console.log('===========================================================');
    console.log(`[Sync] Connecting to MongoDB: ${env.MONGO_URI}`);
    await mongoose.connect(env.MONGO_URI);

    console.log('[Sync] Fetching video resources from Cloudinary API...');
    const videos = await cloudinaryService.fetchVideosFromCloudinary();

    if (!videos || videos.length === 0) {
      console.log('[Sync] No video files found in your Cloudinary account.');
      console.log('[Sync] Tip: Upload videos to Cloudinary console, then run this sync command again.');
      process.exit(0);
    }

    console.log(`[Sync] Found ${videos.length} videos in Cloudinary.`);
    console.log('[Sync] Generating educational titles, topics, and hashtags via Groq Llama 3.3...\n');

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`[${i + 1}/${videos.length}] Processing: "${video.publicId}" (${video.duration}s)...`);

      // Check if already in MongoDB
      let existing = await Reel.findOne({ cloudinaryPublicId: video.publicId });

      if (existing) {
        console.log(`  ✓ Already in database: "${existing.title}" [Topic: ${existing.topic}]`);
        continue;
      }

      // Generate metadata with Groq
      const metadata = await groqService.generateReelMetadata(video);

      const created = await Reel.create({
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

      console.log(`  ✅ Synced & Created: "${created.title}"`);
      console.log(`     • Topic: ${created.topic}`);
      console.log(`     • Category: ${created.category} (${created.difficulty})`);
      console.log(`     • Hashtags: ${created.hashtags.join(' ')}`);
      console.log(`     • URL: ${created.cloudinaryUrl}\n`);
    }

    console.log('===========================================================');
    console.log('🎉 Cloudinary sync completed successfully!');
    console.log('===========================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n[Sync Error]:', error.message);
    if (error.message.includes('CLOUDINARY_CLOUD_NAME')) {
      console.error('👉 Please set CLOUDINARY_CLOUD_NAME in backend/.env to your Cloudinary cloud name.');
    }
    process.exit(1);
  }
};

runSync();
