const UserStats = require('../models/UserStats');
const MatchNotification = require('../models/MatchNotification');

/**
 * Gamification Service
 * Points, Badges, Achievements, Levels, Streaks
 */

class GamificationService {
  // Points system
  POINTS = {
    CREATE_MATCH: 10,
    JOIN_MATCH: 5,
    COMPLETE_MATCH: 20,
    SUPER_LIKE_RECEIVED: 3,
    RATING_RECEIVED: 2,
    PERFECT_ATTENDANCE: 50,
    WEEK_STREAK: 15,
    INVITE_FRIEND: 10,
    FIRST_MATCH: 25
  };

  // Badges
  BADGES = {
    ORGANIZER_BRONZE: { id: 'org_bronze', name: 'منظم برونزي', name_en: 'Bronze Organizer', requirement: 'matches_created', threshold: 5 },
    ORGANIZER_SILVER: { id: 'org_silver', name: 'منظم فضي', name_en: 'Silver Organizer', requirement: 'matches_created', threshold: 20 },
    ORGANIZER_GOLD: { id: 'org_gold', name: 'منظم ذهبي', name_en: 'Gold Organizer', requirement: 'matches_created', threshold: 50 },
    
    PLAYER_BRONZE: { id: 'player_bronze', name: 'لاعب برونزي', name_en: 'Bronze Player', requirement: 'matches_joined', threshold: 10 },
    PLAYER_SILVER: { id: 'player_silver', name: 'لاعب فضي', name_en: 'Silver Player', requirement: 'matches_joined', threshold: 50 },
    PLAYER_GOLD: { id: 'player_gold', name: 'لاعب ذهبي', name_en: 'Gold Player', requirement: 'matches_joined', threshold: 100 },
    
    RELIABLE: { id: 'reliable', name: 'موثوق', name_en: 'Reliable', requirement: 'reliability_score', threshold: 95 },
    STAR_PLAYER: { id: 'star', name: 'نجم', name_en: 'Star Player', requirement: 'average_rating', threshold: 4.5 },
    SOCIAL_BUTTERFLY: { id: 'social', name: 'اجتماعي', name_en: 'Social Butterfly', requirement: 'friends_count', threshold: 20 },
    STREAK_MASTER: { id: 'streak', name: 'سيد السلاسل', name_en: 'Streak Master', requirement: 'current_streak', threshold: 4 }
  };

  /**
   * Get or create user stats
   */
  async getUserStats(userId) {
    let stats = await UserStats.findOne({ user_id: userId });
    
    if (!stats) {
      stats = await UserStats.create({
        user_id: userId,
        total_points: 0,
        current_level: 1
      });
    }

    return stats;
  }

  /**
   * Award points to user
   */
  async awardPoints(userId, pointType, amount = null) {
    const stats = await this.getUserStats(userId);
    const points = amount || this.POINTS[pointType] || 0;

    stats.total_points += points;
    
    // Calculate new level (every 100 points = 1 level)
    const newLevel = Math.floor(stats.total_points / 100) + 1;
    const leveledUp = newLevel > stats.current_level;
    
    if (leveledUp) {
      stats.current_level = newLevel;
      
      // Notify user of level up
      await this.notifyLevelUp(userId, newLevel);
    }

    await stats.save();

    // Check for new badges
    await this.checkAndAwardBadges(userId, stats);

    return {
      points_awarded: points,
      total_points: stats.total_points,
      level: stats.current_level,
      leveled_up: leveledUp
    };
  }

  /**
   * Update match statistics
   */
  async updateMatchStats(userId, action) {
    const stats = await this.getUserStats(userId);

    switch (action) {
      case 'create':
        stats.matches_created++;
        await this.awardPoints(userId, 'CREATE_MATCH');
        break;
      case 'join':
        stats.matches_joined++;
        await this.awardPoints(userId, 'JOIN_MATCH');
        break;
      case 'complete':
        stats.matches_completed++;
        await this.awardPoints(userId, 'COMPLETE_MATCH');
        break;
      case 'cancel':
        stats.matches_cancelled++;
        break;
    }

    await stats.save();
    await this.checkAndAwardBadges(userId, stats);

    return stats;
  }

  /**
   * Update swipe statistics
   */
  async updateSwipeStats(userId, direction) {
    const stats = await this.getUserStats(userId);

    stats.total_swipes++;
    if (direction === 'right') {
      stats.swipes_right++;
    } else if (direction === 'left') {
      stats.swipes_left++;
    } else if (direction === 'up') {
      stats.super_likes_given++;
    }

    await stats.save();

    return stats;
  }

  /**
   * Update streak
   */
  async updateStreak(userId) {
    const stats = await this.getUserStats(userId);
    const now = new Date();
    const lastActivity = stats.last_activity;

    // Check if activity is within same week
    const lastWeek = this.getWeekNumber(lastActivity);
    const currentWeek = this.getWeekNumber(now);

    if (currentWeek === lastWeek + 1) {
      // Consecutive week
      stats.current_streak++;
      if (stats.current_streak > stats.longest_streak) {
        stats.longest_streak = stats.current_streak;
      }
      await this.awardPoints(userId, 'WEEK_STREAK');
    } else if (currentWeek > lastWeek + 1) {
      // Streak broken
      stats.current_streak = 1;
    }

    stats.last_activity = now;
    await stats.save();

    return stats;
  }

  /**
   * Check and award badges
   */
  async checkAndAwardBadges(userId, stats) {
    const newBadges = [];

    for (const [badgeKey, badge] of Object.entries(this.BADGES)) {
      // Check if user already has this badge
      const hasBadge = stats.badges.some(b => b.badge_id === badge.id);
      if (hasBadge) continue;

      // Check if user meets requirement
      const statValue = stats[badge.requirement];
      if (statValue >= badge.threshold) {
        stats.badges.push({
          badge_id: badge.id,
          name: badge.name,
          earned_at: new Date()
        });
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      await stats.save();
      
      // Notify user of new badges
      for (const badge of newBadges) {
        await this.notifyBadgeEarned(userId, badge);
      }
    }

    return newBadges;
  }

  /**
   * Get week number from date
   */
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type = 'points', limit = 50) {
    const sortField = {
      points: 'total_points',
      matches: 'matches_completed',
      streak: 'current_streak',
      rating: 'average_rating'
    }[type] || 'total_points';

    const leaderboard = await UserStats.find()
      .populate('user_id', 'name email')
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean();

    return leaderboard.map((stat, index) => ({
      rank: index + 1,
      user: stat.user_id,
      score: stat[sortField],
      level: stat.current_level,
      badges: stat.badges.length
    }));
  }

  /**
   * Notify level up
   */
  async notifyLevelUp(userId, newLevel) {
    await MatchNotification.create({
      user_id: userId,
      type: 'level_up',
      payload: {
        new_level: newLevel,
        timestamp: new Date()
      }
    });

    if (global.io) {
      global.io.to(`user:${userId}`).emit('level_up', {
        level: newLevel
      });
    }
  }

  /**
   * Notify badge earned
   */
  async notifyBadgeEarned(userId, badge) {
    await MatchNotification.create({
      user_id: userId,
      type: 'badge_earned',
      payload: {
        badge_id: badge.id,
        badge_name: badge.name,
        timestamp: new Date()
      }
    });

    if (global.io) {
      global.io.to(`user:${userId}`).emit('badge_earned', {
        badge
      });
    }
  }

  /**
   * Get user's achievements summary
   */
  async getAchievementsSummary(userId) {
    const stats = await this.getUserStats(userId);

    return {
      level: stats.current_level,
      points: stats.total_points,
      points_to_next_level: (stats.current_level * 100) - stats.total_points,
      badges: stats.badges,
      current_streak: stats.current_streak,
      longest_streak: stats.longest_streak,
      matches: {
        created: stats.matches_created,
        joined: stats.matches_joined,
        completed: stats.matches_completed
      },
      ratings: {
        average: stats.average_rating,
        total: stats.total_ratings
      },
      reliability: stats.reliability_score
    };
  }
}

module.exports = new GamificationService();


