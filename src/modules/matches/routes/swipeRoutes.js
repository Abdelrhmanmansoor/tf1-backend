const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All swipe routes require authentication
router.use(authenticate);

// Get matches for swiping
router.get('/discover', matchesLimiter, (req, res) => swipeController.getSwipeMatches(req, res));

// Swipe on a match
router.post('/:matchId/swipe', matchesLimiter, (req, res) => swipeController.swipe(req, res));

// Undo last swipe (premium feature)
router.post('/undo', matchesLimiter, (req, res) => swipeController.undoSwipe(req, res));

// Get interested users for your match
router.get('/match/:matchId/interested', matchesLimiter, (req, res) => swipeController.getInterestedUsers(req, res));

module.exports = router;

