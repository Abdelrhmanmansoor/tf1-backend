const Review = require('../models/Review');
const User = require('../modules/shared/models/User');
const { createNotification } = require('./notificationController');

// @desc    Create a new review
// @route   POST /api/v1/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const {
      revieweeId,
      revieweeRole,
      relatedTo,
      rating,
      title,
      review,
      reviewAr,
      detailedRatings,
    } = req.body;

    // Validation
    if (!revieweeId || !revieweeRole || !relatedTo || !rating || !review) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if user can review (no duplicate reviews)
    const canReview = await Review.canUserReview(
      req.user._id,
      revieweeId,
      relatedTo.entityId
    );

    if (!canReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this entity',
      });
    }

    // Create review
    const newReview = await Review.create({
      revieweeId,
      revieweeRole,
      reviewerId: req.user._id,
      reviewerRole: req.user.role,
      relatedTo,
      rating,
      title,
      review,
      reviewAr,
      detailedRatings,
    });

    // Populate reviewer info
    await newReview.populate('reviewerId', 'firstName lastName avatar');

    // Create notification for reviewee
    await createNotification({
      userId: revieweeId,
      userRole: revieweeRole,
      type: 'review_received',
      title: 'New Review Received',
      titleAr: 'تم استلام تقييم جديد',
      message: `${req.user.firstName} ${req.user.lastName} left you a ${rating}-star review`,
      messageAr: `${req.user.firstName} ${req.user.lastName} ترك لك تقييم ${rating} نجوم`,
      relatedTo: {
        entityType: 'review',
        entityId: newReview._id,
      },
      actionUrl: `/reviews/${newReview._id}`,
      priority: rating <= 2 ? 'high' : 'normal',
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a coach
// @route   GET /api/v1/reviews/coach/:coachId
// @access  Public
exports.getCoachReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating, sort } = req.query;

    const result = await Review.getReviewsForReviewee(req.params.coachId, {
      page: parseInt(page),
      limit: parseInt(limit),
      minRating: minRating ? parseInt(minRating) : undefined,
      sort,
    });

    res.status(200).json({
      success: true,
      count: result.reviews.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statistics: result.statistics,
      data: result.reviews,
    });
  } catch (error) {
    console.error('Error fetching coach reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching coach reviews',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a specialist
// @route   GET /api/v1/reviews/specialist/:specialistId
// @access  Public
exports.getSpecialistReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating, sort } = req.query;

    const result = await Review.getReviewsForReviewee(req.params.specialistId, {
      page: parseInt(page),
      limit: parseInt(limit),
      minRating: minRating ? parseInt(minRating) : undefined,
      sort,
    });

    res.status(200).json({
      success: true,
      count: result.reviews.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statistics: result.statistics,
      data: result.reviews,
    });
  } catch (error) {
    console.error('Error fetching specialist reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching specialist reviews',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a club
// @route   GET /api/v1/reviews/club/:clubId
// @access  Public
exports.getClubReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating, sort } = req.query;

    const result = await Review.getReviewsForReviewee(req.params.clubId, {
      page: parseInt(page),
      limit: parseInt(limit),
      minRating: minRating ? parseInt(minRating) : undefined,
      sort,
    });

    res.status(200).json({
      success: true,
      count: result.reviews.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statistics: result.statistics,
      data: result.reviews,
    });
  } catch (error) {
    console.error('Error fetching club reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching club reviews',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a player
// @route   GET /api/v1/reviews/player/:playerId
// @access  Public
exports.getPlayerReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, minRating, sort } = req.query;

    const result = await Review.getReviewsForReviewee(req.params.playerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      minRating: minRating ? parseInt(minRating) : undefined,
      sort,
    });

    res.status(200).json({
      success: true,
      count: result.reviews.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statistics: result.statistics,
      data: result.reviews,
    });
  } catch (error) {
    console.error('Error fetching player reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching player reviews',
      error: error.message,
    });
  }
};

// @desc    Get reviews written by a user
// @route   GET /api/v1/reviews/user/:userId
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await Review.getReviewsByUser(req.params.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: result.reviews.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      data: result.reviews,
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reviews',
      error: error.message,
    });
  }
};

// @desc    Get single review by ID
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate('reviewerId', 'firstName lastName avatar')
      .populate('revieweeId', 'firstName lastName avatar');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: error.message,
    });
  }
};

// @desc    Update review (within 24 hours of creation)
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      reviewerId: req.user._id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if review is within 24 hours
    const timeDiff = Date.now() - review.createdAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be edited within 24 hours of creation',
      });
    }

    // Update allowed fields
    const {
      rating,
      title,
      review: reviewText,
      reviewAr,
      detailedRatings,
    } = req.body;

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (reviewText !== undefined) review.review = reviewText;
    if (reviewAr !== undefined) review.reviewAr = reviewAr;
    if (detailedRatings !== undefined) review.detailedRatings = detailedRatings;

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message,
    });
  }
};

// @desc    Delete review (own review only)
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      reviewerId: req.user._id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await review.softDelete();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message,
    });
  }
};

// @desc    Add response to review (reviewee only)
// @route   POST /api/v1/reviews/:id/response
// @access  Private
exports.addResponse = async (req, res) => {
  try {
    const { text, textAr } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user is the reviewee
    if (review.revieweeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the reviewee can respond to this review',
      });
    }

    await review.addResponse(req.user._id, text, textAr);

    // Notify reviewer about the response
    await createNotification({
      userId: review.reviewerId,
      userRole: review.reviewerRole,
      type: 'review_received',
      title: 'Response to Your Review',
      titleAr: 'رد على تقييمك',
      message: `${req.user.firstName} ${req.user.lastName} responded to your review`,
      messageAr: `${req.user.firstName} ${req.user.lastName} رد على تقييمك`,
      relatedTo: {
        entityType: 'review',
        entityId: review._id,
      },
      actionUrl: `/reviews/${review._id}`,
      priority: 'normal',
    });

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message,
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Private
exports.markAsHelpful = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await review.addHelpfulVote(req.user._id, 'helpful');

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: {
        helpfulCount: review.helpfulCount,
        notHelpfulCount: review.notHelpfulCount,
      },
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking review as helpful',
      error: error.message,
    });
  }
};

// @desc    Mark review as not helpful
// @route   POST /api/v1/reviews/:id/not-helpful
// @access  Private
exports.markAsNotHelpful = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await review.addHelpfulVote(req.user._id, 'not_helpful');

    res.status(200).json({
      success: true,
      message: 'Feedback recorded',
      data: {
        helpfulCount: review.helpfulCount,
        notHelpfulCount: review.notHelpfulCount,
      },
    });
  } catch (error) {
    console.error('Error marking review as not helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording feedback',
      error: error.message,
    });
  }
};

// @desc    Report a review
// @route   POST /api/v1/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Report reason is required',
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await review.reportReview(req.user._id, reason);

    res.status(200).json({
      success: true,
      message: 'Review reported successfully. Our team will review it.',
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting review',
      error: error.message,
    });
  }
};

// @desc    Get review statistics for a reviewee
// @route   GET /api/v1/reviews/:revieweeId/statistics
// @access  Public
exports.getReviewStatistics = async (req, res) => {
  try {
    const result = await Review.getReviewsForReviewee(req.params.revieweeId, {
      limit: 1,
    });

    res.status(200).json({
      success: true,
      data: result.statistics,
    });
  } catch (error) {
    console.error('Error fetching review statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review statistics',
      error: error.message,
    });
  }
};
