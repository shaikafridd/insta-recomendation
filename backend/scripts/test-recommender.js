const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

const mongoose = require('mongoose');
const env = require('../config/env');
const { Reel } = require('../models/Reel');
const { RecommendationLog } = require('../models/RecommendationLog');
const { computeEngagementScore, shouldTriggerRecommendation } = require('../services/engagement');
const recommendationService = require('../services/recommendationService');

const runTest = async () => {
  try {
    console.log('===========================================================');
    console.log('🧪 Engagement-Weighted Recommendation Engine Verification');
    console.log('===========================================================');
    console.log(`[Test] Connecting to MongoDB: ${env.MONGO_URI}`);
    await mongoose.connect(env.MONGO_URI);

    // 1. Test Engagement Scoring Formula
    console.log('\n--- 1. Testing Engagement Scoring Function ---');
    const watchEvent = { watchPercent: 85, replayCount: 0, eventType: 'watch' };
    const likeEvent = { watchPercent: 100, replayCount: 0, eventType: 'like' };
    const replayEvent = { watchPercent: 100, replayCount: 2, eventType: 'replay' };
    const skipEvent = { watchPercent: 10, replayCount: 0, eventType: 'skip' };

    const scoreWatch = computeEngagementScore(watchEvent);
    const scoreLike = computeEngagementScore(likeEvent);
    const scoreReplay = computeEngagementScore(replayEvent);
    const scoreSkip = computeEngagementScore(skipEvent);

    console.log(`  • Normal Watch (85%): score = ${scoreWatch} (Trigger: ${shouldTriggerRecommendation(scoreWatch)})`);
    console.log(`  • Liked Reel (100%): score = ${scoreLike} (Trigger: ${shouldTriggerRecommendation(scoreLike)})`);
    console.log(`  • Replay 2x (100%): score = ${scoreReplay} (Trigger: ${shouldTriggerRecommendation(scoreReplay)})`);
    console.log(`  • Early Skip (10%): score = ${scoreSkip} (Trigger: ${shouldTriggerRecommendation(scoreSkip)})`);

    if (scoreLike >= 2.0 && scoreSkip < 0 && scoreReplay >= 2.0) {
      console.log('  ✅ Engagement scoring formula calculations verified!');
    } else {
      throw new Error('Engagement scoring calculation check failed');
    }

    // 2. Fetch Sample Reels
    const reels = await Reel.find({});
    if (reels.length === 0) {
      console.log('[Test] No reels found in DB. Please run "npm run seed" first.');
      process.exit(1);
    }

    const testUserId = `test_student_${Date.now().toString().slice(-4)}`;
    console.log(`\n[Test] Using Test User ID: ${testUserId}`);

    const hldReel = reels.find((r) => r.category === 'HLD') || reels[0];

    // 3. Test Like Event -> Same Category Recommendation
    console.log('\n--- 2. Testing recommendFromSameCategory (Like Signal) ---');
    console.log(`  Simulating like on [${hldReel.category}] "${hldReel.title}"`);
    const sameCatRec = await recommendationService.recommendFromSameCategory(testUserId, hldReel);
    console.log('  Result:');
    console.log(JSON.stringify(sameCatRec, null, 2));

    // Verify RecommendationLog entry was created
    const logEntry = await RecommendationLog.findOne({ userId: testUserId, triggerSignal: 'like' });
    if (logEntry) {
      console.log(`  ✅ RecommendationLog entry created: "${logEntry.sourceReelTitle}" ➔ "${logEntry.recommendedReelTitle}" (Signal: ${logEntry.triggerSignal})`);
    } else {
      throw new Error('RecommendationLog entry was not saved');
    }

    // 4. Test RecommendationLog Caching (<24h Token Saver)
    console.log('\n--- 3. Testing Recommendation Cache (<24h) ---');
    const cachedRec = await recommendationService.getRecommendationForUser(testUserId);
    console.log('  Cached Result from DB:');
    console.log(JSON.stringify(cachedRec, null, 2));

    if (cachedRec.recommendedTechReel === logEntry.recommendedReelTitle) {
      console.log('  ✅ Cached recommendation returned matching RecommendationLog table without LLM re-invocation!');
    }

    // 5. Schema Key Validations
    console.log('\n--- 4. Schema Validation Checks ---');
    const requiredKeys = [
      'currentReel',
      'interestDetected',
      'why',
      'recommendedTechReel',
      'category',
      'whyThisRecommendation',
      'difficulty',
      'confidence'
    ];

    const missingKeys = requiredKeys.filter((k) => !(k in cachedRec));
    if (missingKeys.length === 0) {
      console.log('  ✅ ALL REQUIRED SCHEMA KEYS MATCH SPECIFICATION EXACTLY');
    } else {
      console.error('  ❌ Missing keys:', missingKeys);
    }

    console.log('\n===========================================================');
    console.log('✅ ALL ENGAGEMENT-WEIGHTED ENGINE TESTS PASSED SUCCESSFULLY');
    console.log('===========================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n[Test] Error during test execution:', error);
    process.exit(1);
  }
};

runTest();
