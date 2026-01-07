const MatchNotification = require('../models/MatchNotification');

/**
 * Mobile App Integration Service
 * Push notifications, deep links, mobile-optimized responses
 */

class MobileService {
  /**
   * Register device for push notifications
   */
  async registerDevice(userId, deviceToken, platform) {
    const DeviceToken = require('../models/DeviceToken');
    
    const device = await DeviceToken.findOneAndUpdate(
      { user_id: userId, device_token: deviceToken },
      {
        user_id: userId,
        device_token: deviceToken,
        platform, // 'ios' or 'android'
        active: true,
        last_used: new Date()
      },
      { upsert: true, new: true }
    );

    return device;
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, notification) {
    const DeviceToken = require('../models/DeviceToken');
    
    const devices = await DeviceToken.find({
      user_id: userId,
      active: true
    });

    if (devices.length === 0) {
      return { sent: 0 };
    }

    // Here you would integrate with FCM (Firebase) or APNS (Apple)
    // For now, we'll store for later sending
    const promises = devices.map(device => {
      return this.queuePushNotification(device, notification);
    });

    await Promise.all(promises);

    return { sent: devices.length };
  }

  /**
   * Queue push notification for sending
   */
  async queuePushNotification(device, notification) {
    const PushQueue = require('../models/PushQueue');
    
    return await PushQueue.create({
      device_id: device._id,
      user_id: device.user_id,
      platform: device.platform,
      device_token: device.device_token,
      notification: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {}
      },
      status: 'queued',
      scheduled_at: new Date()
    });
  }

  /**
   * Generate deep link for match
   */
  generateDeepLink(matchId, action = 'view') {
    const baseUrl = process.env.DEEP_LINK_URL || 'sportsapp://';
    return `${baseUrl}matches/${matchId}?action=${action}`;
  }

  /**
   * Get mobile-optimized match data
   */
  async getMobileMatch(matchId) {
    const Match = require('../models/Match');
    const match = await Match.findById(matchId)
      .populate('owner_id', 'name email')
      .lean();

    if (!match) return null;

    // Mobile-optimized response (smaller payload)
    return {
      id: match._id,
      title: match.title,
      sport: match.sport,
      city: match.city,
      area: match.area,
      location: match.location,
      date: match.date,
      time: match.time,
      level: match.level,
      players: {
        current: match.current_players,
        max: match.max_players,
        available: match.max_players - match.current_players
      },
      cost: {
        amount: match.cost_per_player || 0,
        currency: match.currency || 'SAR'
      },
      status: match.status,
      owner: {
        id: match.owner_id._id,
        name: match.owner_id.name
      },
      deep_link: this.generateDeepLink(matchId),
      share_link: this.generateShareLink(matchId)
    };
  }

  /**
   * Generate share link
   */
  generateShareLink(matchId) {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.sportsplatform.com';
    return `${baseUrl}/matches/${matchId}?utm_source=share&utm_medium=mobile`;
  }

  /**
   * Get mobile dashboard data (optimized payload)
   */
  async getMobileDashboard(userId) {
    const [upcomingMatches, recommendations, stats] = await Promise.all([
      this.getMobileUpcoming(userId, 5),
      this.getMobileRecommendations(userId, 10),
      this.getMobileStats(userId)
    ]);

    return {
      upcoming: upcomingMatches,
      recommended: recommendations,
      stats,
      version: '2.1.0',
      update_available: false
    };
  }

  /**
   * Get mobile-optimized upcoming matches
   */
  async getMobileUpcoming(userId, limit) {
    const Participation = require('../models/Participation');
    const participations = await Participation.find({ user_id: userId })
      .populate({
        path: 'match_id',
        match: { date: { $gte: new Date() } },
        populate: { path: 'owner_id', select: 'name' }
      })
      .sort({ 'match_id.date': 1 })
      .limit(limit)
      .lean();

    return participations
      .map(p => p.match_id)
      .filter(Boolean)
      .map(match => ({
        id: match._id,
        title: match.title,
        sport: match.sport,
        date: match.date,
        time: match.time,
        location: `${match.city}, ${match.area}`,
        players: `${match.current_players}/${match.max_players}`,
        deep_link: this.generateDeepLink(match._id)
      }));
  }

  /**
   * Get mobile-optimized recommendations
   */
  async getMobileRecommendations(userId, limit) {
    const recommendationService = require('./recommendationService');
    const recs = await recommendationService.getRecommendations(userId, limit);

    return recs.map(match => ({
      id: match._id,
      title: match.title,
      sport: match.sport,
      location: `${match.city}, ${match.area}`,
      date: match.date,
      time: match.time,
      score: match.score,
      reasons: match.reasons?.slice(0, 2), // Max 2 reasons for mobile
      image: this.getMatchImage(match.sport),
      deep_link: this.generateDeepLink(match._id)
    }));
  }

  /**
   * Get mobile stats summary
   */
  async getMobileStats(userId) {
    const stats = await UserStats.findOne({ user_id: userId });

    if (!stats) {
      return {
        level: 1,
        points: 0,
        matches: 0,
        badges: 0
      };
    }

    return {
      level: stats.current_level,
      points: stats.total_points,
      matches: stats.matches_completed,
      badges: stats.badges.length,
      streak: stats.current_streak,
      is_premium: stats.is_premium
    };
  }

  /**
   * Get match image based on sport
   */
  getMatchImage(sport) {
    const images = {
      'Football': '/images/sports/football.jpg',
      'Basketball': '/images/sports/basketball.jpg',
      'Volleyball': '/images/sports/volleyball.jpg',
      'Tennis': '/images/sports/tennis.jpg',
      'Padel': '/images/sports/padel.jpg'
    };

    return images[sport] || '/images/sports/default.jpg';
  }

  /**
   * Track app events (for analytics)
   */
  async trackAppEvent(userId, eventName, eventData = {}) {
    const AppEvent = require('../models/AppEvent');
    
    await AppEvent.create({
      user_id: userId,
      event_name: eventName,
      event_data: eventData,
      timestamp: new Date(),
      platform: eventData.platform || 'unknown'
    });
  }

  /**
   * Get app configuration for mobile
   */
  async getAppConfig() {
    return {
      version: '2.1.0',
      min_version: '2.0.0',
      force_update: false,
      features: {
        swipe_enabled: true,
        premium_enabled: true,
        social_enabled: true,
        chat_enabled: true
      },
      api_endpoints: {
        base: process.env.API_URL || 'https://api.sportsplatform.com',
        socket: process.env.SOCKET_URL || 'https://api.sportsplatform.com'
      },
      deep_link_scheme: 'sportsapp://',
      support: {
        email: 'support@sportsplatform.com',
        phone: '+966500000000'
      }
    };
  }
}

module.exports = new MobileService();

