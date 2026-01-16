/**
 * Subscription Engine Service
 * Handles subscription lifecycle, enforcement, and billing integration
 *
 * @module services/subscriptionEngine
 * @author SportX Platform Team
 * @version 1.0.0
 */

const Subscription = require('../modules/subscriptions/models/Subscription');
const Job = require('../modules/club/models/Job');
const JobApplication = require('../modules/club/models/JobApplication');
const Interview = require('../modules/interviews/models/Interview');
const AutomationRule = require('../modules/automation/models/AutomationRule');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

class SubscriptionEngine {
  /**
   * Initialize subscription for new publisher
   * @param {String} publisherId - Publisher user ID
   * @param {String} tier - Subscription tier (default: 'free')
   * @param {Object} options - Additional options
   * @returns {Promise<Subscription>}
   */
  async initializeSubscription(publisherId, tier = 'free', options = {}) {
    try {
      // Check if subscription already exists
      let subscription = await Subscription.findOne({ publisherId });

      if (subscription) {
        logger.warn(`Subscription already exists for publisher ${publisherId}`);
        return subscription;
      }

      // Get tier limits
      const limits = Subscription.getTierLimits(tier);

      // Determine if trial
      const isTrial = options.isTrial !== undefined ? options.isTrial : (tier === 'free');
      const trialDays = options.trialDays || 14;

      // Calculate dates
      const now = new Date();
      const endDate = new Date(now);

      if (isTrial) {
        endDate.setDate(endDate.getDate() + trialDays);
      } else if (options.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create subscription
      subscription = await Subscription.create({
        publisherId,
        tier,
        status: 'active',
        billingCycle: options.billingCycle || 'monthly',
        startDate: now,
        endDate,
        isTrial,
        trialStartDate: isTrial ? now : null,
        trialEndDate: isTrial ? endDate : null,
        trialDays,
        features: limits,
        isFree: tier === 'free' || isTrial,
        adminManaged: options.adminManaged !== undefined ? options.adminManaged : true,
        history: [{
          action: 'created',
          toTier: tier,
          date: now,
          changedBy: options.createdBy || publisherId
        }]
      });

      logger.info(`✅ Subscription initialized for publisher ${publisherId}: ${tier} tier`);

      return subscription;
    } catch (error) {
      logger.error(`❌ Failed to initialize subscription for publisher ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Check if publisher can perform action based on subscription
   * @param {String} publisherId - Publisher user ID
   * @param {String} action - Action type ('create_job', 'create_interview', etc.)
   * @param {Object} options - Additional context
   * @returns {Promise<Object>} { allowed: Boolean, reason: String }
   */
  async canPerformAction(publisherId, action, options = {}) {
    try {
      const subscription = await Subscription.findOne({
        publisherId,
        status: 'active'
      });

      if (!subscription) {
        return {
          allowed: false,
          reason: 'NO_ACTIVE_SUBSCRIPTION',
          message: 'No active subscription found. Please subscribe to continue.',
          requiresUpgrade: true,
          suggestedTier: 'basic'
        };
      }

      if (subscription.isExpired) {
        return {
          allowed: false,
          reason: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired. Please renew to continue.',
          expiredAt: subscription.endDate,
          requiresRenewal: true
        };
      }

      // Check action-specific limits
      switch (action) {
        case 'create_job':
          return await this._checkJobCreationLimit(subscription);

        case 'create_interview':
          return await this._checkInterviewLimit(subscription);

        case 'create_automation':
          return this._checkAutomationLimit(subscription);

        case 'use_advanced_analytics':
          return this._checkFeatureAccess(subscription, 'advancedAnalytics');

        case 'use_api':
          return this._checkFeatureAccess(subscription, 'apiAccess');

        case 'send_sms':
          return await this._checkSMSCredits(subscription);

        case 'export_data':
          return this._checkFeatureAccess(subscription, 'exportData');

        default:
          return { allowed: true };
      }
    } catch (error) {
      logger.error(`Error checking action permission for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Check job creation limit
   * @private
   */
  async _checkJobCreationLimit(subscription) {
    const limit = subscription.features.maxActiveJobs;

    if (limit === -1) {
      return { allowed: true, unlimited: true };
    }

    const currentCount = await Job.countDocuments({
      publishedBy: subscription.publisherId,
      status: 'active',
      isDeleted: false
    });

    const allowed = currentCount < limit;

    return {
      allowed,
      reason: allowed ? null : 'JOB_LIMIT_REACHED',
      message: allowed
        ? `${limit - currentCount} jobs remaining`
        : `Job limit reached (${limit}). Please upgrade to create more jobs.`,
      current: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      requiresUpgrade: !allowed,
      suggestedTier: this._suggestUpgradeTier(subscription.tier)
    };
  }

  /**
   * Check interview creation limit
   * @private
   */
  async _checkInterviewLimit(subscription) {
    const limit = subscription.features.maxInterviewsPerMonth || 5;

    if (limit === -1) {
      return { allowed: true, unlimited: true };
    }

    // Reset monthly usage if needed
    await this._resetMonthlyUsageIfNeeded(subscription);

    const current = subscription.usage.interviewsThisMonth || 0;
    const allowed = current < limit;

    return {
      allowed,
      reason: allowed ? null : 'INTERVIEW_LIMIT_REACHED',
      message: allowed
        ? `${limit - current} interviews remaining this month`
        : `Monthly interview limit reached (${limit}). Upgrade for more interviews.`,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      requiresUpgrade: !allowed,
      suggestedTier: this._suggestUpgradeTier(subscription.tier)
    };
  }

  /**
   * Check automation rules limit
   * @private
   */
  _checkAutomationLimit(subscription) {
    const automationEnabled = subscription.features.automationRules;
    const maxRules = subscription.features.maxRules || 0;

    if (!automationEnabled) {
      return {
        allowed: false,
        reason: 'AUTOMATION_NOT_AVAILABLE',
        message: 'Automation is not available in your current plan. Upgrade to use automation rules.',
        requiresUpgrade: true,
        suggestedTier: 'basic'
      };
    }

    if (maxRules === -1) {
      return { allowed: true, unlimited: true };
    }

    // Note: Actual count check will be done when creating the rule
    return {
      allowed: true,
      limit: maxRules,
      message: `You can create up to ${maxRules} automation rules.`
    };
  }

  /**
   * Check feature access
   * @private
   */
  _checkFeatureAccess(subscription, featureName) {
    const hasAccess = subscription.features[featureName] === true;

    return {
      allowed: hasAccess,
      reason: hasAccess ? null : 'FEATURE_NOT_AVAILABLE',
      message: hasAccess
        ? `${featureName} is available in your plan`
        : `${featureName} is not available in your current plan. Please upgrade.`,
      requiresUpgrade: !hasAccess,
      suggestedTier: this._suggestUpgradeTier(subscription.tier, featureName)
    };
  }

  /**
   * Check SMS credits
   * @private
   */
  async _checkSMSCredits(subscription) {
    if (!subscription.features.smsNotifications) {
      return {
        allowed: false,
        reason: 'SMS_NOT_AVAILABLE',
        message: 'SMS notifications are not available in your current plan.',
        requiresUpgrade: true,
        suggestedTier: 'pro'
      };
    }

    await this._resetMonthlyUsageIfNeeded(subscription);

    const limit = subscription.features.smsCreditsPerMonth || 0;
    const used = subscription.usage.smsCreditsUsed || 0;
    const allowed = used < limit || limit === -1;

    return {
      allowed,
      reason: allowed ? null : 'SMS_CREDITS_EXHAUSTED',
      message: allowed
        ? `${limit === -1 ? 'Unlimited' : limit - used} SMS credits remaining`
        : `SMS credits exhausted for this month. Resets on ${this._getNextResetDate(subscription).toDateString()}.`,
      current: used,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used)
    };
  }

  /**
   * Track usage after successful action
   * @param {String} publisherId - Publisher user ID
   * @param {String} usageType - Type of usage (interviews, applications, sms, api)
   * @returns {Promise<Subscription>}
   */
  async trackUsage(publisherId, usageType) {
    try {
      const subscription = await Subscription.findOne({
        publisherId,
        status: 'active'
      });

      if (!subscription) {
        logger.warn(`No active subscription found for publisher ${publisherId}`);
        return null;
      }

      // Reset monthly usage if needed
      await this._resetMonthlyUsageIfNeeded(subscription);

      // Increment usage
      subscription.incrementUsage(usageType);
      await subscription.save();

      logger.debug(`Usage tracked: ${usageType} for publisher ${publisherId}`);

      return subscription;
    } catch (error) {
      logger.error(`Failed to track usage for ${publisherId}:`, error);
      // Don't throw - tracking failure shouldn't block operations
      return null;
    }
  }

  /**
   * Upgrade subscription
   * @param {String} publisherId - Publisher user ID
   * @param {String} newTier - New tier to upgrade to
   * @param {Object} options - Additional options
   * @returns {Promise<Subscription>}
   */
  async upgradeSubscription(publisherId, newTier, options = {}) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found for this publisher', 404);
      }

      const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
      const currentIndex = tierOrder.indexOf(subscription.tier);
      const newIndex = tierOrder.indexOf(newTier);

      if (newIndex <= currentIndex) {
        throw new AppError('Can only upgrade to a higher tier', 400);
      }

      const oldTier = subscription.tier;

      // Update subscription
      subscription.upgrade(newTier, options.changedBy || publisherId);

      // Update billing if not admin managed
      if (!subscription.adminManaged && options.billingCycle) {
        subscription.billingCycle = options.billingCycle;

        // Extend end date based on new billing cycle
        const now = new Date();
        if (options.billingCycle === 'yearly') {
          subscription.endDate = new Date(now.setFullYear(now.getFullYear() + 1));
        } else {
          subscription.endDate = new Date(now.setMonth(now.getMonth() + 1));
        }
      }

      // If was trial, mark as no longer trial
      if (subscription.isTrial) {
        subscription.isTrial = false;
        subscription.isFree = newTier === 'free';
      }

      subscription.updatedBy = options.changedBy || publisherId;
      await subscription.save();

      logger.info(`✅ Subscription upgraded: ${publisherId} from ${oldTier} to ${newTier}`);

      // TODO: Trigger billing event (Stripe integration point)
      // await this._createStripeSubscription(subscription);

      return subscription;
    } catch (error) {
      logger.error(`Failed to upgrade subscription for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Downgrade subscription
   * @param {String} publisherId - Publisher user ID
   * @param {String} newTier - New tier to downgrade to
   * @param {Object} options - Additional options
   * @returns {Promise<Subscription>}
   */
  async downgradeSubscription(publisherId, newTier, options = {}) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found for this publisher', 404);
      }

      const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
      const currentIndex = tierOrder.indexOf(subscription.tier);
      const newIndex = tierOrder.indexOf(newTier);

      if (newIndex >= currentIndex) {
        throw new AppError('Can only downgrade to a lower tier', 400);
      }

      // Check if downgrade would violate current usage
      const limits = Subscription.getTierLimits(newTier);
      const currentUsage = await this._getCurrentUsage(publisherId);

      const violations = [];
      if (currentUsage.activeJobs > limits.maxActiveJobs && limits.maxActiveJobs !== -1) {
        violations.push(`Active jobs (${currentUsage.activeJobs}) exceeds new limit (${limits.maxActiveJobs})`);
      }

      if (currentUsage.automationRules > limits.maxRules && limits.maxRules !== -1) {
        violations.push(`Automation rules (${currentUsage.automationRules}) exceeds new limit (${limits.maxRules})`);
      }

      if (violations.length > 0 && !options.force) {
        throw new AppError(
          `Cannot downgrade: ${violations.join(', ')}. Please reduce usage first or use force option.`,
          400
        );
      }

      const oldTier = subscription.tier;

      // Update subscription
      subscription.downgrade(newTier, options.changedBy || publisherId, options.reason);
      subscription.updatedBy = options.changedBy || publisherId;

      // If forcing downgrade with violations, disable excess items
      if (options.force && violations.length > 0) {
        await this._enforceNewLimits(publisherId, limits);
      }

      await subscription.save();

      logger.info(`✅ Subscription downgraded: ${publisherId} from ${oldTier} to ${newTier}`);

      return subscription;
    } catch (error) {
      logger.error(`Failed to downgrade subscription for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   * @param {String} publisherId - Publisher user ID
   * @param {String} reason - Cancellation reason
   * @param {Object} options - Additional options
   * @returns {Promise<Subscription>}
   */
  async cancelSubscription(publisherId, reason, options = {}) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found for this publisher', 404);
      }

      // Cancel subscription
      subscription.cancel(reason, options.cancelledBy || publisherId);
      subscription.updatedBy = options.cancelledBy || publisherId;

      // Determine when access ends
      if (options.immediate) {
        subscription.endDate = new Date();
        subscription.status = 'cancelled';
      } else {
        // Keep active until end of billing period
        subscription.autoRenew = false;
      }

      await subscription.save();

      logger.info(`✅ Subscription cancelled for ${publisherId}: ${reason}`);

      // TODO: Cancel Stripe subscription
      // await this._cancelStripeSubscription(subscription);

      return subscription;
    } catch (error) {
      logger.error(`Failed to cancel subscription for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Extend trial period
   * @param {String} publisherId - Publisher user ID
   * @param {Number} additionalDays - Days to extend
   * @param {Object} options - Additional options
   * @returns {Promise<Subscription>}
   */
  async extendTrial(publisherId, additionalDays, options = {}) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found', 404);
      }

      if (!subscription.isTrial) {
        throw new AppError('This is not a trial subscription', 400);
      }

      const currentEndDate = subscription.trialEndDate || subscription.endDate;
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + additionalDays);

      subscription.trialEndDate = newEndDate;
      subscription.endDate = newEndDate;
      subscription.trialDays += additionalDays;

      subscription.history.push({
        action: 'trial_extended',
        date: new Date(),
        changedBy: options.changedBy,
        reason: `Extended by ${additionalDays} days`
      });

      await subscription.save();

      logger.info(`✅ Trial extended for ${publisherId} by ${additionalDays} days`);

      return subscription;
    } catch (error) {
      logger.error(`Failed to extend trial for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend subscription (admin action)
   * @param {String} publisherId - Publisher user ID
   * @param {String} reason - Suspension reason
   * @param {ObjectId} adminId - Admin user ID
   * @returns {Promise<Subscription>}
   */
  async suspendSubscription(publisherId, reason, adminId) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found', 404);
      }

      subscription.status = 'suspended';
      subscription.history.push({
        action: 'suspended',
        date: new Date(),
        reason,
        changedBy: adminId
      });

      await subscription.save();

      logger.warn(`⚠️ Subscription suspended for ${publisherId}: ${reason}`);

      return subscription;
    } catch (error) {
      logger.error(`Failed to suspend subscription for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Reactivate suspended subscription
   * @param {String} publisherId - Publisher user ID
   * @param {ObjectId} adminId - Admin user ID
   * @returns {Promise<Subscription>}
   */
  async reactivateSubscription(publisherId, adminId) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        throw new AppError('No subscription found', 404);
      }

      if (subscription.status !== 'suspended') {
        throw new AppError('Subscription is not suspended', 400);
      }

      subscription.status = 'active';
      subscription.history.push({
        action: 'reactivated',
        date: new Date(),
        changedBy: adminId
      });

      await subscription.save();

      logger.info(`✅ Subscription reactivated for ${publisherId}`);

      return subscription;
    } catch (error) {
      logger.error(`Failed to reactivate subscription for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription analytics
   * @param {String} publisherId - Publisher user ID
   * @returns {Promise<Object>}
   */
  async getAnalytics(publisherId) {
    try {
      const subscription = await Subscription.findOne({ publisherId });

      if (!subscription) {
        return null;
      }

      const currentUsage = await this._getCurrentUsage(publisherId);

      return {
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          daysRemaining: subscription.daysRemaining,
          isTrial: subscription.isTrial,
          autoRenew: subscription.autoRenew
        },
        limits: {
          maxActiveJobs: subscription.features.maxActiveJobs,
          maxApplicationsPerMonth: subscription.features.maxApplicationsPerMonth,
          maxInterviewsPerMonth: Subscription.getTierLimits(subscription.tier).maxInterviewsPerMonth,
          maxRules: subscription.features.maxRules
        },
        usage: {
          activeJobs: currentUsage.activeJobs,
          applicationsThisMonth: subscription.usage.applicationsThisMonth,
          interviewsThisMonth: subscription.usage.interviewsThisMonth,
          automationRules: currentUsage.automationRules
        },
        utilizationRate: {
          jobs: subscription.features.maxActiveJobs === -1
            ? 0
            : (currentUsage.activeJobs / subscription.features.maxActiveJobs) * 100,
          applications: subscription.features.maxApplicationsPerMonth === -1
            ? 0
            : (subscription.usage.applicationsThisMonth / subscription.features.maxApplicationsPerMonth) * 100
        },
        recommendations: this._generateRecommendations(subscription, currentUsage)
      };
    } catch (error) {
      logger.error(`Failed to get analytics for ${publisherId}:`, error);
      throw error;
    }
  }

  /**
   * Check and expire subscriptions (cron job)
   * @returns {Promise<Number>} Number of expired subscriptions
   */
  async checkAndExpireSubscriptions() {
    try {
      const now = new Date();

      const expiredSubscriptions = await Subscription.updateMany(
        {
          endDate: { $lt: now },
          status: 'active'
        },
        {
          $set: { status: 'expired' },
          $push: {
            history: {
              action: 'expired',
              date: now,
              reason: 'Subscription period ended'
            }
          }
        }
      );

      logger.info(`✅ Expired ${expiredSubscriptions.modifiedCount} subscriptions`);

      return expiredSubscriptions.modifiedCount;
    } catch (error) {
      logger.error('Failed to check and expire subscriptions:', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage for all subscriptions (cron job)
   * @returns {Promise<Number>} Number of subscriptions reset
   */
  async resetAllMonthlyUsage() {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const result = await Subscription.updateMany(
        {
          'usage.lastResetDate': { $lt: firstDayOfMonth }
        },
        {
          $set: {
            'usage.interviewsThisMonth': 0,
            'usage.applicationsThisMonth': 0,
            'usage.smsCreditsUsed': 0,
            'usage.lastResetDate': now
          }
        }
      );

      logger.info(`✅ Reset monthly usage for ${result.modifiedCount} subscriptions`);

      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to reset monthly usage:', error);
      throw error;
    }
  }

  /**
   * Get platform statistics
   * @returns {Promise<Object>}
   */
  async getPlatformStats() {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        expiredSubscriptions,
        tierDistribution,
        revenueProjection
      ] = await Promise.all([
        Subscription.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.countDocuments({ isTrial: true, status: 'active' }),
        Subscription.countDocuments({ status: 'expired' }),
        Subscription.aggregate([
          { $group: { _id: '$tier', count: { $sum: 1 } } }
        ]),
        Subscription.aggregate([
          { $match: { status: 'active', isFree: false } },
          { $group: { _id: null, total: { $sum: '$price.amount' } } }
        ])
      ]);

      return {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        expired: expiredSubscriptions,
        conversionRate: trialSubscriptions > 0
          ? ((activeSubscriptions - trialSubscriptions) / trialSubscriptions * 100).toFixed(2)
          : 0,
        tierDistribution: tierDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyRevenue: revenueProjection[0]?.total || 0
      };
    } catch (error) {
      logger.error('Failed to get platform stats:', error);
      throw error;
    }
  }

  // ============ Private Helper Methods ============

  async _resetMonthlyUsageIfNeeded(subscription) {
    const lastReset = new Date(subscription.usage.lastResetDate);
    const now = new Date();

    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      subscription.resetMonthlyUsage();
      await subscription.save();
    }
  }

  _getNextResetDate(subscription) {
    const lastReset = new Date(subscription.usage.lastResetDate);
    const nextReset = new Date(lastReset);
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    return nextReset;
  }

  async _getCurrentUsage(publisherId) {
    const [activeJobs, automationRules] = await Promise.all([
      Job.countDocuments({
        publishedBy: publisherId,
        status: 'active',
        isDeleted: false
      }),
      AutomationRule.countDocuments({
        publisherId,
        isDeleted: false
      })
    ]);

    return { activeJobs, automationRules };
  }

  _suggestUpgradeTier(currentTier, feature = null) {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }

    // Suggest next tier
    return tierOrder[currentIndex + 1];
  }

  async _enforceNewLimits(publisherId, newLimits) {
    // Disable excess automation rules
    if (newLimits.maxRules !== -1) {
      const rules = await AutomationRule.find({ publisherId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(newLimits.maxRules);

      for (const rule of rules) {
        rule.isActive = false;
        await rule.save();
      }

      logger.info(`Disabled ${rules.length} automation rules for ${publisherId} due to downgrade`);
    }

    // Close excess jobs (set to draft instead of delete)
    if (newLimits.maxActiveJobs !== -1) {
      const excessJobs = await Job.find({
        publishedBy: publisherId,
        status: 'active',
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(newLimits.maxActiveJobs);

      for (const job of excessJobs) {
        job.status = 'closed';
        await job.save();
      }

      logger.info(`Closed ${excessJobs.length} jobs for ${publisherId} due to downgrade`);
    }
  }

  _generateRecommendations(subscription, usage) {
    const recommendations = [];

    // Check if nearing limits
    const jobUtilization = subscription.features.maxActiveJobs === -1
      ? 0
      : (usage.activeJobs / subscription.features.maxActiveJobs);

    if (jobUtilization > 0.8) {
      recommendations.push({
        type: 'upgrade',
        reason: 'You are using 80%+ of your job limit',
        action: 'Consider upgrading to post more jobs'
      });
    }

    // Check trial expiration
    if (subscription.isTrial && subscription.daysRemaining <= 7) {
      recommendations.push({
        type: 'trial_ending',
        reason: `Your trial ends in ${subscription.daysRemaining} days`,
        action: 'Upgrade now to maintain access'
      });
    }

    // Check unused features
    if (subscription.tier !== 'free' && usage.automationRules === 0) {
      recommendations.push({
        type: 'feature_tip',
        reason: 'You have automation available but haven\'t used it',
        action: 'Try automating repetitive tasks'
      });
    }

    return recommendations;
  }

  /**
   * Stripe Integration Placeholder
   * @private
   */
  async _createStripeSubscription(subscription) {
    // TODO: Implement Stripe integration
    logger.info('Stripe integration: Create subscription', subscription._id);

    // Example:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const customer = await stripe.customers.create({
    //   email: subscription.publisherEmail,
    //   metadata: { publisherId: subscription.publisherId }
    // });
    //
    // const stripeSubscription = await stripe.subscriptions.create({
    //   customer: customer.id,
    //   items: [{ price: getPriceIdForTier(subscription.tier) }]
    // });
    //
    // subscription.stripeCustomerId = customer.id;
    // subscription.stripeSubscriptionId = stripeSubscription.id;
    // await subscription.save();

    return null;
  }

  async _cancelStripeSubscription(subscription) {
    // TODO: Implement Stripe cancellation
    logger.info('Stripe integration: Cancel subscription', subscription._id);
    return null;
  }
}

module.exports = new SubscriptionEngine();
