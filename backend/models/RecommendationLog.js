const mongoose = require('mongoose');

const TRIGGER_SIGNALS = ['replay', 'like', 'watchtime'];

const RecommendationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true
    },
    sourceReelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true
    },
    sourceReelTitle: {
      type: String,
      required: true,
      trim: true
    },
    recommendedReelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true
    },
    recommendedReelTitle: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: 'Tech'
    },
    difficulty: {
      type: String,
      default: 'Intermediate'
    },
    confidence: {
      type: String,
      default: 'High'
    },
    reasonWhy: {
      type: String,
      default: ''
    },
    reasonWhyThis: {
      type: String,
      default: ''
    },
    triggerSignal: {
      type: String,
      required: true,
      enum: {
        values: TRIGGER_SIGNALS,
        message: '{VALUE} is not a valid trigger signal'
      }
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

RecommendationLogSchema.index({ userId: 1, createdAt: -1 });
RecommendationLogSchema.index({ userId: 1, sourceReelId: 1, createdAt: -1 });

module.exports = {
  RecommendationLog: mongoose.model('RecommendationLog', RecommendationLogSchema),
  TRIGGER_SIGNALS
};
