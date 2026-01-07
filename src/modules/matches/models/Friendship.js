const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  friend_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
    index: true
  },
  requested_at: {
    type: Date,
    default: Date.now
  },
  accepted_at: Date,
  common_matches: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes
friendshipSchema.index({ user_id: 1, friend_id: 1 }, { unique: true });
friendshipSchema.index({ user_id: 1, status: 1 });
friendshipSchema.index({ friend_id: 1, status: 1 });

module.exports = mongoose.model('MSFriendship', friendshipSchema, 'ms_friendships');

