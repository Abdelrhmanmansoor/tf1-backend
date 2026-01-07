const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// Public analytics
router.get('/platform', matchesLimiter, analyticsController.getPlatformStats);
router.get('/trending', matchesLimiter, analyticsController.getTrendingMatches);
router.get('/popular/sports', matchesLimiter, analyticsController.getPopularSports);
router.get('/popular/cities', matchesLimiter, analyticsController.getPopularCities);
router.get('/matches/:matchId', matchesLimiter, analyticsController.getMatchStats);

// User analytics (requires auth)
router.get('/me', authenticate, matchesLimiter, analyticsController.getUserAnalytics);
router.get('/me/achievements', authenticate, matchesLimiter, analyticsController.getUserAchievements);
router.get('/me/heatmap', authenticate, matchesLimiter, analyticsController.getActivityHeatmap);

// Leaderboards
router.get('/leaderboard', matchesLimiter, analyticsController.getLeaderboard);

module.exports = router;

