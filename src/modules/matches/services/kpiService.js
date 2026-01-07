/**
 * Key Performance Indicators (KPI) Service
 * Advanced metrics and business intelligence
 */

const Match = require('../models/Match');
const Participation = require('../models/Participation');
const UserStats = require('../models/UserStats');
const SwipeAction = require('../models/SwipeAction');
const statisticalModels = require('./statisticalModels');
const cache = require('../utils/cache');

class KPIService {
  /**
   * Get Comprehensive Dashboard KPIs
   */
  async getDashboardKPIs(period = 'month') {
    const cacheKey = `kpi:dashboard:${period}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const periodData = this.getPeriodDates(period);
    const previousPeriodData = this.getPeriodDates(period, true);

    const [
      currentMetrics,
      previousMetrics,
      conversionMetrics,
      engagementMetrics,
      revenueMetrics
    ] = await Promise.all([
      this.getBasicMetrics(periodData.start, periodData.end),
      this.getBasicMetrics(previousPeriodData.start, previousPeriodData.end),
      this.getConversionMetrics(periodData.start, periodData.end),
      this.getEngagementMetrics(periodData.start, periodData.end),
      this.getRevenueMetrics(periodData.start, periodData.end)
    ]);

    const kpis = {
      // Growth KPIs
      growth: {
        matches_created: {
          current: currentMetrics.matches,
          previous: previousMetrics.matches,
          change: this.calculateChange(previousMetrics.matches, currentMetrics.matches),
          change_percent: this.calculateChangePercent(previousMetrics.matches, currentMetrics.matches),
          trend: this.getTrend(previousMetrics.matches, currentMetrics.matches)
        },
        new_users: {
          current: currentMetrics.newUsers,
          previous: previousMetrics.newUsers,
          change: this.calculateChange(previousMetrics.newUsers, currentMetrics.newUsers),
          change_percent: this.calculateChangePercent(previousMetrics.newUsers, currentMetrics.newUsers),
          trend: this.getTrend(previousMetrics.newUsers, currentMetrics.newUsers)
        },
        total_participations: {
          current: currentMetrics.participations,
          previous: previousMetrics.participations,
          change: this.calculateChange(previousMetrics.participations, currentMetrics.participations),
          change_percent: this.calculateChangePercent(previousMetrics.participations, currentMetrics.participations),
          trend: this.getTrend(previousMetrics.participations, currentMetrics.participations)
        }
      },

      // Engagement KPIs
      engagement: {
        active_users: {
          value: engagementMetrics.activeUsers,
          target: engagementMetrics.totalUsers * 0.3,
          achievement: this.calculateAchievement(engagementMetrics.activeUsers, engagementMetrics.totalUsers * 0.3),
          status: this.getStatus(engagementMetrics.activeUsers / engagementMetrics.totalUsers * 100, 20, 30)
        },
        daily_active_users: {
          value: engagementMetrics.dailyActive,
          avg_per_day: Math.round(engagementMetrics.dailyActive / this.getDaysInPeriod(period))
        },
        engagement_rate: {
          value: engagementMetrics.engagementRate,
          target: 25,
          achievement: this.calculateAchievement(engagementMetrics.engagementRate, 25),
          status: this.getStatus(engagementMetrics.engagementRate, 15, 25)
        },
        avg_sessions_per_user: {
          value: engagementMetrics.avgSessions,
          status: this.getStatus(engagementMetrics.avgSessions, 2, 5)
        }
      },

      // Conversion KPIs
      conversion: {
        swipe_to_join_rate: {
          value: conversionMetrics.swipeToJoin,
          target: 15,
          achievement: this.calculateAchievement(conversionMetrics.swipeToJoin, 15),
          status: this.getStatus(conversionMetrics.swipeToJoin, 10, 15)
        },
        match_fill_rate: {
          value: conversionMetrics.fillRate,
          target: 70,
          achievement: this.calculateAchievement(conversionMetrics.fillRate, 70),
          status: this.getStatus(conversionMetrics.fillRate, 50, 70)
        },
        match_completion_rate: {
          value: conversionMetrics.completionRate,
          target: 85,
          achievement: this.calculateAchievement(conversionMetrics.completionRate, 85),
          status: this.getStatus(conversionMetrics.completionRate, 70, 85)
        },
        user_retention_rate: {
          value: conversionMetrics.retentionRate,
          target: 60,
          achievement: this.calculateAchievement(conversionMetrics.retentionRate, 60),
          status: this.getStatus(conversionMetrics.retentionRate, 40, 60)
        }
      },

      // Quality KPIs
      quality: {
        avg_match_rating: {
          value: currentMetrics.avgRating,
          target: 4.0,
          achievement: this.calculateAchievement(currentMetrics.avgRating, 4.0),
          status: this.getStatus(currentMetrics.avgRating, 3.5, 4.0)
        },
        avg_attendance_rate: {
          value: currentMetrics.avgAttendance,
          target: 80,
          achievement: this.calculateAchievement(currentMetrics.avgAttendance, 80),
          status: this.getStatus(currentMetrics.avgAttendance, 65, 80)
        },
        cancellation_rate: {
          value: currentMetrics.cancellationRate,
          target: 10,
          achievement: currentMetrics.cancellationRate <= 10 ? 100 : (10 / currentMetrics.cancellationRate) * 100,
          status: this.getStatus(100 - currentMetrics.cancellationRate, 85, 90)
        }
      },

      // Revenue KPIs (if applicable)
      revenue: revenueMetrics,

      // Health Score (composite metric)
      health_score: this.calculateHealthScore({
        engagement: engagementMetrics.engagementRate,
        fill_rate: conversionMetrics.fillRate,
        completion: conversionMetrics.completionRate,
        quality: currentMetrics.avgRating * 20
      }),

      period: {
        type: period,
        start: periodData.start,
        end: periodData.end,
        days: this.getDaysInPeriod(period)
      },

      generated_at: new Date()
    };

    await cache.set(cacheKey, kpis, 600); // 10 minutes
    return kpis;
  }

  /**
   * Get Basic Metrics for a period
   */
  async getBasicMetrics(startDate, endDate) {
    const [
      matches,
      participations,
      newUsers,
      completedMatches,
      cancelledMatches,
      avgRatingData,
      avgAttendanceData
    ] = await Promise.all([
      Match.countDocuments({ created_at: { $gte: startDate, $lte: endDate } }),
      Participation.countDocuments({ joined_at: { $gte: startDate, $lte: endDate } }),
      require('../models/MatchUser').countDocuments({ created_at: { $gte: startDate, $lte: endDate } }),
      Match.countDocuments({ 
        status: 'finished',
        created_at: { $gte: startDate, $lte: endDate }
      }),
      Match.countDocuments({ 
        status: 'canceled',
        created_at: { $gte: startDate, $lte: endDate }
      }),
      UserStats.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$average_rating' } } }
      ]),
      UserStats.aggregate([
        { $group: { _id: null, avgAttendance: { $avg: '$attendance_rate' } } }
      ])
    ]);

    const totalCreated = matches;
    const cancellationRate = totalCreated > 0 ? (cancelledMatches / totalCreated) * 100 : 0;

    return {
      matches,
      participations,
      newUsers,
      completedMatches,
      cancelledMatches,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      avgRating: avgRatingData[0]?.avgRating || 0,
      avgAttendance: avgAttendanceData[0]?.avgAttendance || 0
    };
  }

  /**
   * Get Conversion Metrics
   */
  async getConversionMetrics(startDate, endDate) {
    const [swipes, joins, matches, users] = await Promise.all([
      SwipeAction.countDocuments({ 
        timestamp: { $gte: startDate, $lte: endDate },
        direction: { $in: ['right', 'up'] }
      }),
      Participation.countDocuments({ joined_at: { $gte: startDate, $lte: endDate } }),
      Match.find({ created_at: { $gte: startDate, $lte: endDate } }).lean(),
      Participation.distinct('user_id', { joined_at: { $gte: startDate, $lte: endDate } })
    ]);

    // Swipe to join conversion
    const swipeToJoin = swipes > 0 ? (joins / swipes) * 100 : 0;

    // Fill rate
    const fillRates = matches
      .filter(m => m.max_players > 0)
      .map(m => (m.current_players / m.max_players) * 100);
    const fillRate = fillRates.length > 0
      ? fillRates.reduce((sum, rate) => sum + rate, 0) / fillRates.length
      : 0;

    // Completion rate
    const completedMatches = matches.filter(m => m.status === 'finished').length;
    const completionRate = matches.length > 0 ? (completedMatches / matches.length) * 100 : 0;

    // Retention rate (users who joined multiple times)
    const usersWithMultipleJoins = await Participation.aggregate([
      {
        $match: { joined_at: { $gte: startDate, $lte: endDate } }
      },
      {
        $group: {
          _id: '$user_id',
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gte: 2 } }
      }
    ]);

    const retentionRate = users.length > 0 
      ? (usersWithMultipleJoins.length / users.length) * 100 
      : 0;

    return {
      swipeToJoin: Math.round(swipeToJoin * 100) / 100,
      fillRate: Math.round(fillRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100
    };
  }

  /**
   * Get Engagement Metrics
   */
  async getEngagementMetrics(startDate, endDate) {
    const [totalUsers, activeUsers, dailyActiveUsers, sessions] = await Promise.all([
      require('../models/MatchUser').countDocuments(),
      Participation.distinct('user_id', { joined_at: { $gte: startDate, $lte: endDate } }),
      Participation.aggregate([
        {
          $match: { joined_at: { $gte: startDate, $lte: endDate } }
        },
        {
          $group: {
            _id: {
              user: '$user_id',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$joined_at' } }
            }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            users: { $sum: 1 }
          }
        }
      ]),
      Participation.aggregate([
        {
          $match: { joined_at: { $gte: startDate, $lte: endDate } }
        },
        {
          $group: {
            _id: '$user_id',
            sessions: { $sum: 1 }
          }
        }
      ])
    ]);

    const engagementRate = totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0;
    const avgDailyActive = dailyActiveUsers.length > 0
      ? dailyActiveUsers.reduce((sum, day) => sum + day.users, 0) / dailyActiveUsers.length
      : 0;
    const avgSessions = sessions.length > 0
      ? sessions.reduce((sum, user) => sum + user.sessions, 0) / sessions.length
      : 0;

    return {
      totalUsers,
      activeUsers: activeUsers.length,
      dailyActive: Math.round(avgDailyActive),
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgSessions: Math.round(avgSessions * 100) / 100
    };
  }

  /**
   * Get Revenue Metrics
   */
  async getRevenueMetrics(startDate, endDate) {
    const matches = await Match.find({
      created_at: { $gte: startDate, $lte: endDate }
    }, 'cost_per_player current_players currency').lean();

    const revenueByMatch = matches.map(m => ({
      revenue: (m.cost_per_player || 0) * (m.current_players || 0),
      currency: m.currency || 'SAR'
    }));

    const totalRevenue = revenueByMatch.reduce((sum, r) => sum + r.revenue, 0);
    const avgRevenuePerMatch = matches.length > 0 ? totalRevenue / matches.length : 0;
    const paidMatches = matches.filter(m => m.cost_per_player > 0).length;

    return {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      avg_revenue_per_match: Math.round(avgRevenuePerMatch * 100) / 100,
      paid_matches: paidMatches,
      free_matches: matches.length - paidMatches,
      monetization_rate: matches.length > 0 ? (paidMatches / matches.length) * 100 : 0
    };
  }

  /**
   * Get Cohort Analysis
   */
  async getCohortAnalysis(cohortDate) {
    const cohortStart = new Date(cohortDate);
    const cohortEnd = new Date(cohortDate);
    cohortEnd.setMonth(cohortEnd.getMonth() + 1);

    // Get users who joined in this cohort
    const cohortUsers = await require('../models/MatchUser').find({
      created_at: { $gte: cohortStart, $lt: cohortEnd }
    }).distinct('_id');

    if (cohortUsers.length === 0) {
      return { cohort_size: 0, retention: [] };
    }

    // Calculate retention for each month
    const retention = [];
    const currentDate = new Date();
    let monthIndex = 0;

    while (cohortEnd.getTime() + (monthIndex * 30 * 24 * 60 * 60 * 1000) <= currentDate.getTime()) {
      const periodStart = new Date(cohortEnd.getTime() + (monthIndex * 30 * 24 * 60 * 60 * 1000));
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const activeInPeriod = await Participation.distinct('user_id', {
        user_id: { $in: cohortUsers },
        joined_at: { $gte: periodStart, $lt: periodEnd }
      });

      retention.push({
        month: monthIndex,
        active_users: activeInPeriod.length,
        retention_rate: Math.round((activeInPeriod.length / cohortUsers.length) * 100 * 100) / 100
      });

      monthIndex++;
      if (monthIndex >= 12) break; // Max 12 months
    }

    return {
      cohort_date: cohortDate,
      cohort_size: cohortUsers.length,
      retention
    };
  }

  /**
   * Get Funnel Analysis
   */
  async getFunnelAnalysis(startDate, endDate) {
    const [
      totalUsers,
      usersWhoSwiped,
      usersWhoJoined,
      usersWhoCompleted,
      usersWhoRated
    ] = await Promise.all([
      require('../models/MatchUser').countDocuments({ 
        created_at: { $gte: startDate, $lte: endDate } 
      }),
      SwipeAction.distinct('user_id', { 
        timestamp: { $gte: startDate, $lte: endDate } 
      }),
      Participation.distinct('user_id', { 
        joined_at: { $gte: startDate, $lte: endDate } 
      }),
      Participation.aggregate([
        {
          $match: { joined_at: { $gte: startDate, $lte: endDate } }
        },
        {
          $lookup: {
            from: 'ms_matches',
            localField: 'match_id',
            foreignField: '_id',
            as: 'match'
          }
        },
        {
          $unwind: '$match'
        },
        {
          $match: { 'match.status': 'finished' }
        },
        {
          $group: {
            _id: '$user_id'
          }
        }
      ]),
      require('../models/Rating').distinct('user_id', {
        created_at: { $gte: startDate, $lte: endDate }
      })
    ]);

    const funnel = [
      {
        stage: 'registration',
        users: totalUsers,
        conversion_from_previous: 100,
        drop_off: 0
      },
      {
        stage: 'browsing',
        users: usersWhoSwiped.length,
        conversion_from_previous: totalUsers > 0 ? (usersWhoSwiped.length / totalUsers) * 100 : 0,
        drop_off: totalUsers - usersWhoSwiped.length
      },
      {
        stage: 'joining',
        users: usersWhoJoined.length,
        conversion_from_previous: usersWhoSwiped.length > 0 ? (usersWhoJoined.length / usersWhoSwiped.length) * 100 : 0,
        drop_off: usersWhoSwiped.length - usersWhoJoined.length
      },
      {
        stage: 'completion',
        users: usersWhoCompleted.length,
        conversion_from_previous: usersWhoJoined.length > 0 ? (usersWhoCompleted.length / usersWhoJoined.length) * 100 : 0,
        drop_off: usersWhoJoined.length - usersWhoCompleted.length
      },
      {
        stage: 'rating',
        users: usersWhoRated.length,
        conversion_from_previous: usersWhoCompleted.length > 0 ? (usersWhoRated.length / usersWhoCompleted.length) * 100 : 0,
        drop_off: usersWhoCompleted.length - usersWhoRated.length
      }
    ];

    // Overall conversion rate (registration to rating)
    const overallConversion = totalUsers > 0 ? (usersWhoRated.length / totalUsers) * 100 : 0;

    return {
      funnel,
      overall_conversion: Math.round(overallConversion * 100) / 100,
      biggest_drop_off: funnel.reduce((max, stage) => 
        stage.drop_off > max.drop_off ? stage : max
      )
    };
  }

  /**
   * Helper Functions
   */

  getPeriodDates(period, previous = false) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        if (previous) {
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
        }
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - (previous ? 14 : 7));
        end = new Date(now);
        if (previous) end.setDate(end.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(start.getMonth() - (previous ? 2 : 1));
        end = new Date(now);
        if (previous) end.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(start.getMonth() - (previous ? 6 : 3));
        end = new Date(now);
        if (previous) end.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - (previous ? 2 : 1));
        end = new Date(now);
        if (previous) end.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        end = new Date(now);
    }

    return { start, end };
  }

  getDaysInPeriod(period) {
    switch (period) {
      case 'today': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  }

  calculateChange(oldValue, newValue) {
    return newValue - oldValue;
  }

  calculateChangePercent(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
  }

  getTrend(oldValue, newValue) {
    const change = this.calculateChangePercent(oldValue, newValue);
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  calculateAchievement(current, target) {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100 * 100) / 100);
  }

  getStatus(value, threshold1, threshold2) {
    if (value >= threshold2) return 'excellent';
    if (value >= threshold1) return 'good';
    if (value >= threshold1 * 0.7) return 'fair';
    return 'poor';
  }

  calculateHealthScore(metrics) {
    const weights = {
      engagement: 0.3,
      fill_rate: 0.25,
      completion: 0.25,
      quality: 0.2
    };

    const score = 
      (metrics.engagement * weights.engagement) +
      (metrics.fill_rate * weights.fill_rate) +
      (metrics.completion * weights.completion) +
      (metrics.quality * weights.quality);

    return {
      score: Math.round(score),
      rating: this.getStatus(score, 60, 75),
      breakdown: {
        engagement: Math.round(metrics.engagement * weights.engagement),
        fill_rate: Math.round(metrics.fill_rate * weights.fill_rate),
        completion: Math.round(metrics.completion * weights.completion),
        quality: Math.round(metrics.quality * weights.quality)
      }
    };
  }
}

module.exports = new KPIService();

