const mongoose = require('mongoose');

const interestedUserSchema = new mongoose.Schema({
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
  interested_at: {
    type: Date,
    default: Date.now
  },
  priority: {
    type: String,
    enum: ['normal', 'high'], // high for super likes
    default: 'normal'
  },
  super_like: {
    type: Boolean,
    default: false
  },
  notified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Unique constraint
interestedUserSchema.index({ user_id: 1, match_id: 1 }, { unique: true });
interestedUserSchema.index({ match_id: 1, priority: -1, interested_at: -1 });

module.exports = mongoose.model('MSInterestedUser', interestedUserSchema, 'ms_interested_users');

