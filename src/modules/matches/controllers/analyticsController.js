/**
 * Analytics Controller
 * Handles advanced analytics and statistical analysis requests
 */

const analyticsService = require('../services/analyticsService');
const kpiService = require('../services/kpiService');
const statisticalModels = require('../services/statisticalModels');

class AnalyticsController {
  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(req, res) {
    try {
      const stats = await analyticsService.getPlatformStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting platform stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform statistics',
        error: error.message
      });
    }
  }

  /**
   * Get user analytics dashboard
   */
  async getUserAnalytics(req, res) {
    try {
      const userId = req.params.userId || req.user?._id;
      const analytics = await analyticsService.getUserAnalytics(userId);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: error.message
      });
    }
  }

  /**
   * Get growth trend analysis with statistical models
   */
  async getGrowthTrend(req, res) {
    try {
      const days = parseInt(req.query.days) || 90;
      const trend = await analyticsService.getGrowthTrendAnalysis(days);
      res.json({
        success: true,
        data: trend,
        model_info: {
          type: 'Linear Regression + Moving Average',
          description: 'Statistical trend analysis with forecasting'
        }
      });
    } catch (error) {
      console.error('Error getting growth trend:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get growth trend',
        error: error.message
      });
    }
  }

  /**
   * Get seasonality analysis
   */
  async getSeasonality(req, res) {
    try {
      const days = parseInt(req.query.days) || 60;
      const seasonality = await analyticsService.getSeasonalityAnalysis(days);
      res.json({
        success: true,
        data: seasonality,
        model_info: {
          type: 'Seasonal Decomposition',
          description: 'Identifies recurring patterns in user activity'
        }
      });
    } catch (error) {
      console.error('Error getting seasonality:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seasonality analysis',
        error: error.message
      });
    }
  }

  /**
   * Get user performance score with weighted metrics
   */
  async getUserPerformanceScore(req, res) {
    try {
      const userId = req.params.userId || req.user?._id;
      const score = await analyticsService.getUserPerformanceScore(userId);
      res.json({
        success: true,
        data: score,
        model_info: {
          type: 'Weighted Score Calculation',
          description: 'Multi-dimensional performance evaluation'
        }
      });
    } catch (error) {
      console.error('Error getting performance score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get performance score',
        error: error.message
      });
    }
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealth(req, res) {
    try {
      const health = await analyticsService.getPlatformHealthMetrics();
      res.json({
        success: true,
        data: health,
        model_info: {
          type: 'Anomaly Detection + Statistical Analysis',
          description: 'Comprehensive platform health assessment'
        }
      });
    } catch (error) {
      console.error('Error getting platform health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform health',
        error: error.message
      });
    }
  }

  /**
   * Get comparative analysis (user vs platform)
   */
  async getComparativeAnalysis(req, res) {
    try {
      const userId = req.params.userId || req.user?._id;
      const analysis = await analyticsService.getComparativeAnalysis(userId);
      res.json({
        success: true,
        data: analysis,
        model_info: {
          type: 'Percentile Ranking + Comparative Statistics',
          description: 'Compare user performance against platform averages'
        }
      });
    } catch (error) {
      console.error('Error getting comparative analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get comparative analysis',
        error: error.message
      });
    }
  }

  /**
   * Get predictive insights with forecasting
   */
  async getPredictiveInsights(req, res) {
    try {
      const userId = req.params.userId || req.user?._id;
      const insights = await analyticsService.getPredictiveInsights(userId);
      res.json({
        success: true,
        data: insights,
        model_info: {
          type: 'Time Series Forecasting + Monte Carlo Simulation',
          description: 'Predict future behavior and assess risks'
        }
      });
    } catch (error) {
      console.error('Error getting predictive insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get predictive insights',
        error: error.message
      });
    }
  }

  /**
   * Get trending matches
   */
  async getTrendingMatches(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const trending = await analyticsService.getTrendingMatches(limit);
      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      console.error('Error getting trending matches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending matches',
        error: error.message
      });
    }
  }

  /**
   * Get popular sports statistics
   */
  async getPopularSports(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const sports = await analyticsService.getPopularSports(limit);
      res.json({
        success: true,
        data: sports
      });
    } catch (error) {
      console.error('Error getting popular sports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular sports',
        error: error.message
      });
    }
  }

  /**
   * Get KPI Dashboard
   */
  async getKPIDashboard(req, res) {
    try {
      const period = req.query.period || 'month';
      const kpis = await kpiService.getDashboardKPIs(period);
      res.json({
        success: true,
        data: kpis,
        model_info: {
          type: 'Key Performance Indicators',
          description: 'Comprehensive business metrics and trends'
        }
      });
    } catch (error) {
      console.error('Error getting KPI dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get KPI dashboard',
        error: error.message
      });
    }
  }

  /**
   * Get Cohort Analysis
   */
  async getCohortAnalysis(req, res) {
    try {
      const cohortDate = req.query.cohortDate || new Date();
      const cohort = await kpiService.getCohortAnalysis(cohortDate);
      res.json({
        success: true,
        data: cohort,
        model_info: {
          type: 'Cohort Retention Analysis',
          description: 'Track user retention over time by cohort'
        }
      });
    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cohort analysis',
        error: error.message
      });
    }
  }

  /**
   * Get Funnel Analysis
   */
  async getFunnelAnalysis(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const endDate = now;

      const funnel = await kpiService.getFunnelAnalysis(startDate, endDate);
      res.json({
        success: true,
        data: funnel,
        model_info: {
          type: 'Conversion Funnel Analysis',
          description: 'Identify drop-off points in user journey'
        }
      });
    } catch (error) {
      console.error('Error getting funnel analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get funnel analysis',
        error: error.message
      });
    }
  }

  /**
   * Get Activity Heatmap
   */
  async getActivityHeatmap(req, res) {
    try {
      const userId = req.params.userId || req.user?._id;
      const days = parseInt(req.query.days) || 30;
      const heatmap = await analyticsService.getActivityHeatmap(userId, days);
      res.json({
        success: true,
        data: heatmap
      });
    } catch (error) {
      console.error('Error getting activity heatmap:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity heatmap',
        error: error.message
      });
    }
  }

  /**
   * Get Match Statistics
   */
  async getMatchStats(req, res) {
    try {
      const matchId = req.params.matchId;
      const stats = await analyticsService.getMatchStats(matchId);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting match stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get match statistics',
        error: error.message
      });
    }
  }

  /**
   * Get Statistical Model Test
   * For testing and demonstration purposes
   */
  async testStatisticalModels(req, res) {
    try {
      const testData = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 12 },
        { date: '2024-01-03', value: 15 },
        { date: '2024-01-04', value: 14 },
        { date: '2024-01-05', value: 18 },
        { date: '2024-01-06', value: 20 },
        { date: '2024-01-07', value: 22 }
      ];

      const regression = statisticalModels.linearRegression(testData);
      const movingAvg = statisticalModels.movingAverage(testData, 3);
      const expSmoothing = statisticalModels.exponentialSmoothing(testData, 0.3);
      const forecast = statisticalModels.forecastNextPeriods(testData, 7);
      const stats = statisticalModels.calculateStatistics(testData.map(d => d.value));
      const seasonality = statisticalModels.seasonalityAnalysis(testData, 7);

      res.json({
        success: true,
        message: 'Statistical models working correctly',
        models: {
          linear_regression: {
            ...regression,
            description: 'Predicts future values based on historical trend'
          },
          moving_average: {
            data: movingAvg,
            description: 'Smooths short-term fluctuations'
          },
          exponential_smoothing: {
            data: expSmoothing,
            description: 'Gives more weight to recent data'
          },
          forecast: {
            predictions: forecast,
            description: 'Forecasts next 7 periods'
          },
          statistics: {
            ...stats,
            description: 'Descriptive statistics'
          },
          seasonality: {
            ...seasonality,
            description: 'Identifies recurring patterns'
          }
        }
      });
    } catch (error) {
      console.error('Error testing statistical models:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test statistical models',
        error: error.message
      });
    }
  }
}

module.exports = new AnalyticsController();
