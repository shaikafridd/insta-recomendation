const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createInteractionSchema, createReelSchema } = require('../validators/schemas');

describe('Security & Input Sanitization Suite', () => {
  it('should reject interaction payloads with missing userId', () => {
    const invalidPayload = {
      reelId: '65b9f71c4f1c2b001a1e8001',
      eventType: 'like'
    };

    const parsed = createInteractionSchema.safeParse(invalidPayload);
    assert.strictEqual(parsed.success, false);
    assert.ok(parsed.error.errors.some((e) => e.path.includes('userId')));
  });

  it('should reject interaction payloads with invalid MongoDB ObjectId format', () => {
    const maliciousPayload = {
      userId: 'student_123',
      reelId: 'invalid_id_not_24_hex',
      eventType: 'watch',
      watchPercent: 50
    };

    const parsed = createInteractionSchema.safeParse(maliciousPayload);
    assert.strictEqual(parsed.success, false);
    assert.ok(parsed.error.errors.some((e) => e.path.includes('reelId')));
  });

  it('should reject disallowed eventType values', () => {
    const maliciousPayload = {
      userId: 'student_123',
      reelId: '65b9f71c4f1c2b001a1e8001',
      eventType: 'DROP TABLE reels;'
    };

    const parsed = createInteractionSchema.safeParse(maliciousPayload);
    assert.strictEqual(parsed.success, false);
  });

  it('should reject invalid categories in reel creation schema', () => {
    const invalidReel = {
      title: 'Valid Title',
      category: 'UnauthorizedHackingCategory'
    };

    const parsed = createReelSchema.safeParse(invalidReel);
    assert.strictEqual(parsed.success, false);
  });

  it('should sanitize NoSQL injection keys starting with $ or containing dots', () => {
    const sanitizeInput = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeInput);
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanKey = key.replace(/^\$|\./g, '');
        sanitized[cleanKey] = sanitizeInput(value);
      }
      return sanitized;
    };

    const injectionAttempt = {
      $gt: '',
      'nested.key': 'val',
      userId: 'student_99'
    };

    const cleaned = sanitizeInput(injectionAttempt);
    assert.strictEqual(cleaned.$gt, undefined);
    assert.strictEqual(cleaned.gt, '');
    assert.strictEqual(cleaned.userId, 'student_99');
    assert.strictEqual(Object.keys(cleaned).includes('$gt'), false);
  });
});
