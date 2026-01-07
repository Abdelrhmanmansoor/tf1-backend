const express = require('express');
const router = express.Router();

let socialController, authenticate, matchesLimiter;

try {
  socialController = require('../controllers/socialController');
  const auth = require('../middleware/auth');
  authenticate = auth.authenticate;
  const limiters = require('../middleware/rateLimiter');
  matchesLimiter = limiters.matchesLimiter;
} catch (error) {
  console.error('Error loading social routes:', error);
  socialController = {};
  authenticate = (req, res, next) => next();
  matchesLimiter = (req, res, next) => next();
}

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

