const mongoose = require('mongoose');

const swipeActionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['left', 'right', 'up'], // left = pass, right = interested, up = super like
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for user swipe history
swipeActionSchema.index({ user_id: 1, match_id: 1 }, { unique: true });
swipeActionSchema.index({ user_id: 1, timestamp: -1 });
swipeActionSchema.index({ match_id: 1, direction: 1 });

module.exports = mongoose.model('MSSwipeAction', swipeActionSchema, 'ms_swipe_actions');


