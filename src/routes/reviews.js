const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/coach/:coachId', reviewController.getCoachReviews);
router.get('/specialist/:specialistId', reviewController.getSpecialistReviews);
router.get('/club/:clubId', reviewController.getClubReviews);
router.get('/player/:playerId', reviewController.getPlayerReviews);
router.get('/user/:userId', reviewController.getUserReviews);
router.get('/:revieweeId/statistics', reviewController.getReviewStatistics);
router.get('/:id', reviewController.getReviewById);

// Protected routes (require authentication)
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);
router.post('/:id/response', authenticate, reviewController.addResponse);
router.post('/:id/helpful', authenticate, reviewController.markAsHelpful);
router.post(
  '/:id/not-helpful',
  authenticate,
  reviewController.markAsNotHelpful
);
router.post('/:id/report', authenticate, reviewController.reportReview);

module.exports = router;
