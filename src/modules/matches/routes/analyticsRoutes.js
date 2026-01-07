/**
 * Analytics Routes
 * Advanced analytics and statistical analysis endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/matches/analytics/platform
 * @desc    Get platform-wide statistics
 * @access  Public
 */
router.get('/platform', (req, res) => analyticsController.getPlatformStats(req, res));

/**
 * @route   GET /api/matches/analytics/user/:userId
 * @desc    Get user analytics dashboard
 * @access  Private
 */
router.get('/user', authenticate, (req, res) => analyticsController.getUserAnalytics(req, res));
router.get('/user/:userId', authenticate, (req, res) => analyticsController.getUserAnalytics(req, res));

/**
 * @route   GET /api/matches/analytics/growth-trend
 * @desc    Get growth trend analysis with linear regression
 * @access  Public
 */
router.get('/growth-trend', (req, res) => analyticsController.getGrowthTrend(req, res));

/**
 * @route   GET /api/matches/analytics/seasonality
 * @desc    Get seasonality analysis
 * @access  Public
 */
router.get('/seasonality', (req, res) => analyticsController.getSeasonality(req, res));

/**
 * @route   GET /api/matches/analytics/performance/:userId
 * @desc    Get user performance score (weighted metrics)
 * @access  Private
 */
router.get('/performance', authenticate, (req, res) => analyticsController.getUserPerformanceScore(req, res));
router.get('/performance/:userId', authenticate, (req, res) => analyticsController.getUserPerformanceScore(req, res));

/**
 * @route   GET /api/matches/analytics/platform-health
 * @desc    Get platform health metrics with anomaly detection
 * @access  Public
 */
router.get('/platform-health', (req, res) => analyticsController.getPlatformHealth(req, res));

/**
 * @route   GET /api/matches/analytics/comparative/:userId
 * @desc    Get comparative analysis (user vs platform)
 * @access  Private
 */
router.get('/comparative', authenticate, (req, res) => analyticsController.getComparativeAnalysis(req, res));
router.get('/comparative/:userId', authenticate, (req, res) => analyticsController.getComparativeAnalysis(req, res));

/**
 * @route   GET /api/matches/analytics/predictive/:userId
 * @desc    Get predictive insights with forecasting
 * @access  Private
 */
router.get('/predictive', authenticate, (req, res) => analyticsController.getPredictiveInsights(req, res));
router.get('/predictive/:userId', authenticate, (req, res) => analyticsController.getPredictiveInsights(req, res));

/**
 * @route   GET /api/matches/analytics/trending
 * @desc    Get trending matches
 * @access  Public
 */
router.get('/trending', (req, res) => analyticsController.getTrendingMatches(req, res));

/**
 * @route   GET /api/matches/analytics/popular-sports
 * @desc    Get popular sports statistics
 * @access  Public
 */
router.get('/popular-sports', (req, res) => analyticsController.getPopularSports(req, res));

/**
 * @route   GET /api/matches/analytics/leaderboard
 * @desc    Get user leaderboard with rankings
 * @access  Public
 * @query   type - points|wins|matches (default: points)
 */
router.get('/leaderboard', (req, res) => analyticsController.getLeaderboard(req, res));

/**
 * @route   GET /api/matches/analytics/kpi
 * @desc    Get KPI dashboard
 * @access  Public
 * @query   period - today|week|month|quarter|year (default: month)
 */
router.get('/kpi', (req, res) => analyticsController.getKPIDashboard(req, res));

/**
 * @route   GET /api/matches/analytics/cohort
 * @desc    Get cohort analysis
 * @access  Public
 * @query   cohortDate - ISO date string
 */
router.get('/cohort', (req, res) => analyticsController.getCohortAnalysis(req, res));

/**
 * @route   GET /api/matches/analytics/funnel
 * @desc    Get funnel analysis
 * @access  Public
 * @query   days - number of days (default: 30)
 */
router.get('/funnel', (req, res) => analyticsController.getFunnelAnalysis(req, res));

/**
 * @route   GET /api/matches/analytics/heatmap/:userId
 * @desc    Get activity heatmap
 * @access  Private
 * @query   days - number of days (default: 30)
 */
router.get('/heatmap', authenticate, (req, res) => analyticsController.getActivityHeatmap(req, res));
router.get('/heatmap/:userId', authenticate, (req, res) => analyticsController.getActivityHeatmap(req, res));

/**
 * @route   GET /api/matches/analytics/match/:matchId
 * @desc    Get match statistics
 * @access  Public
 */
router.get('/match/:matchId', (req, res) => analyticsController.getMatchStats(req, res));

/**
 * @route   GET /api/matches/analytics/test-models
 * @desc    Test statistical models (for demonstration)
 * @access  Public
 */
router.get('/test-models', (req, res) => analyticsController.testStatisticalModels(req, res));

/**
 * ============================================
 * REPORT GENERATION ROUTES
 * ============================================
 */

/**
 * @route   GET /api/matches/analytics/reports/analytics
 * @desc    Generate comprehensive analytics report
 * @access  Public
 * @query   period, includeGrowth, includeKPIs, includeHealth, includeFunnel, includeForecasts
 */
router.get('/reports/analytics', (req, res) => analyticsController.generateAnalyticsReport(req, res));

/**
 * @route   GET /api/matches/analytics/reports/user/:userId
 * @desc    Generate user performance report
 * @access  Private
 */
router.get('/reports/user', authenticate, (req, res) => analyticsController.generateUserReport(req, res));
router.get('/reports/user/:userId', authenticate, (req, res) => analyticsController.generateUserReport(req, res));

/**
 * @route   GET /api/matches/analytics/reports/health
 * @desc    Generate platform health report
 * @access  Public
 */
router.get('/reports/health', (req, res) => analyticsController.generateHealthReport(req, res));

/**
 * @route   GET /api/matches/analytics/export/:reportType
 * @desc    Export report in specified format (csv, excel, pdf)
 * @access  Public/Private (depends on report type)
 * @params  reportType - analytics|health|user
 * @query   format - json|csv|excel|pdf, period
 */
router.get('/export/:reportType', (req, res) => analyticsController.exportReport(req, res));

module.exports = router;
