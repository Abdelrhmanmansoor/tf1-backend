/**
 * KPI Service
 * Key Performance Indicators tracking
 */

const Match = require('../models/Match');
const MatchUser = require('../models/MatchUser');
const Participation = require('../models/Participation');

class KPIService {
  async getDashboardKPIs(period = 'month') {
    const dates = this.getPeriodDates(period);

    const [
      newUsers,
      newMatches,
      totalParticipations,
      activeUsers
    ] = await Promise.all([
      MatchUser.countDocuments({ created_at: { $gte: dates.start } }),
      Match.countDocuments({ created_at: { $gte: dates.start } }),
      Participation.countDocuments({ joined_at: { $gte: dates.start } }),
      Participation.distinct('user_id', { joined_at: { $gte: dates.start } })
    ]);

    return {
      period,
      new_users: newUsers,
      new_matches: newMatches,
      total_participations: totalParticipations,
      active_users: activeUsers.length,
      avg_matches_per_user: activeUsers.length > 0 ? totalParticipations / activeUsers.length : 0
    };
  }

  async getCohortAnalysis(cohortDate) {
    // Implement cohort analysis
    return {};
  }

  async getFunnelAnalysis(startDate, endDate) {
    // Implement funnel analysis
    return {};
  }

  getPeriodDates(period) {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now };
  }
}

module.exports = new KPIService();
