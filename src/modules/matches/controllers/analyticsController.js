const analyticsService = require('../services/analyticsService');
const gamificationService = require('../services/gamificationService');
const { asyncHandler } = require('../utils/errorHandler');

class AnalyticsController {
  /**
   * Get platform statistics
   */
  getPlatformStats = asyncHandler(async (req, res) => {
    const stats = await analyticsService.getPlatformStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  /**
   * Get user analytics dashboard
   */
  getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const analytics = await analyticsService.getUserAnalytics(userId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  });

  /**
   * Get user achievements
   */
  getUserAchievements = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const achievements = await gamificationService.getAchievementsSummary(userId);

    res.status(200).json({
      success: true,
      data: achievements
    });
  });

  /**
   * Get leaderboard
   */
  getLeaderboard = asyncHandler(async (req, res) => {
    const { type = 'points', limit = 50 } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(type, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        type,
        leaderboard
      }
    });
  });

  /**
   * Get trending matches
   */
  getTrendingMatches = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const trending = await analyticsService.getTrendingMatches(parseInt(limit));

    res.status(200).json({
      success: true,
      data: trending
    });
  });

  /**
   * Get popular sports
   */
  getPopularSports = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const sports = await analyticsService.getPopularSports(parseInt(limit));

    res.status(200).json({
      success: true,
      data: sports
    });
  });

  /**
   * Get popular cities
   */
  getPopularCities = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const cities = await analyticsService.getPopularCities(parseInt(limit));

    res.status(200).json({
      success: true,
      data: cities
    });
  });

  /**
   * Get match statistics
   */
  getMatchStats = asyncHandler(async (req, res) => {
    const { matchId } = req.params;
    const stats = await analyticsService.getMatchStats(matchId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  /**
   * Get activity heatmap
   */
  getActivityHeatmap = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { days = 30 } = req.query;
    
    const heatmap = await analyticsService.getActivityHeatmap(userId, parseInt(days));

    res.status(200).json({
      success: true,
      data: heatmap
    });
  });
}

module.exports = new AnalyticsController();

