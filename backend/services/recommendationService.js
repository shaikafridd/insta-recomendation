const { Reel } = require('../models/Reel');
const { Interaction } = require('../models/Interaction');
const { RecommendationLog } = require('../models/RecommendationLog');
const profileService = require('./profileService');
const groqService = require('./groqService');

const TECH_CATEGORIES = [
  'AI',
  'DSA',
  'JavaScript',
  'HLD',
  'Cybersecurity',
  'Cloud',
  'Hardware',
  'Career',
  'Other'
];

const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours cache window in DB
const RECENT_REC_EXCLUSION_DAYS = 7;

// In-memory debounce map for user recommendation triggers (5 seconds window)
const userDebounceTimers = new Map();

/**
 * Recommend a related reel from the same category following a Like event
 * @param {string} userId
 * @param {Object} sourceReel
 * @returns {Promise<Object>}
 */
const recommendFromSameCategory = async (userId, sourceReel) => {
  if (!sourceReel) return null;

  // 1. Get reel IDs already recommended to this user in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - RECENT_REC_EXCLUSION_DAYS * 24 * 60 * 60 * 1000);
  const recentLogs = await RecommendationLog.find({
    userId,
    createdAt: { $gte: sevenDaysAgo }
  })
    .select('recommendedReelId')
    .lean();

  const excludedReelIds = recentLogs.map((log) => log.recommendedReelId.toString());
  excludedReelIds.push(sourceReel._id.toString());

  // 2. Fetch candidate reels from the same category, excluding hype-bait & recently recommended
  let candidateReels = await Reel.find({
    category: sourceReel.category,
    _id: { $nin: excludedReelIds },
    isHypeBait: false
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // If no non-hype candidates left, allow any reel in same category except the source
  if (candidateReels.length === 0) {
    candidateReels = await Reel.find({
      category: sourceReel.category,
      _id: { $ne: sourceReel._id }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  // If still empty (only 1 reel exists in category), find top non-hype tech reel
  if (candidateReels.length === 0) {
    candidateReels = await Reel.find({
      _id: { $ne: sourceReel._id },
      isHypeBait: false
    })
      .limit(5)
      .lean();
  }

  // 3. Call Groq ranker for same-category reasoning
  const groqResult = await groqService.rankSameCategory(sourceReel, candidateReels);

  // Match recommended candidate ID
  const matchedCandidate =
    candidateReels.find(
      (r) => r.title.toLowerCase() === (groqResult.recommendedReelTitle || '').toLowerCase()
    ) || candidateReels[0] || sourceReel;

  const reasonWhy = `Triggered directly by a like interaction on "${sourceReel.title}". Focused on deepening expertise in ${sourceReel.category}.`;

  // 4. Save to RecommendationLog
  const logDoc = await RecommendationLog.create({
    userId,
    sourceReelId: sourceReel._id,
    sourceReelTitle: sourceReel.title,
    recommendedReelId: matchedCandidate._id,
    recommendedReelTitle: groqResult.recommendedReelTitle || matchedCandidate.title,
    category: groqResult.category || sourceReel.category,
    difficulty: groqResult.difficulty || matchedCandidate.difficulty || 'Intermediate',
    confidence: groqResult.confidence || 'High',
    reasonWhy,
    reasonWhyThis: groqResult.whyThisRecommendation,
    triggerSignal: 'like'
  });

  return await formatRecommendationResponse({
    sourceReelTitle: sourceReel.title,
    interestDetected: `${sourceReel.category} Domain Mastery`,
    why: reasonWhy,
    recommendedReelTitle: logDoc.recommendedReelTitle,
    category: logDoc.category,
    whyThisRecommendation: logDoc.reasonWhyThis,
    difficulty: logDoc.difficulty,
    confidence: logDoc.confidence
  });
};

/**
 * Recommend a reel based on inferred interest profile (for replay or watchtime signals)
 * @param {string} userId
 * @param {Object} sourceReel
 * @param {'replay'|'watchtime'} triggerSignal
 * @returns {Promise<Object>}
 */
const recommendFromInterestProfile = async (userId, sourceReel = null, triggerSignal = 'watchtime') => {
  // 1. Fetch / compute profile
  const profile = await profileService.getUserInterestProfile(userId);

  // 2. Resolve source reel context
  let currentReel = sourceReel;
  if (!currentReel) {
    const latestInteraction = await Interaction.findOne({ userId })
      .sort({ timestamp: -1 })
      .populate('reelId')
      .lean();
    currentReel = latestInteraction?.reelId || null;
  }

  // 3. Exclude reels recommended in last 7 days
  const sevenDaysAgo = new Date(Date.now() - RECENT_REC_EXCLUSION_DAYS * 24 * 60 * 60 * 1000);
  const recentLogs = await RecommendationLog.find({
    userId,
    createdAt: { $gte: sevenDaysAgo }
  })
    .select('recommendedReelId')
    .lean();

  const excludedReelIds = recentLogs.map((log) => log.recommendedReelId.toString());
  if (currentReel) excludedReelIds.push(currentReel._id.toString());

  // 4. Candidate reels
  let candidateReels = await Reel.find({
    category: { $in: TECH_CATEGORIES },
    _id: { $nin: excludedReelIds },
    isHypeBait: false
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (candidateReels.length === 0) {
    candidateReels = await Reel.find({
      category: { $in: TECH_CATEGORIES },
      ...(currentReel && { _id: { $ne: currentReel._id } })
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  // 5. Groq rankRecommendation
  const ranking = await groqService.rankRecommendation(profile, candidateReels, currentReel);

  const matchedCandidate =
    candidateReels.find(
      (r) => r.title.toLowerCase() === (ranking.recommendedTechReel || '').toLowerCase()
    ) || candidateReels[0];

  // 6. Save to RecommendationLog
  if (currentReel && matchedCandidate) {
    await RecommendationLog.create({
      userId,
      sourceReelId: currentReel._id,
      sourceReelTitle: currentReel.title,
      recommendedReelId: matchedCandidate._id,
      recommendedReelTitle: ranking.recommendedTechReel || matchedCandidate.title,
      category: ranking.category || matchedCandidate.category,
      difficulty: ranking.difficulty || matchedCandidate.difficulty,
      confidence: ranking.confidence || 'High',
      reasonWhy: ranking.why,
      reasonWhyThis: ranking.whyThisRecommendation,
      triggerSignal
    });
  }

  return await formatRecommendationResponse({
    sourceReelTitle: ranking.currentReel,
    interestDetected: ranking.interestDetected,
    why: ranking.why,
    recommendedReelTitle: ranking.recommendedTechReel,
    category: ranking.category,
    whyThisRecommendation: ranking.whyThisRecommendation,
    difficulty: ranking.difficulty,
    confidence: ranking.confidence
  });
};

/**
 * Main recommendation getter:
 * 1. Checks RecommendationLog table for recent (<24h) cached entry.
 * 2. If missing, runs fresh computation & stores to RecommendationLog.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getRecommendationForUser = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - CACHE_VALIDITY_MS);

  // 1. Check RecommendationLog DB cache first (Token Saver)
  const cachedLog = await RecommendationLog.findOne({
    userId,
    createdAt: { $gte: twentyFourHoursAgo }
  })
    .sort({ createdAt: -1 })
    .lean();

  if (cachedLog) {
    console.log(`[RecommendationEngine] Serving cached recommendation for ${userId} from DB (Saved Groq LLM Call)`);
    return await formatRecommendationResponse({
      sourceReelTitle: cachedLog.sourceReelTitle,
      interestDetected: `${cachedLog.category} Tech Cluster`,
      why: cachedLog.reasonWhy || `Previously deduced from user engagement (${cachedLog.triggerSignal} signal).`,
      recommendedReelTitle: cachedLog.recommendedReelTitle,
      category: cachedLog.category,
      whyThisRecommendation: cachedLog.reasonWhyThis,
      difficulty: cachedLog.difficulty,
      confidence: cachedLog.confidence
    });
  }

  // 2. If no recent entry, compute fresh
  console.log(`[RecommendationEngine] Computing fresh recommendation for ${userId}...`);
  return await recommendFromInterestProfile(userId, null, 'watchtime');
};

/**
 * Debounced background trigger for user recommendation refresh (5-second window)
 */
const triggerDebouncedRecommendation = (userId, sourceReel, triggerSignal = 'watchtime') => {
  if (userDebounceTimers.has(userId)) {
    clearTimeout(userDebounceTimers.get(userId));
  }

  const timer = setTimeout(async () => {
    userDebounceTimers.delete(userId);
    try {
      if (triggerSignal === 'like') {
        await recommendFromSameCategory(userId, sourceReel);
      } else {
        await recommendFromInterestProfile(userId, sourceReel, triggerSignal);
      }
      console.log(`[RecommendationEngine] Async recommendation generated for ${userId} (Signal: ${triggerSignal})`);
    } catch (err) {
      console.error(`[RecommendationEngine] Debounced trigger failed for ${userId}:`, err.message);
    }
  }, 5000);

  userDebounceTimers.set(userId, timer);
};

const formatRecommendationResponse = async ({
  sourceReelTitle,
  interestDetected,
  why,
  recommendedReelTitle,
  category,
  whyThisRecommendation,
  difficulty,
  confidence
}) => {
  // Lookup full reel document for video playback
  let recommendedReel = null;
  if (recommendedReelTitle) {
    recommendedReel = await Reel.findOne({
      title: { $regex: new RegExp(`^${escapeRegex(recommendedReelTitle)}$`, 'i') }
    }).lean();

    if (!recommendedReel) {
      recommendedReel = await Reel.findOne({
        category: category || 'Other',
        isHypeBait: false
      }).lean();
    }
  }

  // Fetch 3-4 related suggested reels from catalog for recommendation section
  const suggestedReels = await Reel.find({
    category: category || 'Other',
    ...(recommendedReel && { _id: { $ne: recommendedReel._id } }),
    isHypeBait: false
  })
    .limit(4)
    .lean();

  return {
    currentReel: sourceReelTitle || 'General Tech Context',
    interestDetected: interestDetected || 'Software Engineering',
    why: why || 'Engagement patterns indicate high technical interest.',
    recommendedTechReel: recommendedReelTitle || (recommendedReel ? recommendedReel.title : 'Designing High-Throughput Systems'),
    category: category || 'HLD',
    whyThisRecommendation:
      whyThisRecommendation || 'Selected for educational substance and depth of content.',
    difficulty: difficulty || 'Intermediate',
    confidence: confidence || 'High',
    recommendedReel: recommendedReel || null,
    suggestedReels: suggestedReels || []
  };
};

const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = {
  getRecommendationForUser,
  recommendFromSameCategory,
  recommendFromInterestProfile,
  triggerDebouncedRecommendation,
  TECH_CATEGORIES
};
