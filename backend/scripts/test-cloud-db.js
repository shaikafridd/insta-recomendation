const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

const mongoose = require('mongoose');
const env = require('../config/env');
const { Reel } = require('../models/Reel');
const { Interaction } = require('../models/Interaction');
const { RecommendationLog } = require('../models/RecommendationLog');

const testCloudDB = async () => {
  console.log('===========================================================');
  console.log('☁️ MongoDB Atlas Cloud Database Connection & Write Test');
  console.log('===========================================================');
  console.log(`[Connecting] URI: ${env.MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);

  try {
    const startTime = Date.now();
    const conn = await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    const latency = Date.now() - startTime;

    console.log(`\n✅ Connected to Atlas in ${latency}ms!`);
    console.log(`  • Host: ${conn.connection.host}`);
    console.log(`  • Database Name: ${conn.connection.name}`);
    console.log(`  • ReadyState: ${conn.connection.readyState} (1 = Connected)`);

    // Ping the admin DB
    const adminDb = conn.connection.db.admin();
    const pingResult = await adminDb.ping();
    console.log(`  • Atlas Ping Result:`, pingResult);

    // Write a verified reel document to Cloud DB
    console.log('\n--- 1. Writing Data to Cloud DB ("reels" collection) ---');
    const testReel = await Reel.create({
      title: 'Distributed Event Sourcing & CQRS with Kafka and MongoDB',
      topic: 'Event Sourcing & CQRS Architecture',
      caption: 'Breaking down event-driven architectures and write/read model segregation #hld #kafka #mongodb #architecture',
      transcript: 'Event Sourcing stores state changes as an immutable sequence of events rather than current state snapshots. Coupled with CQRS, read queries query optimized denormalized views while writes append to the event log.',
      cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787034415/scrollwise_seed/seed_video_3.mp4',
      cloudinaryPublicId: `cloud_test_${Date.now()}`,
      category: 'HLD',
      difficulty: 'Advanced',
      tags: ['system-design', 'event-sourcing', 'cqrs', 'kafka', 'mongodb'],
      hashtags: ['#hld', '#kafka', '#mongodb', '#eventsourcing', '#systemdesign'],
      isHypeBait: false
    });
    console.log(`✅ Inserted Reel ID: ${testReel._id}`);
    console.log(`   Title: "${testReel.title}"`);
    console.log(`   Topic: ${testReel.topic}`);
    console.log(`   Hashtags: ${testReel.hashtags.join(' ')}`);

    // Write a verified interaction document to Cloud DB
    console.log('\n--- 2. Writing Data to Cloud DB ("interactions" collection) ---');
    const testInteraction = await Interaction.create({
      userId: 'cloud_test_student_1',
      reelId: testReel._id,
      eventType: 'like',
      watchPercent: 100,
      dwellMs: 45000,
      replayCount: 2
    });
    console.log(`✅ Inserted Interaction ID: ${testInteraction._id}`);
    console.log(`   User: ${testInteraction.userId} (Event: ${testInteraction.eventType}, Replays: ${testInteraction.replayCount})`);

    // Read back collection totals from Atlas
    console.log('\n--- 3. Verifying Cloud Database Collections & Document Counts ---');
    const totalReels = await Reel.countDocuments();
    const totalInteractions = await Interaction.countDocuments();
    const totalRecLogs = await RecommendationLog.countDocuments();

    console.log(`  📊 "reels" collection count:            ${totalReels} documents`);
    console.log(`  📊 "interactions" collection count:     ${totalInteractions} documents`);
    console.log(`  📊 "recommendationlogs" count:          ${totalRecLogs} documents`);

    // Sample latest 5 reels from Atlas
    console.log('\n--- 4. Latest 5 Reels in MongoDB Atlas: ---');
    const latestReels = await Reel.find().sort({ createdAt: -1 }).limit(5);
    latestReels.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.category}] "${r.title}" (Topic: ${r.topic || 'N/A'})`);
    });

    console.log('\n===========================================================');
    console.log('🎉 ALL CLOUD DB CONNECTION & WRITE TESTS PASSED PERFECTLY!');
    console.log('===========================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cloud DB Test Failed:', error.message);
    process.exit(1);
  }
};

testCloudDB();
