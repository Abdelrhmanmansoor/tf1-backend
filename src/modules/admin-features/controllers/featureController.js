const FeatureToggle = require('../models/FeatureToggle');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/admin/features
 * @desc    Get all features
 * @access  Private (Admin)
 */
exports.getAllFeatures = catchAsync(async (req, res) => {
  const { category, tier, isEnabled, search } = req.query;

  const query = { isDeprecated: false };

  if (category) query.category = category;
  if (tier) query.requiredTier = tier;
  if (isEnabled !== undefined) query.isEnabled = isEnabled === 'true';

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { feature: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }

  const features = await FeatureToggle.find(query)
    .sort({ category: 1, name: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      features,
      count: features.length,
    },
  });
});

/**
 * @route   GET /api/v1/admin/features/:id
 * @desc    Get single feature
 * @access  Private (Admin)
 */
exports.getFeature = catchAsync(async (req, res) => {
  const { id } = req.params;

  const feature = await FeatureToggle.findById(id).populate('publisherOverrides.publisherId', 'firstName lastName companyName email');

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      feature,
    },
  });
});

/**
 * @route   POST /api/v1/admin/features
 * @desc    Create new feature
 * @access  Private (Admin)
 */
exports.createFeature = catchAsync(async (req, res) => {
  const adminId = req.user._id;
  const featureData = req.body;

  const feature = await FeatureToggle.create({
    ...featureData,
    createdBy: adminId,
  });

  logger.info(`Feature ${feature.feature} created by admin ${adminId}`);

  res.status(201).json({
    success: true,
    message: 'Feature created successfully',
    data: {
      feature,
    },
  });
});

/**
 * @route   PATCH /api/v1/admin/features/:id
 * @desc    Update feature
 * @access  Private (Admin)
 */
exports.updateFeature = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const updateData = req.body;

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  // Update allowed fields
  const allowedFields = [
    'name',
    'nameAr',
    'description',
    'descriptionAr',
    'icon',
    'color',
    'category',
    'requiredTier',
    'isPaidFeature',
    'isBetaFeature',
    'isGlobalFeature',
    'config',
    'defaultConfig',
    'documentation',
    'dependencies',
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      feature[field] = updateData[field];
    }
  });

  feature.updatedBy = adminId;
  await feature.save();

  logger.info(`Feature ${id} updated by admin ${adminId}`);

  res.status(200).json({
    success: true,
    message: 'Feature updated successfully',
    data: {
      feature,
    },
  });
});

/**
 * @route   DELETE /api/v1/admin/features/:id
 * @desc    Delete feature
 * @access  Private (Admin)
 */
exports.deleteFeature = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  // Mark as deprecated instead of deleting
  feature.isDeprecated = true;
  feature.deprecationDate = new Date();
  feature.updatedBy = adminId;
  await feature.save();

  logger.info(`Feature ${id} deprecated by admin ${adminId}`);

  res.status(200).json({
    success: true,
    message: 'Feature marked as deprecated',
  });
});

/**
 * @route   PATCH /api/v1/admin/features/:id/toggle
 * @desc    Toggle feature globally
 * @access  Private (Admin)
 */
exports.toggleFeature = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  if (feature.isEnabled) {
    feature.disableGlobally(adminId);
  } else {
    feature.enableGlobally(adminId);
  }

  await feature.save();

  logger.info(
    `Feature ${feature.feature} ${feature.isEnabled ? 'enabled' : 'disabled'} globally by admin ${adminId}`
  );

  res.status(200).json({
    success: true,
    message: `Feature ${feature.isEnabled ? 'enabled' : 'disabled'} globally`,
    data: {
      feature,
    },
  });
});

/**
 * @route   POST /api/v1/admin/features/:id/enable-for-publisher
 * @desc    Enable feature for specific publisher
 * @access  Private (Admin)
 */
exports.enableForPublisher = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const { publisherId, expiresAt, customConfig, notes } = req.body;

  if (!publisherId) {
    throw new AppError('Publisher ID is required', 400);
  }

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  feature.enableForPublisher(
    publisherId,
    adminId,
    expiresAt ? new Date(expiresAt) : null,
    customConfig
  );

  if (notes) {
    const override = feature.publisherOverrides.find(
      o => o.publisherId.toString() === publisherId.toString()
    );
    if (override) override.notes = notes;
  }

  await feature.save();

  logger.info(
    `Feature ${feature.feature} enabled for publisher ${publisherId} by admin ${adminId}`
  );

  res.status(200).json({
    success: true,
    message: 'Feature enabled for publisher',
    data: {
      feature,
    },
  });
});

/**
 * @route   POST /api/v1/admin/features/:id/disable-for-publisher
 * @desc    Disable feature for specific publisher
 * @access  Private (Admin)
 */
exports.disableForPublisher = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const { publisherId } = req.body;

  if (!publisherId) {
    throw new AppError('Publisher ID is required', 400);
  }

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  feature.disableForPublisher(publisherId);
  await feature.save();

  logger.info(
    `Feature ${feature.feature} disabled for publisher ${publisherId} by admin ${adminId}`
  );

  res.status(200).json({
    success: true,
    message: 'Feature disabled for publisher',
    data: {
      feature,
    },
  });
});

/**
 * @route   DELETE /api/v1/admin/features/:id/remove-publisher/:publisherId
 * @desc    Remove publisher override
 * @access  Private (Admin)
 */
exports.removePublisherOverride = catchAsync(async (req, res) => {
  const { id, publisherId } = req.params;
  const adminId = req.user._id;

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  feature.removePublisherOverride(publisherId);
  await feature.save();

  logger.info(
    `Publisher override removed for feature ${feature.feature}, publisher ${publisherId} by admin ${adminId}`
  );

  res.status(200).json({
    success: true,
    message: 'Publisher override removed',
    data: {
      feature,
    },
  });
});

/**
 * @route   GET /api/v1/admin/features/usage-stats
 * @desc    Get feature usage statistics
 * @access  Private (Admin)
 */
exports.getUsageStats = catchAsync(async (req, res) => {
  const stats = await FeatureToggle.getGlobalStatistics();

  // Get category breakdown
  const categoryBreakdown = await FeatureToggle.aggregate([
    { $match: { isDeprecated: false } },
    {
      $group: {
        _id: '$category',
        totalFeatures: { $sum: 1 },
        enabledFeatures: {
          $sum: { $cond: ['$isEnabled', 1, 0] },
        },
        totalUsage: { $sum: '$usageStats.usageCount' },
      },
    },
    { $sort: { totalFeatures: -1 } },
  ]);

  // Get tier breakdown
  const tierBreakdown = await FeatureToggle.aggregate([
    { $match: { isDeprecated: false } },
    {
      $group: {
        _id: '$requiredTier',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get most used features
  const mostUsedFeatures = await FeatureToggle.find({ isDeprecated: false })
    .sort({ 'usageStats.usageCount': -1 })
    .limit(10)
    .select('feature name usageStats.usageCount usageStats.activeUsers')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      globalStats: stats,
      categoryBreakdown,
      tierBreakdown,
      mostUsedFeatures,
    },
  });
});

/**
 * @route   POST /api/v1/admin/features/:id/health
 * @desc    Update feature health status
 * @access  Private (Admin)
 */
exports.updateHealth = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isHealthy, errorRate, responseTime } = req.body;

  const feature = await FeatureToggle.findById(id);

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  feature.updateHealth(isHealthy, errorRate, responseTime);
  await feature.save();

  res.status(200).json({
    success: true,
    message: 'Health status updated',
    data: {
      health: feature.healthCheck,
    },
  });
});

/**
 * @route   GET /api/v1/admin/features/check/:featureKey
 * @desc    Check if feature is enabled for publisher
 * @access  Public (used internally)
 */
exports.checkFeature = catchAsync(async (req, res) => {
  const { featureKey } = req.params;
  const { publisherId } = req.query;

  if (!publisherId) {
    throw new AppError('Publisher ID is required', 400);
  }

  const isEnabled = await FeatureToggle.isFeatureEnabled(featureKey, publisherId);

  res.status(200).json({
    success: true,
    data: {
      featureKey,
      isEnabled,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/features
 * @desc    Get enabled features for current publisher
 * @access  Private (Publisher)
 */
exports.getPublisherFeatures = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  const enabledFeatures = await FeatureToggle.getEnabledFeatures(publisherId);

  // Group by category
  const featuresByCategory = enabledFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push({
      feature: feature.feature,
      name: feature.name,
      nameAr: feature.nameAr,
      description: feature.description,
      icon: feature.icon,
      config: feature.getConfigForPublisher(publisherId),
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      features: enabledFeatures.map(f => ({
        feature: f.feature,
        name: f.name,
        nameAr: f.nameAr,
        category: f.category,
        config: f.getConfigForPublisher(publisherId),
      })),
      featuresByCategory,
    },
  });
});

/**
 * @route   POST /api/v1/admin/features/seed
 * @desc    Seed initial features (development only)
 * @access  Private (Admin)
 */
exports.seedFeatures = catchAsync(async (req, res) => {
  const adminId = req.user._id;

  // Check if features already exist
  const existingCount = await FeatureToggle.countDocuments();

  if (existingCount > 0) {
    throw new AppError('Features already exist. Clear database first.', 400);
  }

  const initialFeatures = [
    {
      feature: 'interview_automation',
      name: 'Interview Automation',
      nameAr: 'أتمتة المقابلات',
      description: 'Automated interview scheduling with reminders',
      descriptionAr: 'جدولة المقابلات التلقائية مع التذكيرات',
      category: 'interviews',
      requiredTier: 'basic',
      isPaidFeature: true,
      isGlobalFeature: false,
      isEnabled: true,
    },
    {
      feature: 'advanced_notifications',
      name: 'Advanced Notifications',
      nameAr: 'إشعارات متقدمة',
      description: 'Email, SMS, and push notifications',
      descriptionAr: 'إشعارات البريد الإلكتروني والرسائل القصيرة والدفع',
      category: 'notifications',
      requiredTier: 'pro',
      isPaidFeature: true,
      isGlobalFeature: false,
      isEnabled: true,
    },
    {
      feature: 'messaging_system',
      name: 'Messaging System',
      nameAr: 'نظام المراسلة',
      description: 'Real-time messaging with applicants',
      descriptionAr: 'مراسلة فورية مع المتقدمين',
      category: 'messaging',
      requiredTier: 'free',
      isPaidFeature: false,
      isGlobalFeature: true,
      isEnabled: true,
    },
    {
      feature: 'automation_rules',
      name: 'Automation Rules',
      nameAr: 'قواعد الأتمتة',
      description: 'Custom automation workflows',
      descriptionAr: 'سير عمل أتمتة مخصص',
      category: 'automation',
      requiredTier: 'pro',
      isPaidFeature: true,
      isGlobalFeature: false,
      isEnabled: true,
    },
    {
      feature: 'advanced_analytics',
      name: 'Advanced Analytics',
      nameAr: 'تحليلات متقدمة',
      description: 'Detailed hiring metrics and insights',
      descriptionAr: 'مقاييس توظيف مفصلة ورؤى',
      category: 'analytics',
      requiredTier: 'pro',
      isPaidFeature: true,
      isGlobalFeature: false,
      isEnabled: true,
    },
  ];

  const createdFeatures = await FeatureToggle.insertMany(
    initialFeatures.map(f => ({ ...f, createdBy: adminId }))
  );

  logger.info(`${createdFeatures.length} features seeded by admin ${adminId}`);

  res.status(201).json({
    success: true,
    message: `${createdFeatures.length} features created`,
    data: {
      features: createdFeatures,
    },
  });
});

module.exports = exports;
