const UserStats = require('../models/UserStats');
const MatchNotification = require('../models/MatchNotification');

/**
 * Premium Features Service
 * Handle premium subscriptions and exclusive features
 */

class PremiumService {
  PREMIUM_FEATURES = {
    UNLIMITED_SWIPES: 'unlimited_swipes',
    UNDO_SWIPES: 'undo_swipes',
    SEE_WHO_LIKED: 'see_who_liked',
    SUPER_LIKES: 'super_likes',
    PRIORITY_SUPPORT: 'priority_support',
    ADVANCED_ANALYTICS: 'advanced_analytics',
    CUSTOM_BADGES: 'custom_badges',
    AD_FREE: 'ad_free',
    PRIORITY_MATCHING: 'priority_matching',
    VERIFIED_BADGE: 'verified_badge'
  };

  PREMIUM_PLANS = {
    MONTHLY: {
      id: 'monthly',
      name: 'شهري',
      name_en: 'Monthly',
      price: 29,
      currency: 'SAR',
      duration_days: 30,
      features: Object.values(this.PREMIUM_FEATURES)
    },
    YEARLY: {
      id: 'yearly',
      name: 'سنوي',
      name_en: 'Yearly',
      price: 249,
      currency: 'SAR',
      duration_days: 365,
      features: Object.values(this.PREMIUM_FEATURES),
      discount: '30%'
    }
  };

  /**
   * Check if user is premium
   */
  async isPremium(userId) {
    const stats = await UserStats.findOne({ user_id: userId });
    
    if (!stats || !stats.is_premium) {
      return false;
    }

    // Check if premium expired
    if (stats.premium_expires && new Date(stats.premium_expires) < new Date()) {
      // Expire premium
      stats.is_premium = false;
      stats.premium_expires = null;
      await stats.save();
      return false;
    }

    return true;
  }

  /**
   * Activate premium subscription
   */
  async activatePremium(userId, planId = 'monthly') {
    const plan = this.PREMIUM_PLANS[planId.toUpperCase()];
    
    if (!plan) {
      throw new Error('Invalid plan');
    }

    let stats = await UserStats.findOne({ user_id: userId });
    
    if (!stats) {
      stats = await UserStats.create({ user_id: userId });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    stats.is_premium = true;
    stats.premium_since = stats.premium_since || now;
    stats.premium_expires = expiresAt;
    await stats.save();

    // Notify user
    await this.notifyPremiumActivated(userId, plan);

    // Award verified badge
    await this.awardVerifiedBadge(userId);

    return {
      success: true,
      premium_until: expiresAt,
      plan
    };
  }

  /**
   * Check feature access
   */
  async hasFeatureAccess(userId, feature) {
    const isPremium = await this.isPremium(userId);

    // Check if feature requires premium
    if (Object.values(this.PREMIUM_FEATURES).includes(feature)) {
      return isPremium;
    }

    // Feature is free
    return true;
  }

  /**
   * Get premium status
   */
  async getPremiumStatus(userId) {
    const stats = await UserStats.findOne({ user_id: userId });
    
    if (!stats || !stats.is_premium) {
      return {
        is_premium: false,
        available_plans: this.PREMIUM_PLANS
      };
    }

    const daysLeft = Math.ceil((new Date(stats.premium_expires) - new Date()) / (1000 * 60 * 60 * 24));

    return {
      is_premium: true,
      premium_since: stats.premium_since,
      premium_expires: stats.premium_expires,
      days_left: Math.max(0, daysLeft),
      features: Object.values(this.PREMIUM_FEATURES)
    };
  }

  /**
   * Get premium benefits usage
   */
  async getPremiumUsage(userId) {
    const isPremium = await this.isPremium(userId);
    
    if (!isPremium) {
      return null;
    }

    const SwipeAction = require('../models/SwipeAction');
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [swipesThisMonth, undosThisMonth] = await Promise.all([
      SwipeAction.countDocuments({
        user_id: userId,
        timestamp: { $gte: thisMonth }
      }),
      SwipeAction.countDocuments({
        user_id: userId,
        timestamp: { $gte: thisMonth },
        undone: true
      })
    ]);

    return {
      swipes_this_month: swipesThisMonth,
      undos_used: undosThisMonth,
      unlimited_swipes: true,
      priority_matching: true
    };
  }

  /**
   * Award verified badge to premium users
   */
  async awardVerifiedBadge(userId) {
    const stats = await UserStats.findOne({ user_id: userId });
    
    const hasVerifiedBadge = stats.badges.some(b => b.badge_id === 'verified');
    if (!hasVerifiedBadge) {
      stats.badges.push({
        badge_id: 'verified',
        name: 'موثّق ✓',
        earned_at: new Date()
      });
      await stats.save();
    }
  }

  /**
   * Notify premium activated
   */
  async notifyPremiumActivated(userId, plan) {
    await MatchNotification.create({
      user_id: userId,
      type: 'premium_activated',
      payload: {
        plan_id: plan.id,
        plan_name: plan.name,
        expires_at: new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
      }
    });

    if (global.io) {
      global.io.to(`user:${userId}`).emit('premium_activated', {
        plan: plan.name
      });
    }
  }
}

module.exports = new PremiumService();

