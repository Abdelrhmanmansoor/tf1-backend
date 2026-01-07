const Match = require('../models/Match');
const MatchUser = require('../models/MatchUser');
const Participation = require('../models/Participation');
const cache = require('../utils/cache');

/**
 * Swipe System Service - Like Tinder/Kora for Matches
 * Users can swipe right (interested) or left (not interested) on matches
 */

class SwipeService {
  /**
   * Get personalized match recommendations for swipe
   * Uses smart algorithm based on user preferences and history
   */
  async getSwipeMatches(userId, limit = 10) {
    try {
      // Check cache first
      const cacheKey = `swipe:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const user = await MatchUser.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's match history for preferences
      const userParticipations = await Participation.find({ user_id: userId })
        .populate('match_id')
        .lean();

      // Extract preferences from history
      const preferences = this.extractUserPreferences(userParticipations);

      // Get matches user already swiped
      const swipedMatches = await this.getSwipedMatchIds(userId);

      // Get matches user already joined
      const joinedMatchIds = userParticipations.map(p => p.match_id?._id?.toString()).filter(Boolean);

      // Build query for recommended matches
      const query = {
        _id: { 
          $nin: [
            ...swipedMatches.map(id => id.toString()),
            ...joinedMatchIds
          ] 
        },
        status: 'open',
        date: { $gte: new Date() }, // Future matches only
        $expr: { 
          $lt: ['$current_players', '$max_players'] // Has space
        }
      };

      // Apply preference-based filters
      if (preferences.favoriteSports.length > 0) {
        query.sport = { $in: preferences.favoriteSports };
      }

      if (preferences.favoriteCities.length > 0) {
        query.city = { $in: preferences.favoriteCities };
      }

      if (preferences.preferredLevel) {
        query.level = preferences.preferredLevel;
      }

      // Get matches with smart scoring
      let matches = await Match.find(query)
        .populate('owner_id', 'name email')
        .sort({ date: 1 })
        .limit(limit * 2) // Get more for filtering
        .lean();

      // Score and rank matches
      matches = matches.map(match => ({
        ...match,
        swipeScore: this.calculateMatchScore(match, preferences, user)
      }));

      // Sort by score and get top matches
      matches = matches
        .sort((a, b) => b.swipeScore - a.swipeScore)
        .slice(0, limit);

      // Add swipe metadata
      const enrichedMatches = matches.map(match => ({
        ...match,
        swipeId: `${userId}_${match._id}`,
        distanceFromUser: this.calculateDistance(user, match),
        compatibilityScore: Math.round(match.swipeScore),
        reasonsToJoin: this.generateReasons(match, preferences)
      }));

      // Cache for 5 minutes
      await cache.set(cacheKey, enrichedMatches, 300);

      return enrichedMatches;
    } catch (error) {
      console.error('Error getting swipe matches:', error);
      throw error;
    }
  }

  /**
   * Handle swipe action
   */
  async handleSwipe(userId, matchId, direction) {
    try {
      const validDirections = ['right', 'left', 'up'];
      if (!validDirections.includes(direction)) {
        throw new Error('Invalid swipe direction');
      }

      // Store swipe action
      const SwipeAction = require('../models/SwipeAction');
      const swipe = await SwipeAction.create({
        user_id: userId,
        match_id: matchId,
        direction,
        timestamp: new Date()
      });

      // If swipe right, auto-join or add to interested list
      if (direction === 'right') {
        await this.handleSwipeRight(userId, matchId);
      }

      // If swipe up (super like), give priority
      if (direction === 'up') {
        await this.handleSuperLike(userId, matchId);
      }

      // Invalidate cache
      await cache.del(`swipe:${userId}`);

      return {
        success: true,
        swipe,
        action: direction === 'right' ? 'interested' : direction === 'up' ? 'super_like' : 'passed'
      };
    } catch (error) {
      console.error('Error handling swipe:', error);
      throw error;
    }
  }

  /**
   * Handle swipe right (interested)
   */
  async handleSwipeRight(userId, matchId) {
    const match = await Match.findById(matchId);
    if (!match) return;

    // Check if match has space
    if (match.current_players < match.max_players) {
      // Auto-add to interested list
      const InterestedUser = require('../models/InterestedUser');
      await InterestedUser.findOneAndUpdate(
        { user_id: userId, match_id: matchId },
        { 
          user_id: userId, 
          match_id: matchId,
          interested_at: new Date(),
          priority: 'normal'
        },
        { upsert: true, new: true }
      );

      // Notify match owner
      await this.notifyMatchOwner(match.owner_id, userId, 'interested');
    }
  }

  /**
   * Handle super like (swipe up)
   */
  async handleSuperLike(userId, matchId) {
    const match = await Match.findById(matchId);
    if (!match) return;

    const InterestedUser = require('../models/InterestedUser');
    await InterestedUser.findOneAndUpdate(
      { user_id: userId, match_id: matchId },
      { 
        user_id: userId, 
        match_id: matchId,
        interested_at: new Date(),
        priority: 'high', // Super like gets priority
        super_like: true
      },
      { upsert: true, new: true }
    );

    // Notify match owner with special notification
    await this.notifyMatchOwner(match.owner_id, userId, 'super_like');
  }

  /**
   * Extract user preferences from history
   */
  extractUserPreferences(participations) {
    const preferences = {
      favoriteSports: [],
      favoriteCities: [],
      favoriteAreas: [],
      preferredLevel: null,
      preferredTimeRanges: [],
      avgMatchSize: 0
    };

    if (participations.length === 0) {
      return preferences;
    }

    // Count sports
    const sportCounts = {};
    const cityCounts = {};
    const levelCounts = {};
    let totalPlayers = 0;

    participations.forEach(p => {
      const match = p.match_id;
      if (!match) return;

      // Sports
      if (match.sport) {
        sportCounts[match.sport] = (sportCounts[match.sport] || 0) + 1;
      }

      // Cities
      if (match.city) {
        cityCounts[match.city] = (cityCounts[match.city] || 0) + 1;
      }

      // Levels
      if (match.level) {
        levelCounts[match.level] = (levelCounts[match.level] || 0) + 1;
      }

      // Players
      if (match.max_players) {
        totalPlayers += match.max_players;
      }
    });

    // Get top 3 sports
    preferences.favoriteSports = Object.entries(sportCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sport]) => sport);

    // Get top 3 cities
    preferences.favoriteCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([city]) => city);

    // Get most common level
    const topLevel = Object.entries(levelCounts)
      .sort((a, b) => b[1] - a[1])[0];
    if (topLevel) {
      preferences.preferredLevel = topLevel[0];
    }

    // Average match size
    preferences.avgMatchSize = Math.round(totalPlayers / participations.length);

    return preferences;
  }

  /**
   * Calculate match score based on preferences
   */
  calculateMatchScore(match, preferences, user) {
    let score = 50; // Base score

    // Sport match
    if (preferences.favoriteSports.includes(match.sport)) {
      score += 30;
    }

    // City match
    if (preferences.favoriteCities.includes(match.city)) {
      score += 20;
    }

    // Level match
    if (match.level === preferences.preferredLevel) {
      score += 15;
    }

    // Match size similarity
    if (match.max_players && preferences.avgMatchSize) {
      const sizeDiff = Math.abs(match.max_players - preferences.avgMatchSize);
      score += Math.max(0, 10 - sizeDiff);
    }

    // Availability (how full is the match)
    const availability = (match.max_players - match.current_players) / match.max_players;
    score += availability * 10;

    // Time proximity (sooner matches score higher)
    const daysUntilMatch = (new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntilMatch <= 7) {
      score += 10;
    }

    // Cost factor (free or low cost matches score higher)
    if (!match.cost_per_player || match.cost_per_player === 0) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get swiped match IDs for user
   */
  async getSwipedMatchIds(userId) {
    const SwipeAction = require('../models/SwipeAction');
    const swipes = await SwipeAction.find({ user_id: userId })
      .select('match_id')
      .lean();
    
    return swipes.map(s => s.match_id);
  }

  /**
   * Calculate distance (placeholder - can be enhanced with actual geolocation)
   */
  calculateDistance(user, match) {
    // Placeholder - return null or calculate based on location_id
    return null;
  }

  /**
   * Generate reasons to join
   */
  generateReasons(match, preferences) {
    const reasons = [];

    if (preferences.favoriteSports.includes(match.sport)) {
      reasons.push(`رياضتك المفضلة: ${match.sport}`);
    }

    if (preferences.favoriteCities.includes(match.city)) {
      reasons.push(`في مدينتك: ${match.city}`);
    }

    if (match.level === preferences.preferredLevel) {
      reasons.push(`مستواك: ${match.level}`);
    }

    const availability = match.max_players - match.current_players;
    if (availability <= 3) {
      reasons.push(`${availability} أماكن متبقية فقط!`);
    }

    const daysUntil = Math.ceil((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 2) {
      reasons.push(`قريبة! خلال ${daysUntil} يوم`);
    }

    if (!match.cost_per_player || match.cost_per_player === 0) {
      reasons.push('مجانية! 🎉');
    }

    return reasons.slice(0, 3); // Max 3 reasons
  }

  /**
   * Notify match owner
   */
  async notifyMatchOwner(ownerId, interestedUserId, type) {
    const MatchNotification = require('../models/MatchNotification');
    
    await MatchNotification.create({
      user_id: ownerId,
      type: type === 'super_like' ? 'super_like_received' : 'interest_received',
      payload: {
        interested_user_id: interestedUserId,
        timestamp: new Date()
      }
    });

    // Real-time notification via Socket.IO
    if (global.io) {
      global.io.to(`user:${ownerId}`).emit('new_interest', {
        user_id: interestedUserId,
        type
      });
    }
  }

  /**
   * Get interested users for a match
   */
  async getInterestedUsers(matchId) {
    const InterestedUser = require('../models/InterestedUser');
    
    const interested = await InterestedUser.find({ match_id: matchId })
      .populate('user_id', 'name email')
      .sort({ priority: -1, interested_at: -1 })
      .lean();

    return interested;
  }
}

module.exports = new SwipeService();

