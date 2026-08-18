const { describe, it } = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');

// 1. Test Engagement Formula
describe('Recommender Scoring Algorithm', () => {
  const calculateEngagementScore = ({ watchPercent = 0, replayCount = 0, isLiked = false, isSkipped = false }) => {
    return (watchPercent / 100) + (replayCount * 0.5) + (isLiked ? 1.5 : 0) - (isSkipped ? 1.0 : 0);
  };

  it('should score high for complete watch and like', () => {
    const score = calculateEngagementScore({ watchPercent: 100, isLiked: true });
    assert.strictEqual(score, 2.5);
    assert.ok(score >= 1.5, 'Score should trigger recommendation');
  });

  it('should score high for replays', () => {
    const score = calculateEngagementScore({ watchPercent: 100, replayCount: 2 });
    assert.strictEqual(score, 2.0);
    assert.ok(score >= 1.5, 'Score should trigger recommendation');
  });

  it('should penalize skipped reels', () => {
    const score = calculateEngagementScore({ watchPercent: 10, isSkipped: true });
    assert.strictEqual(score, -0.9);
    assert.ok(score < 1.5, 'Score should not trigger recommendation');
  });

  it('should handle zero engagement without throwing', () => {
    const score = calculateEngagementScore({});
    assert.strictEqual(score, 0);
  });

  it('should accurately detect threshold boundary at exactly 1.5', () => {
    const threshold = 1.5;
    const scoreA = calculateEngagementScore({ watchPercent: 100, replayCount: 1 }); // 1.0 + 0.5 = 1.5
    assert.strictEqual(scoreA >= threshold, true);

    const scoreB = calculateEngagementScore({ watchPercent: 90, replayCount: 1 }); // 0.9 + 0.5 = 1.4
    assert.strictEqual(scoreB >= threshold, false);
  });
});

// 2. Test Anti-Hype Filter
describe('Anti-Hype Filter', () => {
  const isHypeBaitTitle = (title, caption = '') => {
    const hypeKeywords = [
      'instantly',
      'get hired',
      'secret trick',
      'earn $',
      'millionaire',
      '10x developer in 5 mins',
      'don\'t want you to know',
      'clickbait',
      'easy money'
    ];
    const text = `${title} ${caption}`.toLowerCase();
    return hypeKeywords.some((kw) => text.includes(kw));
  };

  it('should flag clickbait titles with "get hired instantly"', () => {
    const result = isHypeBaitTitle('10 AI Tools That Will Get You Hired Instantly!', 'Secret trick developers use');
    assert.strictEqual(result, true);
  });

  it('should flag clickbait titles with "10x developer in 5 mins"', () => {
    const result = isHypeBaitTitle('Become a 10x Developer in 5 mins without coding');
    assert.strictEqual(result, true);
  });

  it('should pass substantive educational titles', () => {
    const result = isHypeBaitTitle('Designing a Distributed Rate Limiter with Token Bucket', 'System design interview deep dive');
    assert.strictEqual(result, false);
  });

  it('should pass Cloudinary and Web performance optimization tutorials', () => {
    const result = isHypeBaitTitle('Optimizing MP4 Video Streams with Adaptive Bitrate Streaming');
    assert.strictEqual(result, false);
  });
});

// 3. Test Groq Recommendation Output Schema
describe('Groq Recommendation Schema Validation', () => {
  const RecommendationSchema = z.object({
    currentReel: z.string().min(1),
    interestDetected: z.string().min(1),
    why: z.string().min(1),
    recommendedTechReel: z.string().min(1),
    category: z.string().min(1),
    whyThisRecommendation: z.string().min(1),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    confidence: z.enum(['High', 'Medium', 'Low'])
  });

  it('should validate standard recommendation payload', () => {
    const mockPayload = {
      currentReel: 'Flexbox Centering Trick',
      interestDetected: 'Frontend Web Engineering',
      why: 'User liked and completed multiple CSS layout reels.',
      recommendedTechReel: 'Mastering CSS Grid Template Areas',
      category: 'JavaScript',
      whyThisRecommendation: 'Provides natural progression into complex 2D responsive layouts.',
      difficulty: 'Intermediate',
      confidence: 'High'
    };

    const parsed = RecommendationSchema.safeParse(mockPayload);
    assert.strictEqual(parsed.success, true);
  });

  it('should reject invalid schema payload missing mandatory fields', () => {
    const invalidPayload = {
      currentReel: '',
      difficulty: 'SuperHard'
    };

    const parsed = RecommendationSchema.safeParse(invalidPayload);
    assert.strictEqual(parsed.success, false);
  });
});

// 4. Test Interest Profile Ingestion & Weighting
describe('Interest Profile Aggregation', () => {
  const aggregateCategoryScores = (interactions) => {
    const categoryTotals = {};
    for (const item of interactions) {
      const score = (item.watchPercent / 100) + (item.isLiked ? 1.5 : 0) - (item.isSkipped ? 1.0 : 0);
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + score;
    }
    return Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  };

  it('should identify top technical domain cluster accurately', () => {
    const interactions = [
      { category: 'AI', watchPercent: 100, isLiked: true, isSkipped: false },
      { category: 'AI', watchPercent: 90, isLiked: true, isSkipped: false },
      { category: 'JavaScript', watchPercent: 20, isLiked: false, isSkipped: true }
    ];

    const ranked = aggregateCategoryScores(interactions);
    assert.strictEqual(ranked[0][0], 'AI');
    assert.ok(ranked[0][1] > 4.0);
  });

  it('should properly calculate multi-category interaction profiles', () => {
    const interactions = [
      { category: 'HLD', watchPercent: 100, isLiked: true, isSkipped: false },
      { category: 'Cloud', watchPercent: 80, isLiked: false, isSkipped: false },
      { category: 'DSA', watchPercent: 100, isLiked: false, isSkipped: false }
    ];

    const ranked = aggregateCategoryScores(interactions);
    assert.strictEqual(ranked[0][0], 'HLD'); // HLD has 1.0 + 1.5 = 2.5
    assert.strictEqual(ranked[1][0], 'DSA'); // DSA has 1.0
    assert.strictEqual(ranked[2][0], 'Cloud'); // Cloud has 0.8
  });
});
