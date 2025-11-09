const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Who is being reviewed
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  revieweeRole: {
    type: String,
    enum: ['player', 'coach', 'specialist', 'club'],
    required: true
  },

  // Who is writing the review
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewerRole: {
    type: String,
    enum: ['player', 'coach', 'specialist', 'club'],
    required: true
  },

  // Related to what
  relatedTo: {
    entityType: {
      type: String,
      enum: ['training_session', 'consultation_session', 'club_membership'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },

  // Rating
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  // Review content
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  reviewAr: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Detailed ratings (optional)
  detailedRatings: {
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    expertise: {
      type: Number,
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Response from reviewee
  response: {
    text: String,
    textAr: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  helpfulVotes: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['helpful', 'not_helpful']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Moderation
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: String,
  reportedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHidden: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ revieweeId: 1, rating: -1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ 'relatedTo.entityId': 1 });
reviewSchema.index({ isHidden: 1, isDeleted: 1 });
reviewSchema.index({ revieweeId: 1, reviewerId: 1, 'relatedTo.entityId': 1 }, { unique: true });

// Statics

// Get reviews for a reviewee
reviewSchema.statics.getReviewsForReviewee = async function(revieweeId, options = {}) {
  const { page = 1, limit = 20, minRating, sort = '-createdAt' } = options;

  const query = {
    revieweeId,
    isHidden: false,
    isDeleted: false
  };

  if (minRating) {
    query.rating = { $gte: minRating };
  }

  const reviews = await this.find(query)
    .populate('reviewerId', 'firstName lastName profileImage')
    .sort(sort)
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  // Calculate rating statistics
  const stats = await this.aggregate([
    { $match: { revieweeId: new mongoose.Types.ObjectId(revieweeId), isHidden: false, isDeleted: false } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        },
        avgProfessionalism: { $avg: '$detailedRatings.professionalism' },
        avgCommunication: { $avg: '$detailedRatings.communication' },
        avgExpertise: { $avg: '$detailedRatings.expertise' },
        avgPunctuality: { $avg: '$detailedRatings.punctuality' },
        avgValue: { $avg: '$detailedRatings.value' }
      }
    }
  ]);

  // Calculate rating distribution
  let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (stats[0] && stats[0].ratingDistribution) {
    stats[0].ratingDistribution.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });
  }

  return {
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit),
    statistics: stats[0] ? {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
      ratingDistribution,
      detailedAverages: {
        professionalism: stats[0].avgProfessionalism ? Math.round(stats[0].avgProfessionalism * 10) / 10 : null,
        communication: stats[0].avgCommunication ? Math.round(stats[0].avgCommunication * 10) / 10 : null,
        expertise: stats[0].avgExpertise ? Math.round(stats[0].avgExpertise * 10) / 10 : null,
        punctuality: stats[0].avgPunctuality ? Math.round(stats[0].avgPunctuality * 10) / 10 : null,
        value: stats[0].avgValue ? Math.round(stats[0].avgValue * 10) / 10 : null
      }
    } : null
  };
};

// Get reviews written by a user
reviewSchema.statics.getReviewsByUser = async function(reviewerId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const reviews = await this.find({ reviewerId, isDeleted: false })
    .populate('revieweeId', 'firstName lastName profileImage')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments({ reviewerId, isDeleted: false });

  return {
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Check if user can review
reviewSchema.statics.canUserReview = async function(reviewerId, revieweeId, entityId) {
  // Check if review already exists
  const existingReview = await this.findOne({
    reviewerId,
    revieweeId,
    'relatedTo.entityId': entityId,
    isDeleted: false
  });

  return !existingReview;
};

// Methods

// Add helpful vote
reviewSchema.methods.addHelpfulVote = function(userId, voteType) {
  // Remove existing vote if any
  this.helpfulVotes = this.helpfulVotes.filter(v => v.userId.toString() !== userId.toString());

  // Add new vote
  this.helpfulVotes.push({
    userId,
    vote: voteType,
    votedAt: new Date()
  });

  // Update counts
  this.helpfulCount = this.helpfulVotes.filter(v => v.vote === 'helpful').length;
  this.notHelpfulCount = this.helpfulVotes.filter(v => v.vote === 'not_helpful').length;

  return this.save();
};

// Add response from reviewee
reviewSchema.methods.addResponse = function(userId, responseText, responseTextAr) {
  // Only reviewee can respond
  if (this.revieweeId.toString() !== userId.toString()) {
    throw new Error('Only the reviewee can respond to this review');
  }

  this.response = {
    text: responseText,
    textAr: responseTextAr,
    respondedAt: new Date(),
    respondedBy: userId
  };

  return this.save();
};

// Report review
reviewSchema.methods.reportReview = function(userId, reason) {
  this.isReported = true;
  this.reportedBy.push({
    userId,
    reason,
    reportedAt: new Date()
  });

  return this.save();
};

// Hide review (admin function)
reviewSchema.methods.hideReview = function() {
  this.isHidden = true;
  return this.save();
};

// Soft delete
reviewSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

// Post-save hook to update profile statistics
reviewSchema.post('save', async function(doc) {
  if (doc.isDeleted || doc.isHidden) return;

  // Update reviewee's profile statistics
  const revieweeRole = doc.revieweeRole;
  let ProfileModel;

  if (revieweeRole === 'player') {
    ProfileModel = mongoose.model('PlayerProfile');
  } else if (revieweeRole === 'coach') {
    ProfileModel = mongoose.model('CoachProfile');
  } else if (revieweeRole === 'specialist') {
    ProfileModel = mongoose.model('SpecialistProfile');
  } else if (revieweeRole === 'club') {
    ProfileModel = mongoose.model('ClubProfile');
  }

  if (!ProfileModel) return;

  // Calculate new rating statistics
  const stats = await mongoose.model('Review').aggregate([
    {
      $match: {
        revieweeId: doc.revieweeId,
        isHidden: false,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats[0]) {
    const avgRating = Math.round(stats[0].averageRating * 10) / 10;
    const totalReviews = stats[0].totalReviews;

    // Update the appropriate fields based on role
    if (revieweeRole === 'player') {
      await ProfileModel.findOneAndUpdate(
        { userId: doc.revieweeId },
        {
          'ratingStats.averageRating': avgRating,
          'ratingStats.totalReviews': totalReviews
        }
      );
    } else {
      await ProfileModel.findOneAndUpdate(
        { userId: doc.revieweeId },
        {
          'rating.average': avgRating,
          'rating.count': totalReviews
        }
      );
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);
