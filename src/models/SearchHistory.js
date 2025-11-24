const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    searchQuery: {
      type: String,
      required: true,
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

    resultsCount: {
      type: Number,
      default: 0,
    },

    clickedResults: [
      {
        resultId: mongoose.Schema.Types.ObjectId,
        resultType: String,
        clickedAt: Date,
      },
    ],

    searchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
searchHistorySchema.index({ userId: 1, searchedAt: -1 });
searchHistorySchema.index({ searchQuery: 'text' });

// Statics

// Get recent search history for a user
searchHistorySchema.statics.getRecentSearches = async function (
  userId,
  limit = 10
) {
  return this.find({ userId })
    .sort({ searchedAt: -1 })
    .limit(limit)
    .select('searchQuery searchType resultsCount searchedAt');
};

// Get popular searches globally
searchHistorySchema.statics.getPopularSearches = async function (
  searchType,
  limit = 10
) {
  const match = searchType ? { searchType } : {};

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$searchQuery',
        count: { $sum: 1 },
        lastSearched: { $max: '$searchedAt' },
      },
    },
    { $sort: { count: -1, lastSearched: -1 } },
    { $limit: limit },
    {
      $project: {
        query: '$_id',
        count: 1,
        lastSearched: 1,
        _id: 0,
      },
    },
  ]);
};

// Clear old search history (older than 90 days)
searchHistorySchema.statics.clearOldHistory = async function (days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await this.deleteMany({
    searchedAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

// Methods

// Add clicked result
searchHistorySchema.methods.addClickedResult = function (resultId, resultType) {
  this.clickedResults.push({
    resultId,
    resultType,
    clickedAt: new Date(),
  });

  return this.save();
};

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
