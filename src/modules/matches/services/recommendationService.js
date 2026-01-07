const Match = require('../models/Match');
const Participation = require('../models/Participation');
const UserStats = require('../models/UserStats');
const SwipeAction = require('../models/SwipeAction');
const cache = require('../utils/cache');

/**
 * AI-Powered Recommendation Engine
 * Smart match recommendations based on multiple factors
 */

class RecommendationService {
  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId, limit = 20) {
    try {
      // Check cache
      const cacheKey = `recommendations:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user profile and stats
      const [stats, userHistory, userSwipes] = await Promise.all([
        UserStats.findOne({ user_id: userId }),
        this.getUserMatchHistory(userId),
        this.getUserSwipeHistory(userId)
      ]);

      // Build recommendation model
      const model = this.buildUserModel(stats, userHistory, userSwipes);

      // Get candidate matches
      const candidates = await this.getCandidateMatches(userId, limit * 2);

      // Score each match
      const scoredMatches = candidates.map(match => ({
        ...match,
        score: this.scoreMatch(match, model),
        reasons: this.generateRecommendationReasons(match, model)
      }));

      // Sort by score and get top N
      const recommendations = scoredMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache for 10 minutes
      await cache.set(cacheKey, recommendations, 600);

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Build user preference model
   */
  buildUserModel(stats, history, swipes) {
    const model = {
      sports: {},
      cities: {},
      areas: {},
      levels: {},
      timeslots: {},
      matchSizes: [],
      swipePatterns: {
        right: [],
        left: [],
        up: []
      }
    };

    // Analyze match history
    history.forEach(participation => {
      const match = participation.match_id;
      if (!match) return;

      model.sports[match.sport] = (model.sports[match.sport] || 0) + 1;
      model.cities[match.city] = (model.cities[match.city] || 0) + 1;
      model.levels[match.level] = (model.levels[match.level] || 0) + 1;
      
      if (match.max_players) {
        model.matchSizes.push(match.max_players);
      }

      // Analyze time preferences
      const hour = parseInt(match.time?.split(':')[0] || 0);
      const slot = this.getTimeSlot(hour);
      model.timeslots[slot] = (model.timeslots[slot] || 0) + 1;
    });

    // Analyze swipe patterns
    swipes.forEach(swipe => {
      const match = swipe.match_id;
      if (!match) return;

      if (swipe.direction === 'right' || swipe.direction === 'up') {
        model.swipePatterns.right.push(match);
      } else {
        model.swipePatterns.left.push(match);
      }
    });

    return model;
  }

  /**
   * Score a match against user model
   */
  scoreMatch(match, model) {
    let score = 0;

    // Sport preference (weight: 25)
    const sportCount = model.sports[match.sport] || 0;
    const maxSportCount = Math.max(...Object.values(model.sports), 1);
    score += (sportCount / maxSportCount) * 25;

    // City preference (weight: 20)
    const cityCount = model.cities[match.city] || 0;
    const maxCityCount = Math.max(...Object.values(model.cities), 1);
    score += (cityCount / maxCityCount) * 20;

    // Level preference (weight: 15)
    const levelCount = model.levels[match.level] || 0;
    const maxLevelCount = Math.max(...Object.values(model.levels), 1);
    score += (levelCount / maxLevelCount) * 15;

    // Time slot preference (weight: 10)
    const hour = parseInt(match.time?.split(':')[0] || 0);
    const slot = this.getTimeSlot(hour);
    const slotCount = model.timeslots[slot] || 0;
    const maxSlotCount = Math.max(...Object.values(model.timeslots), 1);
    score += (slotCount / maxSlotCount) * 10;

    // Match size preference (weight: 10)
    if (model.matchSizes.length > 0) {
      const avgSize = model.matchSizes.reduce((a, b) => a + b, 0) / model.matchSizes.length;
      const sizeDiff = Math.abs(match.max_players - avgSize);
      score += Math.max(0, 10 - sizeDiff);
    } else {
      score += 5; // Default
    }

    // Availability (weight: 10)
    const availability = (match.max_players - match.current_players) / match.max_players;
    score += availability * 10;

    // Urgency (weight: 5)
    const daysUntil = (new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 7) {
      score += 5;
    }

    // Cost factor (weight: 5)
    if (!match.cost_per_player || match.cost_per_player === 0) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get candidate matches
   */
  async getCandidateMatches(userId, limit) {
    // Get matches user hasn't joined or swiped on
    const joinedMatches = await Participation.find({ user_id: userId })
      .select('match_id')
      .lean();
    
    const swipedMatches = await SwipeAction.find({ user_id: userId })
      .select('match_id')
      .lean();

    const excludeIds = [
      ...joinedMatches.map(p => p.match_id),
      ...swipedMatches.map(s => s.match_id)
    ];

    return await Match.find({
      _id: { $nin: excludeIds },
      status: 'open',
      date: { $gte: new Date() },
      $expr: { $lt: ['$current_players', '$max_players'] }
    })
      .populate('owner_id', 'name email')
      .limit(limit)
      .lean();
  }

  /**
   * Get user match history
   */
  async getUserMatchHistory(userId) {
    return await Participation.find({ user_id: userId })
      .populate('match_id')
      .sort({ joined_at: -1 })
      .limit(50)
      .lean();
  }

  /**
   * Get user swipe history
   */
  async getUserSwipeHistory(userId) {
    return await SwipeAction.find({ user_id: userId })
      .populate('match_id')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
  }

  /**
   * Get time slot from hour
   */
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Generate recommendation reasons
   */
  generateRecommendationReasons(match, model) {
    const reasons = [];

    // Sport preference
    const sportCount = model.sports[match.sport] || 0;
    if (sportCount > 2) {
      reasons.push({ 
        type: 'sport_match',
        text: `لعبت ${match.sport} ${sportCount} مرات`,
        icon: '⚽'
      });
    }

    // City preference
    const cityCount = model.cities[match.city] || 0;
    if (cityCount > 1) {
      reasons.push({
        type: 'city_match',
        text: `منطقتك المفضلة: ${match.city}`,
        icon: '📍'
      });
    }

    // Level match
    const maxLevel = Object.entries(model.levels).sort((a, b) => b[1] - a[1])[0];
    if (maxLevel && maxLevel[0] === match.level) {
      reasons.push({
        type: 'level_match',
        text: `مستواك: ${match.level}`,
        icon: '🎯'
      });
    }

    // Availability
    const spotsLeft = match.max_players - match.current_players;
    if (spotsLeft <= 3) {
      reasons.push({
        type: 'urgency',
        text: `${spotsLeft} أماكن فقط!`,
        icon: '⚡'
      });
    }

    // Soon
    const daysUntil = Math.ceil((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 2) {
      reasons.push({
        type: 'soon',
        text: `قريباً! خلال ${daysUntil} يوم`,
        icon: '🔥'
      });
    }

    // Free
    if (!match.cost_per_player || match.cost_per_player === 0) {
      reasons.push({
        type: 'free',
        text: 'مجانية',
        icon: '🎁'
      });
    }

    return reasons.slice(0, 3);
  }

  /**
   * Get "Similar to matches you liked"
   */
  async getSimilarMatches(userId, matchId, limit = 5) {
    const match = await Match.findById(matchId).lean();
    if (!match) return [];

    // Find similar matches
    const similar = await Match.find({
      _id: { $ne: matchId },
      sport: match.sport,
      level: match.level,
      city: match.city,
      status: 'open',
      date: { $gte: new Date() }
    })
      .populate('owner_id', 'name email')
      .limit(limit)
      .lean();

    return similar;
  }
}

module.exports = new RecommendationService();

