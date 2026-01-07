const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All social routes require authentication
router.use(authenticate);

// Friends
router.post('/friends/request', matchesLimiter, (req, res) => socialController.sendFriendRequest(req, res));
router.post('/friends/:friendshipId/accept', matchesLimiter, (req, res) => socialController.acceptFriendRequest(req, res));
router.get('/friends', matchesLimiter, (req, res) => socialController.getFriends(req, res));
router.get('/friends/requests', matchesLimiter, (req, res) => socialController.getPendingRequests(req, res));
router.get('/friends/suggestions', matchesLimiter, (req, res) => socialController.getFriendSuggestions(req, res));

// Match social features
router.get('/matches/:matchId/friends', matchesLimiter, (req, res) => socialController.getFriendsInMatch(req, res));

// Activity feed
router.get('/feed', matchesLimiter, (req, res) => socialController.getActivityFeed(req, res));

// Recommendations
router.get('/recommendations', matchesLimiter, (req, res) => socialController.getRecommendations(req, res));

module.exports = router;

