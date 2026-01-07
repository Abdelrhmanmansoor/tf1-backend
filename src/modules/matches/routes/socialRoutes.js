const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All social routes require authentication
router.use(authenticate);

// Friends
router.post('/friends/request', matchesLimiter, socialController.sendFriendRequest);
router.post('/friends/:friendshipId/accept', matchesLimiter, socialController.acceptFriendRequest);
router.get('/friends', matchesLimiter, socialController.getFriends);
router.get('/friends/requests', matchesLimiter, socialController.getPendingRequests);
router.get('/friends/suggestions', matchesLimiter, socialController.getFriendSuggestions);

// Match social features
router.get('/matches/:matchId/friends', matchesLimiter, socialController.getFriendsInMatch);

// Activity feed
router.get('/feed', matchesLimiter, socialController.getActivityFeed);

// Recommendations
router.get('/recommendations', matchesLimiter, socialController.getRecommendations);

module.exports = router;

