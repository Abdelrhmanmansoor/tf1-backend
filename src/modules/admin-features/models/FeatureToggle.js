const mongoose = require('mongoose');

const featureToggleSchema = new mongoose.Schema(
  {
    // Feature Identifier
    feature: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Display Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    descriptionAr: {
      type: String,
      trim: true,
    },
    icon: String,
    color: String,

    // Category
    category: {
      type: String,
      required: true,
      enum: [
        'notifications',
        'messaging',
        'interviews',
        'automation',
        'analytics',
        'integrations',
        'templates',
        'api',
        'ui',
        'security',
        'other',
      ],
      index: true,
    },

    // Status
    isEnabled: {
      type: Boolean,
      default: false, // Global toggle
      index: true,
    },
    isGlobalFeature: {
      type: Boolean,
      default: true, // Applies to all publishers when enabled
    },
    isBetaFeature: {
      type: Boolean,
      default: false,
    },
    isDeprecated: {
      type: Boolean,
      default: false,
    },

    // Subscription/Monetization
    requiredTier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise', 'custom'],
      default: 'free',
      index: true,
    },
    isPaidFeature: {
      type: Boolean,
      default: false,
    },

    // Publisher-Specific Overrides
    publisherOverrides: [
      {
        publisherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        isEnabled: {
          type: Boolean,
          required: true,
        },
        enabledAt: {
          type: Date,
          default: Date.now,
        },
        enabledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', // Admin who enabled it
        },
        expiresAt: Date, // For trial features
        notes: String,
        customConfig: mongoose.Schema.Types.Mixed, // Publisher-specific settings
      },
    ],

    // Usage Statistics
    usageStats: {
      totalUsers: {
        type: Number,
        default: 0,
      },
      activeUsers: {
        type: Number,
        default: 0,
      },
      usageCount: {
        type: Number,
        default: 0,
      },
      lastUsedAt: Date,
      averageUsagePerDay: Number,
    },

    // Configuration
    config: mongoose.Schema.Types.Mixed, // Feature-specific settings
    defaultConfig: mongoose.Schema.Types.Mixed, // Default settings for new users

    // Dependencies
    dependencies: [
      {
        feature: String, // Other feature keys this depends on
        required: {
          type: Boolean,
          default: true,
        },
      },
    ],
    dependents: [String], // Features that depend on this one

    // Rollout Strategy
    rollout: {
      strategy: {
        type: String,
        enum: ['instant', 'gradual', 'percentage', 'whitelist'],
        default: 'instant',
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      whitelist: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      startDate: Date,
      endDate: Date,
    },

    // Monitoring
    healthCheck: {
      isHealthy: {
        type: Boolean,
        default: true,
      },
      lastCheckAt: Date,
      errorRate: Number,
      responseTime: Number,
    },

    // Documentation
    documentation: {
      setupInstructions: String,
      setupInstructionsAr: String,
      apiEndpoints: [String],
      learnMoreUrl: String,
      videoTutorialUrl: String,
    },

    // Metadata
    version: {
      type: String,
      default: '1.0.0',
    },
    releaseDate: Date,
    deprecationDate: Date,
    removalDate: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
featureToggleSchema.index({ category: 1, isEnabled: 1 });
featureToggleSchema.index({ requiredTier: 1 });
featureToggleSchema.index({ 'publisherOverrides.publisherId': 1 });
featureToggleSchema.index({ isGlobalFeature: 1, isEnabled: 1 });

// Statics

// Check if feature is enabled for a publisher
featureToggleSchema.statics.isFeatureEnabled = async function (
  featureKey,
  publisherId
) {
  const feature = await this.findOne({ feature: featureKey });

  if (!feature) {
    return false; // Feature doesn't exist
  }

  if (!feature.isEnabled) {
    return false; // Feature is globally disabled
  }

  if (feature.isGlobalFeature) {
    return true; // Global feature enabled for all
  }

  // Check publisher-specific override
  const override = feature.publisherOverrides.find(
    o => o.publisherId.toString() === publisherId.toString()
  );

  if (override) {
    // Check if not expired
    if (override.expiresAt && override.expiresAt < new Date()) {
      return false;
    }
    return override.isEnabled;
  }

  return false; // Not enabled for this publisher
};

// Get all enabled features for a publisher
featureToggleSchema.statics.getEnabledFeatures = async function (publisherId) {
  const allFeatures = await this.find({ isEnabled: true });

  const enabledFeatures = allFeatures.filter(feature => {
    if (feature.isGlobalFeature) {
      return true;
    }

    const override = feature.publisherOverrides.find(
      o => o.publisherId.toString() === publisherId.toString()
    );

    if (override) {
      if (override.expiresAt && override.expiresAt < new Date()) {
        return false;
      }
      return override.isEnabled;
    }

    return false;
  });

  return enabledFeatures;
};

// Get features by category
featureToggleSchema.statics.getByCategory = async function (category) {
  return this.find({ category, isDeprecated: false }).sort({ name: 1 });
};

// Get features by tier
featureToggleSchema.statics.getByTier = async function (tier) {
  return this.find({ requiredTier: tier, isEnabled: true }).sort({ name: 1 });
};

// Get statistics
featureToggleSchema.statics.getGlobalStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalFeatures: { $sum: 1 },
        enabledFeatures: {
          $sum: { $cond: ['$isEnabled', 1, 0] },
        },
        betaFeatures: {
          $sum: { $cond: ['$isBetaFeature', 1, 0] },
        },
        deprecatedFeatures: {
          $sum: { $cond: ['$isDeprecated', 1, 0] },
        },
        paidFeatures: {
          $sum: { $cond: ['$isPaidFeature', 1, 0] },
        },
        totalUsage: { $sum: '$usageStats.usageCount' },
      },
    },
  ]);

  return stats[0] || { totalFeatures: 0 };
};

// Methods

// Enable feature globally
featureToggleSchema.methods.enableGlobally = function (enabledBy) {
  this.isEnabled = true;
  this.updatedBy = enabledBy;
  return this;
};

// Disable feature globally
featureToggleSchema.methods.disableGlobally = function (disabledBy) {
  this.isEnabled = false;
  this.updatedBy = disabledBy;
  return this;
};

// Enable for specific publisher
featureToggleSchema.methods.enableForPublisher = function (
  publisherId,
  enabledBy,
  expiresAt = null,
  customConfig = null
) {
  const existingIndex = this.publisherOverrides.findIndex(
    o => o.publisherId.toString() === publisherId.toString()
  );

  const override = {
    publisherId,
    isEnabled: true,
    enabledAt: new Date(),
    enabledBy,
    expiresAt,
    customConfig,
  };

  if (existingIndex >= 0) {
    this.publisherOverrides[existingIndex] = override;
  } else {
    this.publisherOverrides.push(override);
  }

  // Update usage stats
  this.usageStats.totalUsers += existingIndex < 0 ? 1 : 0;

  return this;
};

// Disable for specific publisher
featureToggleSchema.methods.disableForPublisher = function (publisherId) {
  const existingIndex = this.publisherOverrides.findIndex(
    o => o.publisherId.toString() === publisherId.toString()
  );

  if (existingIndex >= 0) {
    this.publisherOverrides[existingIndex].isEnabled = false;
  }

  return this;
};

// Remove publisher override
featureToggleSchema.methods.removePublisherOverride = function (publisherId) {
  this.publisherOverrides = this.publisherOverrides.filter(
    o => o.publisherId.toString() !== publisherId.toString()
  );

  this.usageStats.totalUsers = Math.max(0, this.usageStats.totalUsers - 1);

  return this;
};

// Check if publisher has access
featureToggleSchema.methods.hasAccess = function (publisherId, userTier = 'free') {
  if (!this.isEnabled) {
    return false;
  }

  // Check tier requirements
  const tierOrder = ['free', 'basic', 'pro', 'enterprise', 'custom'];
  const requiredTierIndex = tierOrder.indexOf(this.requiredTier);
  const userTierIndex = tierOrder.indexOf(userTier);

  if (userTierIndex < requiredTierIndex) {
    return false; // User tier is too low
  }

  if (this.isGlobalFeature) {
    return true;
  }

  // Check publisher-specific override
  const override = this.publisherOverrides.find(
    o => o.publisherId.toString() === publisherId.toString()
  );

  if (override) {
    if (override.expiresAt && override.expiresAt < new Date()) {
      return false;
    }
    return override.isEnabled;
  }

  return false;
};

// Record usage
featureToggleSchema.methods.recordUsage = function (publisherId = null) {
  this.usageStats.usageCount += 1;
  this.usageStats.lastUsedAt = new Date();

  // Track active users
  if (publisherId) {
    const hasOverride = this.publisherOverrides.some(
      o => o.publisherId.toString() === publisherId.toString()
    );
    if (!hasOverride) {
      this.usageStats.activeUsers += 1;
    }
  }

  return this;
};

// Check dependencies
featureToggleSchema.methods.checkDependencies = async function (publisherId) {
  if (!this.dependencies || this.dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const missing = [];

  for (const dep of this.dependencies) {
    if (dep.required) {
      const isEnabled = await this.constructor.isFeatureEnabled(
        dep.feature,
        publisherId
      );
      if (!isEnabled) {
        missing.push(dep.feature);
      }
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
};

// Get configuration for publisher
featureToggleSchema.methods.getConfigForPublisher = function (publisherId) {
  const override = this.publisherOverrides.find(
    o => o.publisherId.toString() === publisherId.toString()
  );

  if (override && override.customConfig) {
    return { ...this.defaultConfig, ...override.customConfig };
  }

  return this.defaultConfig || this.config || {};
};

// Update health status
featureToggleSchema.methods.updateHealth = function (isHealthy, errorRate, responseTime) {
  this.healthCheck = {
    isHealthy,
    lastCheckAt: new Date(),
    errorRate,
    responseTime,
  };
  return this;
};

module.exports = mongoose.model('FeatureToggle', featureToggleSchema);
