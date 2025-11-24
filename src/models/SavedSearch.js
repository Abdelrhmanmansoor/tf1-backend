const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    searchQuery: {
      type: String,
      trim: true,
    },

    searchType: {
      type: String,
      enum: [
        'users',
        'coaches',
        'players',
        'specialists',
        'clubs',
        'jobs',
        'all',
      ],
      required: true,
    },

    filters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    notifyOnNewResults: {
      type: Boolean,
      default: false,
    },

    lastNotificationSent: Date,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
savedSearchSchema.index({ userId: 1, isActive: 1 });

// Statics

// Get active saved searches for a user
savedSearchSchema.statics.getActiveSearches = async function (userId) {
  return this.find({
    userId,
    isActive: true,
  }).sort({ createdAt: -1 });
};

// Methods

// Toggle active status
savedSearchSchema.methods.toggleActive = function () {
  this.isActive = !this.isActive;
  return this.save();
};

// Update last notification sent
savedSearchSchema.methods.markNotificationSent = function () {
  this.lastNotificationSent = new Date();
  return this.save();
};

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
