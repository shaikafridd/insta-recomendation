const mongoose = require('mongoose');

const CATEGORIES = [
  'AI',
  'DSA',
  'JavaScript',
  'HLD',
  'Cybersecurity',
  'Cloud',
  'Hardware',
  'Career',
  'Entertainment',
  'Other'
];

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const ReelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reel title is required'],
      trim: true
    },
    caption: {
      type: String,
      trim: true,
      default: ''
    },
    transcript: {
      type: String,
      trim: true,
      default: ''
    },
    cloudinaryUrl: {
      type: String,
      required: [true, 'Cloudinary URL is required']
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category'
      }
    },
    topic: {
      type: String,
      trim: true,
      default: 'General Tech'
    },
    difficulty: {
      type: String,
      enum: {
        values: DIFFICULTIES,
        message: '{VALUE} is not a valid difficulty'
      },
      default: 'Beginner'
    },
    tags: {
      type: [String],
      default: []
    },
    hashtags: {
      type: [String],
      default: []
    },
    isHypeBait: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

ReelSchema.index({ category: 1, isHypeBait: 1 });
ReelSchema.index({ createdAt: -1 });

module.exports = {
  Reel: mongoose.model('Reel', ReelSchema),
  CATEGORIES,
  DIFFICULTIES
};
