const Match = require('../models/Match');
const Participation = require('../models/Participation');
const UserStats = require('../models/UserStats');
const SwipeAction = require('../models/SwipeAction');
const cache = require('../utils/cache');

/**
 * Analytics & Statistics Service
 * Comprehensive analytics for matches system
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
}

module.exports = new AnalyticsService();

