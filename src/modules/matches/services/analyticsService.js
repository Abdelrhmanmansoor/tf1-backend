const Match = require('../models/Match');
const Participation = require('../models/Participation');
const UserStats = require('../models/UserStats');
const SwipeAction = require('../models/SwipeAction');
const cache = require('../utils/cache');
const statisticalModels = require('./statisticalModels');

/**
 * Analytics & Statistics Service
 * Comprehensive analytics for matches system with real statistical models
 */

class AnalyticsService {
  /**
   * Get platform-wide statistics
   */
  async getPlatformStats() {
    const cacheKey = 'analytics:platform';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const [
      totalMatches,
      totalUsers,
      activeMatches,
      completedMatches,
      totalParticipations,
      avgPlayersPerMatch
    ] = await Promise.all([
      Match.countDocuments(),
      require('../models/MatchUser').countDocuments(),
      Match.countDocuments({ status: 'open', date: { $gte: new Date() } }),
      Match.countDocuments({ status: 'finished' }),
      Participation.countDocuments(),
      Match.aggregate([
        { $group: { _id: null, avg: { $avg: '$current_players' } } }
      ])
    ]);

    const stats = {
      total_matches: totalMatches,
      total_users: totalUsers,
      active_matches: activeMatches,
      completed_matches: completedMatches,
      total_participations: totalParticipations,
      avg_players_per_match: Math.round(avgPlayersPerMatch[0]?.avg || 0),
      last_updated: new Date()
    };

    await cache.set(cacheKey, stats, 300); // 5 minutes
    return stats;
  }

  /**
   * Get user analytics dashboard
   */
  async getUserAnalytics(userId) {
    const [stats, recentMatches, upcomingMatches] = await Promise.all([
      UserStats.findOne({ user_id: userId }),
      this.getRecentMatches(userId, 10),
      this.getUpcomingMatches(userId, 5)
    ]);

    return {
      stats: stats || {},
      recent_matches: recentMatches,
      upcoming_matches: upcomingMatches,
      performance: {
        attendance_rate: stats?.attendance_rate || 100,
        reliability_score: stats?.reliability_score || 100,
        average_rating: stats?.average_rating || 0
      },
      activity: {
        this_week: await this.getWeeklyActivity(userId),
        this_month: await this.getMonthlyActivity(userId)
      }
    };
  }

  /**
   * Get trending matches
   */
  async getTrendingMatches(limit = 10) {
    const cacheKey = 'analytics:trending';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Matches with most interest (swipes, joins) in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await Match.aggregate([
      {
        $match: {
          status: 'open',
          date: { $gte: new Date() },
          created_at: { $gte: oneDayAgo }
        }
      },
      {
        $lookup: {
          from: 'ms_swipe_actions',
          localField: '_id',
          foreignField: 'match_id',
          as: 'swipes'
        }
      },
      {
        $addFields: {
          trending_score: {
            $add: [
              { $multiply: ['$current_players', 2] }, // Actual joins count more
              { $size: '$swipes' } // Swipe interest
            ]
          }
        }
      },
      { $sort: { trending_score: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'ms_match_users',
          localField: 'owner_id',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } }
    ]);

    await cache.set(cacheKey, trending, 300); // 5 minutes
    return trending;
  }

  /**
   * Get popular sports
   */
  async getPopularSports(limit = 10) {
    const popular = await Match.aggregate([
      {
        $group: {
          _id: '$sport',
          count: { $sum: 1 },
          avg_players: { $avg: '$current_players' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return popular.map(p => ({
      sport: p._id,
      matches_count: p.count,
      avg_players: Math.round(p.avg_players)
    }));
  }

  /**
   * Get popular cities
   */
  async getPopularCities(limit = 10) {
    const popular = await Match.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'open'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return popular.map(p => ({
      city: p._id,
      total_matches: p.count,
      active_matches: p.active
    }));
  }

  /**
   * Get match statistics
   */
  async getMatchStats(matchId) {
    const match = await Match.findById(matchId).lean();
    if (!match) return null;

    const [participants, swipes, interested] = await Promise.all([
      Participation.countDocuments({ match_id: matchId }),
      SwipeAction.countDocuments({ match_id: matchId }),
      require('../models/InterestedUser').countDocuments({ match_id: matchId })
    ]);

    const swipeBreakdown = await SwipeAction.aggregate([
      { $match: { match_id: match._id } },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      match,
      participants,
      total_swipes: swipes,
      interested_users: interested,
      swipe_breakdown: {
        right: swipeBreakdown.find(s => s._id === 'right')?.count || 0,
        left: swipeBreakdown.find(s => s._id === 'left')?.count || 0,
        up: swipeBreakdown.find(s => s._id === 'up')?.count || 0
      },
      fill_rate: (match.current_players / match.max_players) * 100,
      days_until: Math.ceil((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Get recent matches for user
   */
  async getRecentMatches(userId, limit) {
    const participations = await Participation.find({ user_id: userId })
      .populate('match_id')
      .sort({ joined_at: -1 })
      .limit(limit)
      .lean();

    return participations.map(p => p.match_id).filter(Boolean);
  }

  /**
   * Get upcoming matches for user
   */
  async getUpcomingMatches(userId, limit) {
    const participations = await Participation.find({ user_id: userId })
      .populate({
        path: 'match_id',
        match: { date: { $gte: new Date() } }
      })
      .sort({ 'match_id.date': 1 })
      .limit(limit)
      .lean();

    return participations.map(p => p.match_id).filter(Boolean);
  }

  /**
   * Get weekly activity
   */
  async getWeeklyActivity(userId) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const matches = await Participation.find({
      user_id: userId,
      joined_at: { $gte: oneWeekAgo }
    }).countDocuments();

    const swipes = await SwipeAction.find({
      user_id: userId,
      timestamp: { $gte: oneWeekAgo }
    }).countDocuments();

    return {
      matches_joined: matches,
      swipes: swipes,
      total_actions: matches + swipes
    };
  }

  /**
   * Get monthly activity
   */
  async getMonthlyActivity(userId) {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const matches = await Participation.find({
      user_id: userId,
      joined_at: { $gte: oneMonthAgo }
    }).countDocuments();

    const created = await Match.find({
      owner_id: userId,
      created_at: { $gte: oneMonthAgo }
    }).countDocuments();

    return {
      matches_joined: matches,
      matches_created: created,
      total: matches + created
    };
  }

  /**
   * Get heatmap data (activity by day/hour)
   */
  async getActivityHeatmap(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const participations = await Participation.find({
      user_id: userId,
      joined_at: { $gte: startDate }
    })
      .populate('match_id', 'time date')
      .lean();

    // Group by day and hour
    const heatmap = {};
    participations.forEach(p => {
      const match = p.match_id;
      if (!match) return;

      const day = new Date(match.date).getDay();
      const hour = parseInt(match.time?.split(':')[0] || 0);

      const key = `${day}_${hour}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });

    return heatmap;
  }

  /**
   * ============================================
   * ADVANCED ANALYTICS WITH STATISTICAL MODELS
   * ============================================
   */

  /**
   * Get Growth Trend Analysis
   * Uses linear regression to analyze platform growth
   */
  async getGrowthTrendAnalysis(days = 90) {
    const cacheKey = `analytics:growth_trend:${days}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get daily match creation counts
    const dailyMatches = await Match.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get daily user joins
    const dailyJoins = await Participation.aggregate([
      {
        $match: {
          joined_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$joined_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Prepare data for regression
    const matchesData = dailyMatches.map(d => ({ date: d._id, value: d.count }));
    const joinsData = dailyJoins.map(d => ({ date: d._id, value: d.count }));

    // Apply statistical models
    const matchesRegression = statisticalModels.linearRegression(matchesData);
    const joinsRegression = statisticalModels.linearRegression(joinsData);
    const matchesSmoothed = statisticalModels.movingAverage(matchesData, 7);
    const joinsSmoothed = statisticalModels.movingAverage(joinsData, 7);

    // Forecast next 7 days
    const matchesForecast = statisticalModels.forecastNextPeriods(matchesData, 7);
    const joinsForecast = statisticalModels.forecastNextPeriods(joinsData, 7);

    // Calculate growth rates
    const matchesGrowth = matchesData.length >= 2 
      ? statisticalModels.calculateGrowthRate(
          matchesData[0].value,
          matchesData[matchesData.length - 1].value
        )
      : 0;

    const joinsGrowth = joinsData.length >= 2
      ? statisticalModels.calculateGrowthRate(
          joinsData[0].value,
          joinsData[joinsData.length - 1].value
        )
      : 0;

    const result = {
      period_days: days,
      matches: {
        raw_data: matchesData,
        smoothed: matchesSmoothed,
        regression: matchesRegression,
        forecast: matchesForecast,
        growth_rate: Math.round(matchesGrowth * 100) / 100,
        trend_direction: matchesRegression.trend
      },
      joins: {
        raw_data: joinsData,
        smoothed: joinsSmoothed,
        regression: joinsRegression,
        forecast: joinsForecast,
        growth_rate: Math.round(joinsGrowth * 100) / 100,
        trend_direction: joinsRegression.trend
      },
      correlation: statisticalModels.correlation(
        matchesData.map(d => d.value),
        joinsData.map(d => d.value)
      ),
      generated_at: new Date()
    };

    await cache.set(cacheKey, result, 3600); // 1 hour
    return result;
  }

  /**
   * Get Seasonality Analysis
   * Identifies patterns that repeat at regular intervals
   */
  async getSeasonalityAnalysis(days = 60) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get activity by day of week
    const weeklyActivity = await Match.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$created_at' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get hourly activity
    const hourlyActivity = await Match.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $project: {
          hour: { $hour: '$created_at' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Prepare time series data
    const dailyData = new Array(7).fill(0);
    weeklyActivity.forEach(item => {
      dailyData[item._id - 1] = item.count;
    });

    const hourlyData = new Array(24).fill(0);
    hourlyActivity.forEach(item => {
      hourlyData[item._id] = item.count;
    });

    // Apply seasonality analysis
    const timeSeriesData = dailyData.map((value, index) => ({
      date: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      value
    }));

    const weeklySeasonality = statisticalModels.seasonalityAnalysis(timeSeriesData, 7);
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      weekly_pattern: {
        data: dailyData,
        labels: daysOfWeek,
        peak_day: daysOfWeek[weeklySeasonality.peakDay] || 'N/A',
        low_day: daysOfWeek[weeklySeasonality.lowDay] || 'N/A',
        has_seasonality: weeklySeasonality.hasSeasonality,
        strength: weeklySeasonality.strength
      },
      hourly_pattern: {
        data: hourlyData,
        peak_hour: hourlyData.indexOf(Math.max(...hourlyData)),
        low_hour: hourlyData.indexOf(Math.min(...hourlyData))
      },
      statistics: statisticalModels.calculateStatistics(dailyData)
    };
  }

  /**
   * Get User Performance Score
   * Weighted score based on multiple metrics
   */
  async getUserPerformanceScore(userId) {
    const stats = await UserStats.findOne({ user_id: userId });
    if (!stats) {
      return {
        overall_score: 0,
        classification: 'new_user',
        metrics: {}
      };
    }

    // Calculate weighted score
    const metrics = {
      attendance: {
        value: stats.attendance_rate || 0,
        weight: 0.3
      },
      reliability: {
        value: stats.reliability_score || 0,
        weight: 0.25
      },
      rating: {
        value: (stats.average_rating || 0) * 20, // Convert 0-5 to 0-100
        weight: 0.2
      },
      activity: {
        value: Math.min(100, (stats.matches_completed || 0) * 5), // Cap at 100
        weight: 0.15
      },
      social: {
        value: Math.min(100, (stats.friends_count || 0) * 10), // Cap at 100
        weight: 0.1
      }
    };

    const overallScore = statisticalModels.calculateWeightedScore(metrics);
    const classification = statisticalModels.classifyPerformance(overallScore);

    return {
      overall_score: Math.round(overallScore),
      classification,
      metrics: {
        attendance_rate: metrics.attendance.value,
        reliability_score: metrics.reliability.value,
        rating_score: Math.round(metrics.rating.value),
        activity_score: Math.round(metrics.activity.value),
        social_score: Math.round(metrics.social.value)
      },
      breakdown: Object.keys(metrics).map(key => ({
        name: key,
        value: Math.round(metrics[key].value),
        weight: metrics[key].weight * 100,
        contribution: Math.round(metrics[key].value * metrics[key].weight)
      }))
    };
  }

  /**
   * Get Platform Health Metrics
   * Comprehensive KPIs with statistical analysis
   */
  async getPlatformHealthMetrics() {
    const cacheKey = 'analytics:platform_health';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Get last 30 days data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      recentMatches,
      previousMatches,
      recentParticipations,
      previousParticipations,
      activeUsers,
      allMatches
    ] = await Promise.all([
      Match.countDocuments({ created_at: { $gte: thirtyDaysAgo } }),
      Match.countDocuments({ 
        created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } 
      }),
      Participation.countDocuments({ joined_at: { $gte: thirtyDaysAgo } }),
      Participation.countDocuments({ 
        joined_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } 
      }),
      Participation.distinct('user_id', { 
        joined_at: { $gte: thirtyDaysAgo } 
      }),
      Match.find({}, 'current_players max_players').lean()
    ]);

    // Calculate fill rates
    const fillRates = allMatches
      .filter(m => m.max_players > 0)
      .map(m => (m.current_players / m.max_players) * 100);

    const fillRateStats = statisticalModels.calculateStatistics(fillRates);

    // Growth rates
    const matchesGrowth = statisticalModels.calculateGrowthRate(
      previousMatches,
      recentMatches
    );
    const participationsGrowth = statisticalModels.calculateGrowthRate(
      previousParticipations,
      recentParticipations
    );

    // User engagement rate
    const totalUsers = await require('../models/MatchUser').countDocuments();
    const engagementRate = totalUsers > 0 
      ? (activeUsers.length / totalUsers) * 100 
      : 0;

    // Detect anomalies in fill rates
    const anomalies = statisticalModels.detectAnomalies(fillRates);

    const result = {
      overview: {
        matches_created_30d: recentMatches,
        participations_30d: recentParticipations,
        active_users_30d: activeUsers.length,
        engagement_rate: Math.round(engagementRate * 100) / 100
      },
      growth: {
        matches_growth: Math.round(matchesGrowth * 100) / 100,
        participations_growth: Math.round(participationsGrowth * 100) / 100,
        trend: matchesGrowth > 5 ? 'strong_growth' : 
               matchesGrowth > 0 ? 'growth' :
               matchesGrowth > -5 ? 'stable' : 'decline'
      },
      fill_rate_analysis: {
        ...fillRateStats,
        health_score: Math.round(fillRateStats.mean),
        classification: statisticalModels.classifyPerformance(fillRateStats.mean),
        anomalies_detected: anomalies.length,
        anomalies: anomalies.slice(0, 5) // Top 5 anomalies
      },
      health_indicators: {
        user_activity: this.classifyHealth(engagementRate, 15, 30, 50),
        match_creation: this.classifyHealth(matchesGrowth, -10, 0, 10),
        fill_rate: this.classifyHealth(fillRateStats.mean, 40, 60, 75)
      },
      generated_at: new Date()
    };

    await cache.set(cacheKey, result, 600); // 10 minutes
    return result;
  }

  /**
   * Helper function to classify health indicators
   */
  classifyHealth(value, poor, average, good) {
    if (value >= good) return { status: 'excellent', value, color: 'green' };
    if (value >= average) return { status: 'good', value, color: 'blue' };
    if (value >= poor) return { status: 'fair', value, color: 'yellow' };
    return { status: 'poor', value, color: 'red' };
  }

  /**
   * Get Comparative Analysis
   * Compare user performance against platform averages
   */
  async getComparativeAnalysis(userId) {
    const userStats = await UserStats.findOne({ user_id: userId });
    if (!userStats) {
      return { error: 'User stats not found' };
    }

    // Get platform averages
    const platformStats = await UserStats.aggregate([
      {
        $group: {
          _id: null,
          avg_attendance: { $avg: '$attendance_rate' },
          avg_reliability: { $avg: '$reliability_score' },
          avg_rating: { $avg: '$average_rating' },
          avg_matches: { $avg: '$matches_completed' },
          avg_streak: { $avg: '$current_streak' }
        }
      }
    ]);

    const platform = platformStats[0] || {};

    // Calculate percentiles
    const allUsers = await UserStats.find({}, {
      attendance_rate: 1,
      reliability_score: 1,
      average_rating: 1,
      matches_completed: 1,
      current_streak: 1
    }).lean();

    const attendanceValues = allUsers.map(u => u.attendance_rate || 0);
    const reliabilityValues = allUsers.map(u => u.reliability_score || 0);
    const ratingValues = allUsers.map(u => u.average_rating || 0);

    // Calculate user's percentile rank
    const attendancePercentile = this.calculatePercentileRank(
      userStats.attendance_rate || 0,
      attendanceValues
    );
    const reliabilityPercentile = this.calculatePercentileRank(
      userStats.reliability_score || 0,
      reliabilityValues
    );
    const ratingPercentile = this.calculatePercentileRank(
      userStats.average_rating || 0,
      ratingValues
    );

    return {
      user: {
        attendance_rate: userStats.attendance_rate || 0,
        reliability_score: userStats.reliability_score || 0,
        average_rating: userStats.average_rating || 0,
        matches_completed: userStats.matches_completed || 0,
        current_streak: userStats.current_streak || 0
      },
      platform_average: {
        attendance_rate: Math.round(platform.avg_attendance || 0),
        reliability_score: Math.round(platform.avg_reliability || 0),
        average_rating: Math.round((platform.avg_rating || 0) * 100) / 100,
        matches_completed: Math.round(platform.avg_matches || 0),
        current_streak: Math.round(platform.avg_streak || 0)
      },
      percentile_rank: {
        attendance: Math.round(attendancePercentile),
        reliability: Math.round(reliabilityPercentile),
        rating: Math.round(ratingPercentile),
        overall: Math.round((attendancePercentile + reliabilityPercentile + ratingPercentile) / 3)
      },
      comparison: {
        attendance: this.getComparison(userStats.attendance_rate, platform.avg_attendance),
        reliability: this.getComparison(userStats.reliability_score, platform.avg_reliability),
        rating: this.getComparison(userStats.average_rating, platform.avg_rating)
      }
    };
  }

  /**
   * Calculate percentile rank
   */
  calculatePercentileRank(value, allValues) {
    const sorted = allValues.sort((a, b) => a - b);
    const belowCount = sorted.filter(v => v < value).length;
    return (belowCount / sorted.length) * 100;
  }

  /**
   * Get comparison status
   */
  getComparison(userValue, avgValue) {
    const diff = userValue - avgValue;
    const diffPercent = avgValue > 0 ? (diff / avgValue) * 100 : 0;
    
    return {
      difference: Math.round(diff * 100) / 100,
      difference_percent: Math.round(diffPercent * 100) / 100,
      status: diff > 0 ? 'above_average' : diff < 0 ? 'below_average' : 'average'
    };
  }

  /**
   * Get Predictive Insights
   * Forecast user behavior and match trends
   */
  async getPredictiveInsights(userId) {
    const userStats = await UserStats.findOne({ user_id: userId });
    if (!userStats) {
      return { error: 'User stats not found' };
    }

    // Get user's historical activity
    const historicalActivity = await Participation.aggregate([
      {
        $match: { user_id: userStats.user_id }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$joined_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 90 }
    ]);

    const activityData = historicalActivity.map(d => ({
      date: d._id,
      value: d.count
    }));

    // Apply forecasting
    const forecast = statisticalModels.forecastNextPeriods(activityData, 14);
    const regression = statisticalModels.linearRegression(activityData);

    // Risk assessment using Monte Carlo
    const currentActivity = activityData.length > 0 
      ? activityData[activityData.length - 1].value 
      : 0;
    const volatility = activityData.length > 1 
      ? statisticalModels.calculateStatistics(activityData.map(d => d.value)).stdDev / 
        statisticalModels.calculateStatistics(activityData.map(d => d.value)).mean
      : 0.2;

    const riskAssessment = statisticalModels.monteCarloSimulation(
      currentActivity,
      volatility,
      1000
    );

    return {
      activity_forecast: {
        next_14_days: forecast,
        trend: regression.trend,
        confidence: Math.round(regression.r2 * 100)
      },
      risk_assessment: {
        expected_activity: Math.round(riskAssessment.mean * 100) / 100,
        volatility: Math.round(volatility * 100),
        confidence_interval_90: {
          lower: Math.round(riskAssessment.percentile5 * 100) / 100,
          upper: Math.round(riskAssessment.percentile95 * 100) / 100
        }
      },
      recommendations: this.generateRecommendations(userStats, regression.trend),
      churn_risk: this.assessChurnRisk(userStats, regression.trend)
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(userStats, trend) {
    const recommendations = [];

    if (trend === 'decreasing') {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        message: 'Your activity is declining. Try joining more matches this week!',
        action: 'browse_matches'
      });
    }

    if (userStats.attendance_rate < 70) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Improve your attendance rate by confirming matches you can attend',
        action: 'review_commitments'
      });
    }

    if (userStats.average_rating < 3.5 && userStats.total_ratings > 5) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Work on your match performance to improve your rating',
        action: 'view_tips'
      });
    }

    if (userStats.friends_count < 5) {
      recommendations.push({
        type: 'social',
        priority: 'low',
        message: 'Connect with more players to enhance your experience',
        action: 'find_friends'
      });
    }

    return recommendations;
  }

  /**
   * Assess churn risk
   */
  assessChurnRisk(userStats, trend) {
    let riskScore = 0;

    // Activity trend
    if (trend === 'decreasing') riskScore += 30;
    else if (trend === 'stable') riskScore += 10;

    // Attendance rate
    if (userStats.attendance_rate < 50) riskScore += 25;
    else if (userStats.attendance_rate < 70) riskScore += 15;

    // Last activity
    const daysSinceActive = (Date.now() - new Date(userStats.last_activity)) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > 14) riskScore += 30;
    else if (daysSinceActive > 7) riskScore += 15;

    // Engagement
    if (userStats.matches_completed < 5) riskScore += 15;

    return {
      risk_score: Math.min(100, riskScore),
      risk_level: riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low',
      factors: {
        activity_trend: trend,
        days_since_active: Math.round(daysSinceActive),
        attendance_rate: userStats.attendance_rate,
        engagement_level: userStats.matches_completed
      }
    };
  }

  /**
   * Get user leaderboard with rankings
   */
  async getLeaderboard(type = 'points', limit = 50) {
    const cacheKey = `analytics:leaderboard:${type}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const MatchUser = require('../models/MatchUser');
    
    let sortField = 'total_points';
    let displayField = 'totalPoints';

    if (type === 'wins') {
      sortField = 'matches_won';
      displayField = 'totalWins';
    } else if (type === 'matches') {
      sortField = 'matches_completed';
      displayField = 'totalMatches';
    }

    const leaderboard = await UserStats.find()
      .populate('user_id', 'name email profilePicture')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .lean();

    const formatted = leaderboard.map((stat, index) => ({
      rank: index + 1,
      _id: stat.user_id?._id || stat.user_id,
      name: stat.user_id?.name || stat.username || 'Unknown',
      email: stat.user_id?.email,
      profilePicture: stat.user_id?.profilePicture,
      totalPoints: stat.total_points || 0,
      totalWins: stat.matches_won || 0,
      totalMatches: stat.matches_completed || 0,
      attendanceRate: stat.attendance_rate || 0,
      averageRating: stat.average_rating || 0
    }));

    await cache.set(cacheKey, formatted, 600); // 10 minutes
    return formatted;
  }
}

module.exports = new AnalyticsService();

