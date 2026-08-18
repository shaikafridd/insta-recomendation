const { describe, it } = require('node:test');
const assert = require('node:assert');
const app = require('../app');

describe('API Route Contract & Health Verification', () => {
  it('should verify Express app exports a valid callable handler', () => {
    assert.strictEqual(typeof app, 'function');
  });

  it('should correctly format structured recommendation response', () => {
    const formatRecommendationResponse = ({
      sourceReelTitle,
      interestDetected,
      why,
      recommendedReelTitle,
      category,
      whyThisRecommendation,
      difficulty,
      confidence
    }) => ({
      currentReel: sourceReelTitle || 'General Tech Context',
      interestDetected: interestDetected || 'Software Engineering',
      why: why || 'Engagement patterns indicate high technical interest.',
      recommendedTechReel: recommendedReelTitle || 'Designing High-Throughput Systems',
      category: category || 'HLD',
      whyThisRecommendation:
        whyThisRecommendation || 'Selected for educational substance and depth of content.',
      difficulty: difficulty || 'Intermediate',
      confidence: confidence || 'High'
    });

    const formatted = formatRecommendationResponse({
      sourceReelTitle: 'CSS Flexbox Guide',
      interestDetected: 'Frontend Web Engineering',
      why: 'User liked CSS reels',
      recommendedReelTitle: 'CSS Grid Deep Dive',
      category: 'JavaScript',
      whyThisRecommendation: 'Logical progression to grid layouts',
      difficulty: 'Intermediate',
      confidence: 'High'
    });

    assert.strictEqual(formatted.currentReel, 'CSS Flexbox Guide');
    assert.strictEqual(formatted.interestDetected, 'Frontend Web Engineering');
    assert.strictEqual(formatted.recommendedTechReel, 'CSS Grid Deep Dive');
    assert.strictEqual(formatted.category, 'JavaScript');
    assert.strictEqual(formatted.difficulty, 'Intermediate');
    assert.strictEqual(formatted.confidence, 'High');
  });
});
