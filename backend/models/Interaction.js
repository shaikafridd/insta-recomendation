const mongoose = require('mongoose');

const EVENT_TYPES = ['watch', 'like', 'skip', 'replay', 'share'];

const InteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true
    },
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: [true, 'Reel ID is required'],
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: EVENT_TYPES,
        message: '{VALUE} is not a valid event type'
      }
    },
    watchPercent: {
      type: Number,
      default: 0,
      min: 0
    },
    dwellMs: {
      type: Number,
      default: 0,
      min: 0
    },
    replayCount: {
      type: Number,
      default: 0,
      min: 0
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

InteractionSchema.index({ userId: 1, timestamp: -1 });

module.exports = {
  Interaction: mongoose.model('Interaction', InteractionSchema),
  EVENT_TYPES
};
