/**
 * Subscription Check Middleware
 * Verify publisher has required subscription tier and hasn't exceeded limits
 */

const Subscription = require('../modules/subscriptions/models/Subscription');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Helper function to create a FREE subscription for new users
 * ALL TIERS ARE FREE - No pricing shown to users
 * Admin can upgrade users from dashboard to give more features
 *
 * @param {ObjectId} publisherId - Publisher ID
 * @param {String} tier - Subscription tier (free/basic/pro/enterprise)
 * @returns {Promise<Subscription>}
 */
async function createFreeSubscription(publisherId, tier = 'free') {
  try {
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // 100 years = lifetime

    // Get tier limits from Subscription model (uses schema defaults)
    const tierLimits = Subscription.getTierLimits(tier);

    const subscription = await Subscription.create({
      publisherId,
      tier,
      status: 'active',
      billingCycle: 'lifetime',
      startDate: now,
      endDate: endDate,
      isFree: true, // ALL subscriptions are FREE
      adminManaged: true, // Can be modified from admin dashboard
      autoRenew: false,
      price: {
        amount: 0, // ALWAYS FREE - no pricing shown
        currency: 'SAR'
      },
      features: tierLimits, // Use tier limits from model
      paymentMethod: {
        type: 'free'
      },
      history: [
        {
          action: 'created',
          toTier: tier,
          date: now,
          reason: 'Auto-created on first use'
        }
      ]
    });

    logger.info(`✅ Created FREE ${tier.toUpperCase()} subscription for publisher ${publisherId}`);
    logger.info(`   Features: ${tierLimits.maxActiveJobs} jobs, ${tierLimits.maxApplicationsPerMonth} applications/month`);
    return subscription;
  } catch (error) {
    logger.error('Error creating free subscription:', error);
    throw error;
  }
}

/**
 * Check if publisher has required tier
 */
exports.requireTier = (...requiredTiers) => {
  return async (req, res, next) => {
    try {
      const publisherId = req.user._id;

      const subscription = await Subscription.findOne({
        publisherId,
        status: 'active',
      });

      if (!subscription) {
        return next(new AppError('No active subscription found', 403));
      }

      if (subscription.isExpired) {
        return next(new AppError('Your subscription has expired', 403));
      }

      const tierOrder = ['free', 'basic', 'pro', 'enterprise'];
      const userTierIndex = tierOrder.indexOf(subscription.tier);
      const requiredTierIndex = Math.min(...requiredTiers.map(t => tierOrder.indexOf(t)));

      if (userTierIndex < requiredTierIndex) {
        return next(
          new AppError(
            `This feature requires ${requiredTiers.join(' or ')} subscription`,
            403
          )
        );
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      logger.error('Subscription check error:', error);
      next(error);
    }
  };
};

/**
 * Check if publisher can use specific feature
 */
exports.requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const publisherId = req.user._id;

      let subscription = await Subscription.findOne({
        publisherId,
        status: 'active',
      });

      // Auto-create free subscription if none exists
      if (!subscription) {
        logger.warn(`⚠️  No subscription found for publisher ${publisherId}, creating free tier...`);
        subscription = await createFreeSubscription(publisherId);
      }

      if (!subscription.features[featureName]) {
        return next(new AppError(`Your subscription does not include ${featureName}`, 403));
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      logger.error('Feature check error:', error);
      next(error);
    }
  };
};

/**
 * Check usage limit before allowing action
 * Supports schema field names from Subscription model
 *
 * @param {String} limitType - Type of limit to check (ActiveJobs, ApplicationsPerMonth, etc)
 */
exports.checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const publisherId = req.user._id;

      let subscription = await Subscription.findOne({
        publisherId,
        status: 'active',
      });

      // Auto-create free subscription if none exists
      if (!subscription) {
        logger.warn(`⚠️  No subscription found for publisher ${publisherId}, creating free tier...`);
        subscription = await createFreeSubscription(publisherId);
      }

      // Map limitType to schema field names
      const limitKey = `max${limitType}`; // e.g. 'maxActiveJobs'
      const usageKey = `${limitType.toLowerCase().replace(/perm onth$/, '')}ThisMonth`; // e.g. 'interviewsThisMonth'

      const limit = subscription.features[limitKey];
      const current = subscription.usage[usageKey] || 0;

      // -1 means unlimited
      if (limit !== -1 && current >= limit) {
        return next(
          new AppError(
            `You have reached your ${limitType} limit (${limit}). Contact admin to upgrade.`,
            403
          )
        );
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      logger.error('Usage limit check error:', error);
      next(error);
    }
  };
};

/**
 * Increment usage counter after successful action
 */
exports.incrementUsage = (usageType) => {
  return async (req, res, next) => {
    try {
      if (req.subscription) {
        req.subscription.incrementUsage(usageType);
        await req.subscription.save();
      }
      next();
    } catch (error) {
      logger.error('Usage increment error:', error);
      // Don't block the request if usage increment fails
      next();
    }
  };
};

/**
 * Check if subscription needs renewal
 */
exports.checkRenewal = async (req, res, next) => {
  try {
    const publisherId = req.user._id;

    const subscription = await Subscription.findOne({ publisherId });

    if (!subscription) {
      return next();
    }

    const daysUntilExpiry = subscription.daysRemaining;

    // Warn if less than 7 days
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      res.set('X-Subscription-Expiring', daysUntilExpiry.toString());
    }

    // Auto-expire if past end date
    if (subscription.isExpired && subscription.status === 'active') {
      subscription.status = 'expired';
      await subscription.save();
    }

    next();
  } catch (error) {
    logger.error('Renewal check error:', error);
    next();
  }
};

/**
 * Reset monthly usage if needed
 */
exports.resetUsageIfNeeded = async (req, res, next) => {
  try {
    if (req.subscription) {
      const lastReset = new Date(req.subscription.usage.lastResetDate);
      const now = new Date();

      // Reset if it's a new month
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        req.subscription.resetMonthlyUsage();
        await req.subscription.save();
      }
    }
    next();
  } catch (error) {
    logger.error('Usage reset error:', error);
    next();
  }
};

module.exports = exports;
