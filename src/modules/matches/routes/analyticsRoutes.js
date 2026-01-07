/**
 * Analytics Routes
 * Advanced analytics and statistical analysis endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/matches/analytics/platform
 * @desc    Get platform-wide statistics
 * @access  Public
 */
router.get('/platform', analyticsController.getPlatformStats);

/**
 * @route   GET /api/matches/analytics/user/:userId?
 * @desc    Get user analytics dashboard
 * @access  Private
 */
router.get('/user/:userId?', authenticateToken, analyticsController.getUserAnalytics);

/**
 * @route   GET /api/matches/analytics/growth-trend
 * @desc    Get growth trend analysis with linear regression
 * @access  Public
 */
router.get('/growth-trend', analyticsController.getGrowthTrend);

/**
 * @route   GET /api/matches/analytics/seasonality
 * @desc    Get seasonality analysis
 * @access  Public
 */
router.get('/seasonality', analyticsController.getSeasonality);

/**
 * @route   GET /api/matches/analytics/performance/:userId?
 * @desc    Get user performance score (weighted metrics)
 * @access  Private
 */
router.get('/performance/:userId?', authenticateToken, analyticsController.getUserPerformanceScore);

/**
 * @route   GET /api/matches/analytics/platform-health
 * @desc    Get platform health metrics with anomaly detection
 * @access  Public
 */
router.get('/platform-health', analyticsController.getPlatformHealth);

/**
 * @route   GET /api/matches/analytics/comparative/:userId?
 * @desc    Get comparative analysis (user vs platform)
 * @access  Private
 */
router.get('/comparative/:userId?', authenticateToken, analyticsController.getComparativeAnalysis);

/**
 * @route   GET /api/matches/analytics/predictive/:userId?
 * @desc    Get predictive insights with forecasting
 * @access  Private
 */
router.get('/predictive/:userId?', authenticateToken, analyticsController.getPredictiveInsights);

/**
 * @route   GET /api/matches/analytics/trending
 * @desc    Get trending matches
 * @access  Public
 */
router.get('/trending', analyticsController.getTrendingMatches);

/**
 * @route   GET /api/matches/analytics/popular-sports
 * @desc    Get popular sports statistics
 * @access  Public
 */
router.get('/popular-sports', analyticsController.getPopularSports);

/**
 * @route   GET /api/matches/analytics/kpi
 * @desc    Get KPI dashboard
 * @access  Public
 * @query   period - today|week|month|quarter|year (default: month)
 */
router.get('/kpi', analyticsController.getKPIDashboard);

/**
 * @route   GET /api/matches/analytics/cohort
 * @desc    Get cohort analysis
 * @access  Public
 * @query   cohortDate - ISO date string
 */
router.get('/cohort', analyticsController.getCohortAnalysis);

/**
 * @route   GET /api/matches/analytics/funnel
 * @desc    Get funnel analysis
 * @access  Public
 * @query   days - number of days (default: 30)
 */
router.get('/funnel', analyticsController.getFunnelAnalysis);

/**
 * @route   GET /api/matches/analytics/heatmap/:userId?
 * @desc    Get activity heatmap
 * @access  Private
 * @query   days - number of days (default: 30)
 */
router.get('/heatmap/:userId?', authenticateToken, analyticsController.getActivityHeatmap);

/**
 * @route   GET /api/matches/analytics/match/:matchId
 * @desc    Get match statistics
 * @access  Public
 */
router.get('/match/:matchId', analyticsController.getMatchStats);

/**
 * @route   GET /api/matches/analytics/test-models
 * @desc    Test statistical models (for demonstration)
 * @access  Public
 */
router.get('/test-models', analyticsController.testStatisticalModels);

module.exports = router;
