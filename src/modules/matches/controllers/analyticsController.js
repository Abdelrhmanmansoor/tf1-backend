/**
 * Analytics Controller
 * Handles advanced analytics and statistical analysis requests
 */

// Safely require all dependencies with proper error handling
let analyticsService, kpiService, statisticalModels, cache, logger;

try {
  analyticsService = require('../services/analyticsService');
  kpiService = require('../services/kpiService');
  statisticalModels = require('../services/statisticalModels');
  cache = require('../utils/cache');
  logger = require('../utils/logger');
} catch (error) {
  console.error('Error loading analytics dependencies:', error);
  // Provide fallback objects
  analyticsService = {};
  kpiService = {};
  statisticalModels = {};
  cache = {};
  logger = console;
}

const { NotFoundError, ValidationError } = require('../utils/errorHandler');

// Lazy load reportService to avoid circular dependency issues
const getReportService = () => {
  try {
    return require('../services/reportService');
  } catch (error) {
    console.warn('ReportService not available:', error.message);
    return null;
  }
};

class AnalyticsController {
  /**
   * Get platform-wide statistics
   * Cached for 1 hour
   */
  async getPlatformStats(req, res) {
    try {
      // Try to get from cache first
      const cached = await cache.get('analytics:platform:stats');
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const stats = await analyticsService.getPlatformStats();
      
      // Cache for 1 hour (3600 seconds)
      await cache.set('analytics:platform:stats', stats, 3600);

      logger.info('Platform statistics retrieved');

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب إحصائيات المنصة',
        messageEn: 'Failed to get platform statistics',
        error: error.message
      });
    }
  }

  /**
   * Get user analytics dashboard
   * Cached for 30 minutes per user
   */
  async getUserAnalytics(req, res) {
    try {
      const userId = req.params.userId || req.matchUser?._id;

      if (!userId) {
        throw new ValidationError('يجب تحديد معرف المستخدم');
      }

      // Try to get from cache first
      const cacheKey = `analytics:user:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const analytics = await analyticsService.getUserAnalytics(userId);
      
      if (!analytics) {
        throw new NotFoundError(`لم يتم العثور على بيانات تحليلية للمستخدم ${userId}`);
      }

      // Cache for 30 minutes
      await cache.set(cacheKey, analytics, 1800);

      logger.info(`User analytics retrieved for user ${userId}`);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تحليل المستخدم',
        messageEn: 'Failed to get user analytics',
        error: error.message
      });
    }
  }

  /**
   * Get growth trend analysis
   * Cached for 1 hour
   */
  async getGrowthTrend(req, res) {
    try {
      const days = parseInt(req.query.days) || 90;

      // Validate days parameter
      if (days < 1 || days > 365) {
        throw new ValidationError('يجب أن يكون عدد الأيام بين 1 و 365');
      }

      // Try to get from cache first
      const cacheKey = `analytics:growth:${days}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const trend = await analyticsService.getGrowthTrendAnalysis(days);

      const response = {
        data: trend,
        model_info: {
          type: 'Linear Regression + Moving Average',
          description: 'التحليل الإحصائي للاتجاهات مع التنبؤ'
        }
      };

      // Cache for 1 hour
      await cache.set(cacheKey, response, 3600);

      logger.info(`Growth trend analysis completed for ${days} days`);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting growth trend:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحليل الاتجاه',
        messageEn: 'Failed to get growth trend',
        error: error.message
      });
    }
  }

  /**
   * Get seasonality analysis
   * Cached for 24 hours
   */
  async getSeasonality(req, res) {
    try {
      const days = parseInt(req.query.days) || 60;

      if (days < 7 || days > 365) {
        throw new ValidationError('يجب أن يكون عدد الأيام بين 7 و 365');
      }

      // Try to get from cache first
      const cacheKey = `analytics:seasonality:${days}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const seasonality = await analyticsService.getSeasonalityAnalysis(days);

      const response = {
        data: seasonality,
        model_info: {
          type: 'Seasonal Decomposition',
          description: 'تحديد الأنماط المتكررة في نشاط المستخدمين'
        }
      };

      // Cache for 24 hours
      await cache.set(cacheKey, response, 86400);

      logger.info(`Seasonality analysis completed for ${days} days`);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting seasonality:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحليل الموسمية',
        messageEn: 'Failed to get seasonality analysis',
        error: error.message
      });
    }
  }

  /**
   * Get user performance score
   * Cached for 30 minutes per user
   */
  async getUserPerformanceScore(req, res) {
    try {
      const userId = req.params.userId || req.matchUser?._id;

      if (!userId) {
        throw new ValidationError('يجب تحديد معرف المستخدم');
      }

      // Try to get from cache first
      const cacheKey = `analytics:performance:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const score = await analyticsService.getUserPerformanceScore(userId);

      const response = {
        data: score,
        model_info: {
          type: 'Weighted Score Calculation',
          description: 'تقييم الأداء متعدد الأبعاد'
        }
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, response, 1800);

      logger.info(`Performance score calculated for user ${userId}`);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting performance score:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حساب درجة الأداء',
        messageEn: 'Failed to get performance score',
        error: error.message
      });
    }
  }

  /**
   * Get platform health metrics
   * Cached for 30 minutes
   */
  async getPlatformHealth(req, res) {
    try {
      // Try to get from cache first
      const cached = await cache.get('analytics:platform:health');
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const health = await analyticsService.getPlatformHealthMetrics();

      const response = {
        data: health,
        model_info: {
          type: 'Anomaly Detection + Statistical Analysis',
          description: 'تقييم شامل لصحة المنصة'
        }
      };

      // Cache for 30 minutes
      await cache.set('analytics:platform:health', response, 1800);

      logger.info('Platform health metrics retrieved');

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting platform health:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب صحة المنصة',
        messageEn: 'Failed to get platform health',
        error: error.message
      });
    }
  }

  /**
   * Get comparative analysis (user vs platform)
   * Cached for 1 hour per user
   */
  async getComparativeAnalysis(req, res) {
    try {
      const userId = req.params.userId || req.matchUser?._id;

      if (!userId) {
        throw new ValidationError('يجب تحديد معرف المستخدم');
      }

      // Try to get from cache first
      const cacheKey = `analytics:comparative:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const analysis = await analyticsService.getComparativeAnalysis(userId);

      const response = {
        data: analysis,
        model_info: {
          type: 'Percentile Ranking + Comparative Statistics',
          description: 'مقارنة أداء المستخدم مع متوسط المنصة'
        }
      };

      // Cache for 1 hour
      await cache.set(cacheKey, response, 3600);

      logger.info(`Comparative analysis completed for user ${userId}`);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting comparative analysis:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحليل المقارن',
        messageEn: 'Failed to get comparative analysis',
        error: error.message
      });
    }
  }

  /**
   * Get predictive insights
   * Cached for 2 hours per user (predictions are more stable)
   */
  async getPredictiveInsights(req, res) {
    try {
      const userId = req.params.userId || req.matchUser?._id;

      if (!userId) {
        throw new ValidationError('يجب تحديد معرف المستخدم');
      }

      // Try to get from cache first
      const cacheKey = `analytics:predictive:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          model_info: cached.model_info,
          fromCache: true
        });
      }

      const insights = await analyticsService.getPredictiveInsights(userId);

      const response = {
        data: insights,
        model_info: {
          type: 'Time Series Forecasting + Monte Carlo Simulation',
          description: 'التنبؤ بالسلوك المستقبلي وتقييم المخاطر'
        }
      };

      // Cache for 2 hours
      await cache.set(cacheKey, response, 7200);

      logger.info(`Predictive insights generated for user ${userId}`);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Error getting predictive insights:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التنبؤات',
        messageEn: 'Failed to get predictive insights',
        error: error.message
      });
    }
  }

  /**
   * Get trending matches
   * Cached for 1 hour
   */
  async getTrendingMatches(req, res) {
    try {
      const { limit = 20 } = req.query;

      // Try to get from cache first
      const cacheKey = `analytics:trending:${limit}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const trending = await analyticsService.getTrendingMatches(parseInt(limit) || 20);

      // Cache for 1 hour
      await cache.set(cacheKey, trending, 3600);

      logger.info(`Retrieved ${trending.length} trending matches`);

      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      logger.error('Error getting trending matches:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المباريات المتجهة',
        messageEn: 'Failed to get trending matches',
        error: error.message
      });
    }
  }

  /**
   * Get popular sports
   * Cached for 24 hours
   */
  async getPopularSports(req, res) {
    try {
      // Try to get from cache first
      const cached = await cache.get('analytics:popular:sports');
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const sports = await analyticsService.getPopularSports();

      // Cache for 24 hours
      await cache.set('analytics:popular:sports', sports, 86400);

      logger.info(`Retrieved popular sports statistics`);

      res.json({
        success: true,
        data: sports
      });
    } catch (error) {
      logger.error('Error getting popular sports:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الرياضات الشهيرة',
        messageEn: 'Failed to get popular sports',
        error: error.message
      });
    }
  }

  /**
   * Get user leaderboard
   * Cached for 1 hour (leaderboards update frequently)
   */
  async getLeaderboard(req, res) {
    try {
      const { type = 'points', limit = 50 } = req.query;

      // Validate parameters
      const validTypes = ['points', 'wins', 'matches', 'rating'];
      if (!validTypes.includes(type)) {
        throw new ValidationError(`نوع الترتيب غير صحيح. الخيارات: ${validTypes.join(', ')}`);
      }

      const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);

      // Try to get from cache first
      const cacheKey = `analytics:leaderboard:${type}:${parsedLimit}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const leaderboard = await analyticsService.getLeaderboard(type, parsedLimit);

      const response = {
        leaderboard,
        type,
        count: leaderboard.length,
        generatedAt: new Date().toISOString()
      };

      // Cache for 1 hour
      await cache.set(cacheKey, response, 3600);

      logger.info(`Leaderboard retrieved: ${type} (limit: ${parsedLimit})`);

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب لوحة الترتيب',
        messageEn: 'Failed to get leaderboard',
        error: error.message
      });
    }
  }

  /**
   * Get KPI dashboard
   * Cached for 1 hour
   */
  async getKPIDashboard(req, res) {
    try {
      const { period = 'month' } = req.query;

      const validPeriods = ['today', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period)) {
        throw new ValidationError(`الفترة غير صحيحة. الخيارات: ${validPeriods.join(', ')}`);
      }

      // Try to get from cache first
      const cacheKey = `analytics:kpi:${period}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const kpi = await kpiService.getKPIDashboard(period);

      // Cache for 1 hour
      await cache.set(cacheKey, kpi, 3600);

      logger.info(`KPI dashboard retrieved for period: ${period}`);

      res.json({
        success: true,
        data: kpi
      });
    } catch (error) {
      logger.error('Error getting KPI dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب لوحة المؤشرات الرئيسية',
        messageEn: 'Failed to get KPI dashboard',
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
      const userId = req.params.userId || req.matchUser?._id;
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
      const userId = req.params.userId || req.matchUser?._id;
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
      const userId = req.params.userId || req.matchUser?._id;
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
      const userId = req.params.userId || req.matchUser?._id;
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

  /**
   * ============================================
   * REPORT GENERATION ENDPOINTS
   * ============================================
   */

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(req, res) {
    try {
      const options = {
        period: req.query.period || 'month',
        includeGrowth: req.query.includeGrowth !== 'false',
        includeKPIs: req.query.includeKPIs !== 'false',
        includeHealth: req.query.includeHealth !== 'false',
        includeFunnel: req.query.includeFunnel !== 'false',
        includeForecasts: req.query.includeForecasts !== 'false'
      };

      const reportService = getReportService();
      if (!reportService) {
        return res.status(503).json({
          success: false,
          message: 'Report service not available'
        });
      }
      
      const report = await reportService.generateAnalyticsReport(options);
      
      res.json({
        success: true,
        data: report,
        export_formats: ['json', 'csv', 'excel', 'pdf']
      });
    } catch (error) {
      console.error('Error generating analytics report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate analytics report',
        error: error.message
      });
    }
  }

  /**
   * Generate user performance report
   */
  async generateUserReport(req, res) {
    try {
      const userId = req.params.userId || req.matchUser?._id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }
      
      const reportService = getReportService();
      if (!reportService) {
        return res.status(503).json({
          success: false,
          message: 'Report service not available'
        });
      }
      
      const report = await reportService.generateUserReport(userId);
      
      res.json({
        success: true,
        data: report,
        export_formats: ['json', 'csv', 'excel', 'pdf']
      });
    } catch (error) {
      console.error('Error generating user report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate user report',
        error: error.message
      });
    }
  }

  /**
   * Generate platform health report
   */
  async generateHealthReport(req, res) {
    try {
      const reportService = getReportService();
      if (!reportService) {
        return res.status(503).json({
          success: false,
          message: 'Report service not available'
        });
      }
      
      const report = await reportService.generateHealthReport();
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating health report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate health report',
        error: error.message
      });
    }
  }

  /**
   * Export report in specified format
   */
  async exportReport(req, res) {
    try {
      const reportType = req.params.reportType || 'analytics';
      const format = req.query.format || 'json';
      const period = req.query.period || 'month';

      const reportService = getReportService();
      if (!reportService) {
        return res.status(503).json({
          success: false,
          message: 'Report service not available'
        });
      }
      
      let report;
      if (reportType === 'analytics') {
        report = await reportService.generateAnalyticsReport({ period });
      } else if (reportType === 'health') {
        report = await reportService.generateHealthReport();
      } else if (reportType === 'user' && req.matchUser) {
        report = await reportService.generateUserReport(req.matchUser._id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
      }

      const exportedData = reportService.formatReportForExport(report, format);

      // Set appropriate headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.csv"`);
        return res.send(exportedData);
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.json"`);
        return res.json(exportedData);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/json');
        return res.json({
          success: true,
          message: 'PDF generation requires additional frontend processing',
          data: exportedData
        });
      }

      // Default: return JSON
      return res.json({
        success: true,
        data: exportedData
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export report',
        error: error.message
      });
    }
  }

  /**
   * Get user leaderboard
   */
  async getLeaderboard(req, res) {
    try {
      const { type = 'points', limit = 50 } = req.query;
      const leaderboard = await analyticsService.getLeaderboard(type, parseInt(limit));
      res.json({
        success: true,
        data: {
          leaderboard,
          type,
          count: leaderboard.length
        }
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get leaderboard',
        error: error.message
      });
    }
  }
}

module.exports = new AnalyticsController();
