const Subscription = require('../models/Subscription');
const FeatureToggle = require('../../admin-features/models/FeatureToggle');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/publisher/subscription
 * @desc    Get current subscription
 * @access  Private (Publisher)
 */
exports.getMySubscription = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  let subscription = await Subscription.findOne({ publisherId });

  // Create free subscription if doesn't exist
  if (!subscription) {
    subscription = await Subscription.createSubscription(publisherId, 'free');
  }

  res.status(200).json({
    success: true,
    data: {
      subscription,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/subscription/tiers
 * @desc    Get available subscription tiers
 * @access  Public
 */
exports.getTiers = catchAsync(async (req, res) => {
  const tiers = {
    free: {
      name: 'Free',
      nameAr: 'مجاني',
      price: 0,
      currency: 'SAR',
      billingCycle: 'lifetime',
      features: Subscription.getTierLimits('free'),
      description: 'Perfect for trying out the platform',
      descriptionAr: 'مثالي لتجربة المنصة',
    },
    basic: {
      name: 'Basic',
      nameAr: 'أساسي',
      price: 299,
      currency: 'SAR',
      billingCycle: 'monthly',
      yearlyPrice: 2990,
      features: Subscription.getTierLimits('basic'),
      description: 'Great for small teams',
      descriptionAr: 'رائع للفرق الصغيرة',
    },
    pro: {
      name: 'Pro',
      nameAr: 'احترافي',
      price: 999,
      currency: 'SAR',
      billingCycle: 'monthly',
      yearlyPrice: 9990,
      features: Subscription.getTierLimits('pro'),
      description: 'Best for growing companies',
      descriptionAr: 'الأفضل للشركات النامية',
      popular: true,
    },
    enterprise: {
      name: 'Enterprise',
      nameAr: 'مؤسسات',
      price: 'custom',
      currency: 'SAR',
      billingCycle: 'custom',
      features: Subscription.getTierLimits('enterprise'),
      description: 'For large organizations',
      descriptionAr: 'للمؤسسات الكبيرة',
      contactSales: true,
    },
  };

  res.status(200).json({
    success: true,
    data: {
      tiers,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/subscription/upgrade
 * @desc    Upgrade subscription
 * @access  Private (Publisher)
 */
exports.upgradeSubscription = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { tier, billingCycle = 'monthly' } = req.body;

  if (!['basic', 'pro', 'enterprise'].includes(tier)) {
    throw new AppError('Invalid tier', 400);
  }

  let subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    subscription = await Subscription.createSubscription(publisherId, tier, billingCycle);
  } else {
    subscription.upgrade(tier, publisherId);
    subscription.billingCycle = billingCycle;
    
    // Update end date
    const newEndDate = new Date();
    if (billingCycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }
    subscription.endDate = newEndDate;
    
    await subscription.save();
  }

  // Enable features based on tier
  await enableFeaturesForTier(publisherId, tier);

  logger.info(`Publisher ${publisherId} upgraded to ${tier}`);

  res.status(200).json({
    success: true,
    message: 'Subscription upgraded successfully',
    data: {
      subscription,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/subscription/downgrade
 * @desc    Downgrade subscription
 * @access  Private (Publisher)
 */
exports.downgradeSubscription = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { tier, reason } = req.body;

  if (!['free', 'basic', 'pro'].includes(tier)) {
    throw new AppError('Invalid tier', 400);
  }

  const subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    throw new AppError('No subscription found', 404);
  }

  subscription.downgrade(tier, publisherId, reason);
  await subscription.save();

  // Update features
  await enableFeaturesForTier(publisherId, tier);

  logger.info(`Publisher ${publisherId} downgraded to ${tier}`);

  res.status(200).json({
    success: true,
    message: 'Subscription downgraded successfully',
    data: {
      subscription,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private (Publisher)
 */
exports.cancelSubscription = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { reason } = req.body;

  const subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    throw new AppError('No subscription found', 404);
  }

  subscription.cancel(reason, publisherId);
  await subscription.save();

  logger.info(`Publisher ${publisherId} cancelled subscription`);

  res.status(200).json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: {
      subscription,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/subscription/reactivate
 * @desc    Reactivate subscription
 * @access  Private (Publisher)
 */
exports.reactivateSubscription = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  const subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    throw new AppError('No subscription found', 404);
  }

  if (subscription.status !== 'cancelled') {
    throw new AppError('Subscription is not cancelled', 400);
  }

  subscription.status = 'active';
  subscription.autoRenew = true;
  subscription.history.push({
    action: 'reactivated',
    date: new Date(),
    changedBy: publisherId,
  });

  await subscription.save();

  logger.info(`Publisher ${publisherId} reactivated subscription`);

  res.status(200).json({
    success: true,
    message: 'Subscription reactivated successfully',
    data: {
      subscription,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/subscription/usage
 * @desc    Get current usage
 * @access  Private (Publisher)
 */
exports.getUsage = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  const subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    throw new AppError('No subscription found', 404);
  }

  const usage = {
    interviews: {
      used: subscription.usage.interviewsThisMonth,
      limit: subscription.features.maxInterviewsPerMonth,
      remaining: subscription.features.maxInterviewsPerMonth === -1 ? -1 : 
        subscription.features.maxInterviewsPerMonth - subscription.usage.interviewsThisMonth,
      percentage: subscription.features.maxInterviewsPerMonth === -1 ? 0 :
        (subscription.usage.interviewsThisMonth / subscription.features.maxInterviewsPerMonth) * 100,
    },
    applications: {
      used: subscription.usage.applicationsThisMonth,
      limit: subscription.features.maxApplicationsPerMonth,
      remaining: subscription.features.maxApplicationsPerMonth === -1 ? -1 :
        subscription.features.maxApplicationsPerMonth - subscription.usage.applicationsThisMonth,
      percentage: subscription.features.maxApplicationsPerMonth === -1 ? 0 :
        (subscription.usage.applicationsThisMonth / subscription.features.maxApplicationsPerMonth) * 100,
    },
    smsCredits: {
      used: subscription.usage.smsCreditsUsed,
      limit: subscription.features.smsCreditsPerMonth,
      remaining: subscription.features.smsCreditsPerMonth - subscription.usage.smsCreditsUsed,
      percentage: subscription.features.smsCreditsPerMonth === 0 ? 0 :
        (subscription.usage.smsCreditsUsed / subscription.features.smsCreditsPerMonth) * 100,
    },
  };

  res.status(200).json({
    success: true,
    data: {
      usage,
      tier: subscription.tier,
      daysRemaining: subscription.daysRemaining,
    },
  });
});

/**
 * @route   GET /api/v1/admin/subscriptions
 * @desc    Get all subscriptions (Admin)
 * @access  Private (Admin)
 */
exports.getAllSubscriptions = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, tier, status } = req.query;

  const query = {};
  if (tier) query.tier = tier;
  if (status) query.status = status;

  const subscriptions = await Subscription.find(query)
    .populate('publisherId', 'firstName lastName companyName email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Subscription.countDocuments(query);

  // Get statistics
  const stats = await Subscription.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$price.amount' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      subscriptions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
      statistics: stats,
    },
  });
});

/**
 * @route   PATCH /api/v1/admin/subscriptions/:publisherId/tier
 * @desc    Change publisher subscription tier (Admin)
 * @access  Private (Admin)
 */
exports.changePublisherTier = catchAsync(async (req, res) => {
  const { publisherId } = req.params;
  const { tier } = req.body;
  const adminId = req.user._id;

  if (!['free', 'basic', 'pro', 'enterprise'].includes(tier)) {
    throw new AppError('Invalid tier', 400);
  }

  let subscription = await Subscription.findOne({ publisherId });

  if (!subscription) {
    subscription = await Subscription.createSubscription(publisherId, tier);
  } else {
    const oldTier = subscription.tier;
    if (tier > oldTier) {
      subscription.upgrade(tier, adminId);
    } else {
      subscription.downgrade(tier, adminId, 'Admin action');
    }
    await subscription.save();
  }

  // Enable features
  await enableFeaturesForTier(publisherId, tier);

  logger.info(`Admin ${adminId} changed publisher ${publisherId} tier to ${tier}`);

  res.status(200).json({
    success: true,
    message: 'Subscription tier changed successfully',
    data: {
      subscription,
    },
  });
});

/**
 * Helper: Enable features for tier
 */
async function enableFeaturesForTier(publisherId, tier) {
  const tierFeatures = {
    free: [],
    basic: ['interview_automation', 'automation_rules', 'custom_templates'],
    pro: ['interview_automation', 'advanced_notifications', 'automation_rules', 'advanced_analytics', 'custom_templates', 'team_collaboration'],
    enterprise: ['interview_automation', 'advanced_notifications', 'automation_rules', 'advanced_analytics', 'api_access', 'custom_templates', 'team_collaboration'],
  };

  const features = tierFeatures[tier] || [];

  for (const featureKey of features) {
    const feature = await FeatureToggle.findOne({ feature: featureKey });
    if (feature) {
      feature.enableForPublisher(publisherId, null, null, null);
      await feature.save();
    }
  }

  // Disable features not in tier
  const allFeatures = await FeatureToggle.find({ isPaidFeature: true });
  for (const feature of allFeatures) {
    if (!features.includes(feature.feature)) {
      feature.disableForPublisher(publisherId);
      await feature.save();
    }
  }
}

module.exports = exports;
