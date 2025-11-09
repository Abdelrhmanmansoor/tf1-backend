const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  }

}, {
  timestamps: true
});

// Compound index to prevent duplicate blocks
blockedUserSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });

// Statics

// Check if user is blocked
blockedUserSchema.statics.isBlocked = async function(userId, otherUserId) {
  const block = await this.findOne({
    $or: [
      { userId, blockedUserId: otherUserId, isActive: true },
      { userId: otherUserId, blockedUserId: userId, isActive: true }
    ]
  });

  return !!block;
};

// Get blocked users list
blockedUserSchema.statics.getBlockedUsers = async function(userId) {
  return this.find({
    userId,
    isActive: true
  }).populate('blockedUserId', 'firstName lastName avatar role');
};

// Block user
blockedUserSchema.statics.blockUser = async function(userId, blockedUserId, reason) {
  return this.findOneAndUpdate(
    { userId, blockedUserId },
    {
      userId,
      blockedUserId,
      reason,
      isActive: true
    },
    {
      upsert: true,
      new: true
    }
  );
};

// Unblock user
blockedUserSchema.statics.unblockUser = async function(userId, blockedUserId) {
  return this.findOneAndUpdate(
    { userId, blockedUserId },
    { isActive: false },
    { new: true }
  );
};

module.exports = mongoose.model('BlockedUser', blockedUserSchema);
