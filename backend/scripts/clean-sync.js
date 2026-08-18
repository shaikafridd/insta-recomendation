const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

const mongoose = require('mongoose');
const env = require('../config/env');
const cloudinary = require('../config/cloudinary');
const { Reel } = require('../models/Reel');
const groqService = require('../services/groqService');

const cleanAndSync = async () => {
  console.log('===========================================================');
  console.log('🧹 Clean & Re-Sync Active Cloudinary Reels to MongoDB Atlas');
  console.log('===========================================================');

  await mongoose.connect(env.MONGO_URI);
  console.log('[Atlas] Connected successfully');

  // Fetch all active video resources from Cloudinary API
  console.log('[Cloudinary] Fetching active video list...');
  const res = await cloudinary.api.resources({
    resource_type: 'video',
    type: 'upload',
    max_results: 50
  });

  const activeVideos = res.resources || [];
  console.log(`[Cloudinary] Found ${activeVideos.length} active videos.`);

  const activePublicIds = activeVideos.map((v) => v.public_id);

  // Remove any obsolete Cloudinary entries in DB that no longer exist in Cloudinary
  const deletedOld = await Reel.deleteMany({
    cloudinaryPublicId: { $nin: activePublicIds, $not: /^sample_/ }
  });
  console.log(`[Cleanup] Removed ${deletedOld.deletedCount} outdated/deleted reel entries.`);

  // Sync active videos
  for (let i = 0; i < activeVideos.length; i++) {
    const video = activeVideos[i];
    console.log(`[${i + 1}/${activeVideos.length}] Processing: "${video.public_id}"...`);

    let existing = await Reel.findOne({ cloudinaryPublicId: video.public_id });
    if (existing) {
      // Update secure_url if version changed
      if (existing.cloudinaryUrl !== video.secure_url) {
        existing.cloudinaryUrl = video.secure_url;
        await existing.save();
        console.log(`  🔄 Updated URL to: ${video.secure_url}`);
      } else {
        console.log(`  ✓ Up-to-date: "${existing.title}"`);
      }
      continue;
    }

    // Generate fresh metadata with Groq
    const metadata = await groqService.generateReelMetadata({
      publicId: video.public_id,
      url: video.secure_url,
      tags: video.tags || [],
      format: video.format,
      duration: video.duration || 15
    });

    const created = await Reel.create({
      title: metadata.title,
      topic: metadata.topic,
      caption: metadata.caption,
      cloudinaryUrl: video.secure_url,
      cloudinaryPublicId: video.public_id,
      category: metadata.category,
      difficulty: metadata.difficulty,
      tags: video.tags || [],
      hashtags: metadata.hashtags,
      isHypeBait: metadata.isHypeBait
    });

    console.log(`  ✅ Synced: "${created.title}"`);
    console.log(`     • Topic: ${created.topic}`);
    console.log(`     • Category: ${created.category}`);
    console.log(`     • Hashtags: ${created.hashtags.join(' ')}`);
    console.log(`     • Secure URL: ${created.cloudinaryUrl}\n`);
  }

  const finalCount = await Reel.countDocuments();
  console.log('===========================================================');
  console.log(`🎉 Sync complete! Total active reels in MongoDB Atlas: ${finalCount}`);
  console.log('===========================================================');
  process.exit(0);
};

cleanAndSync().catch((err) => {
  console.error('[Error]:', err.message);
  process.exit(1);
});
