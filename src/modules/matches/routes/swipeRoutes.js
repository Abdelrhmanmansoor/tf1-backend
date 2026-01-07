const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All swipe routes require authentication
router.use(authenticate);

// Get matches for swiping
router.get('/discover', matchesLimiter, swipeController.getSwipeMatches);

// Swipe on a match
router.post('/:matchId/swipe', matchesLimiter, swipeController.swipe);

// Undo last swipe (premium feature)
router.post('/undo', matchesLimiter, swipeController.undoSwipe);

// Get interested users for your match
router.get('/match/:matchId/interested', matchesLimiter, swipeController.getInterestedUsers);

module.exports = router;

