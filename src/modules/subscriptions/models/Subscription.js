const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    // Publisher/Company
    publisherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Subscription Details
    tier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise', 'custom'],
      default: 'free',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended', 'trial'],
      default: 'active',
      required: true,
      index: true,
    },

    // Billing Period
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    renewalDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },

    // Trial
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialStartDate: Date,
    trialEndDate: Date,
    trialDays: {
      type: Number,
      default: 14,
    },

    // Pricing
    price: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'SAR',
      },
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Features & Limits
    features: {
      // Interviews
      interviewAutomation: {
        type: Boolean,
        default: false,
      },
      maxInterviewsPerMonth: {
        type: Number,
        default: 10,
      },
      onlineMeetings: {
        type: Boolean,
        default: true,
      },
      onsiteMeetings: {
        type: Boolean,
        default: false,
      },

      // Notifications
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      whatsappNotifications: {
        type: Boolean,
        default: false,
      },
      pushNotifications: {
        type: Boolean,
        default: false,
      },
      smsCreditsPerMonth: {
        type: Number,
        default: 0,
      },

      // Messaging
      messaging: {
        type: Boolean,
        default: true,
      },
      maxThreads: {
        type: Number,
        default: 100,
      },
      fileAttachments: {
        type: Boolean,
        default: true,
      },

      // Automation
      automationRules: {
        type: Boolean,
        default: false,
      },
      maxRules: {
        type: Number,
        default: 0,
      },
      customWebhooks: {
        type: Boolean,
        default: false,
      },

      // Analytics
      basicAnalytics: {
        type: Boolean,
        default: true,
      },
      advancedAnalytics: {
        type: Boolean,
        default: false,
      },
      exportData: {
        type: Boolean,
        default: false,
      },

      // API Access
      apiAccess: {
        type: Boolean,
        default: false,
      },
      apiRateLimitPerHour: {
        type: Number,
        default: 100,
      },

      // Support
      emailSupport: {
        type: Boolean,
        default: true,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      dedicatedAccountManager: {
        type: Boolean,
        default: false,
      },

      // Jobs & Applications
      maxActiveJobs: {
        type: Number,
        default: 5,
      },
      maxApplicationsPerMonth: {
        type: Number,
        default: 50,
      },

      // Team
      maxTeamMembers: {
        type: Number,
        default: 1,
      },
      roleBasedPermissions: {
        type: Boolean,
        default: false,
      },
    },

    // Usage Tracking
    usage: {
      interviewsThisMonth: {
        type: Number,
        default: 0,
      },
      applicationsThisMonth: {
        type: Number,
        default: 0,
      },
      smsCreditsUsed: {
        type: Number,
        default: 0,
      },
      apiCallsThisHour: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },

    // Payment
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'bank_transfer', 'invoice', 'free'],
        default: 'free',
      },
      last4: String,
      brand: String,
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,

    // History
    history: [
      {
        action: {
          type: String,
          enum: ['created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'suspended', 'reactivated'],
        },
        fromTier: String,
        toTier: String,
        date: {
          type: Date,
          default: Date.now,
        },
        reason: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Notes
    notes: String,
    cancellationReason: String,
    cancelledAt: Date,

    // Metadata
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
subscriptionSchema.index({ publisherId: 1, status: 1 });
subscriptionSchema.index({ tier: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });

// Virtual: Days remaining
subscriptionSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual: Is expired
subscriptionSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// Statics

// Get tier limits
subscriptionSchema.statics.getTierLimits = function (tier) {
  const limits = {
    free: {
      maxInterviewsPerMonth: 5,
      maxActiveJobs: 3,
      maxApplicationsPerMonth: 30,
      maxRules: 0,
      maxTeamMembers: 1,
      interviewAutomation: false,
      automationRules: false,
      advancedAnalytics: false,
      smsNotifications: false,
      apiAccess: false,
    },
    basic: {
      maxInterviewsPerMonth: 20,
      maxActiveJobs: 10,
      maxApplicationsPerMonth: 100,
      maxRules: 5,
      maxTeamMembers: 3,
      interviewAutomation: true,
      automationRules: true,
      advancedAnalytics: false,
      smsNotifications: false,
      apiAccess: false,
      smsCreditsPerMonth: 50,
    },
    pro: {
      maxInterviewsPerMonth: 100,
      maxActiveJobs: 50,
      maxApplicationsPerMonth: 500,
      maxRules: 50,
      maxTeamMembers: 10,
      interviewAutomation: true,
      automationRules: true,
      advancedAnalytics: true,
      smsNotifications: true,
      apiAccess: true,
      smsCreditsPerMonth: 500,
      apiRateLimitPerHour: 1000,
    },
    enterprise: {
      maxInterviewsPerMonth: -1, // unlimited
      maxActiveJobs: -1,
      maxApplicationsPerMonth: -1,
      maxRules: -1,
      maxTeamMembers: -1,
      interviewAutomation: true,
      automationRules: true,
      advancedAnalytics: true,
      smsNotifications: true,
      whatsappNotifications: true,
      apiAccess: true,
      smsCreditsPerMonth: 5000,
      apiRateLimitPerHour: 10000,
      dedicatedAccountManager: true,
    },
  };

  return limits[tier] || limits.free;
};

// Create subscription
subscriptionSchema.statics.createSubscription = async function (publisherId, tier = 'free', billingCycle = 'monthly') {
  const limits = this.getTierLimits(tier);
  
  const endDate = new Date();
  if (billingCycle === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (billingCycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const subscription = await this.create({
    publisherId,
    tier,
    billingCycle,
    endDate,
    features: limits,
    history: [
      {
        action: 'created',
        toTier: tier,
        date: new Date(),
      },
    ],
  });

  return subscription;
};

// Check if can use feature
subscriptionSchema.statics.canUseFeature = async function (publisherId, feature) {
  const subscription = await this.findOne({ publisherId, status: 'active' });
  
  if (!subscription) {
    return false;
  }

  if (subscription.isExpired) {
    return false;
  }

  return subscription.features[feature] === true;
};

// Check usage limit
subscriptionSchema.statics.checkUsageLimit = async function (publisherId, limitType) {
  const subscription = await this.findOne({ publisherId, status: 'active' });
  
  if (!subscription) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const limit = subscription.features[`max${limitType}`];
  const current = subscription.usage[`${limitType.toLowerCase()}ThisMonth`] || 0;

  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
    remaining: limit === -1 ? -1 : limit - current,
  };
};

// Methods

// Upgrade subscription
subscriptionSchema.methods.upgrade = function (newTier, changedBy) {
  const oldTier = this.tier;
  this.tier = newTier;
  this.features = this.constructor.getTierLimits(newTier);
  
  this.history.push({
    action: 'upgraded',
    fromTier: oldTier,
    toTier: newTier,
    date: new Date(),
    changedBy,
  });

  return this;
};

// Downgrade subscription
subscriptionSchema.methods.downgrade = function (newTier, changedBy, reason) {
  const oldTier = this.tier;
  this.tier = newTier;
  this.features = this.constructor.getTierLimits(newTier);
  
  this.history.push({
    action: 'downgraded',
    fromTier: oldTier,
    toTier: newTier,
    date: new Date(),
    changedBy,
    reason,
  });

  return this;
};

// Renew subscription
subscriptionSchema.methods.renew = function () {
  const newEndDate = new Date(this.endDate);
  
  if (this.billingCycle === 'monthly') {
    newEndDate.setMonth(newEndDate.getMonth() + 1);
  } else if (this.billingCycle === 'yearly') {
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  }

  this.endDate = newEndDate;
  this.renewalDate = new Date();
  this.status = 'active';

  this.history.push({
    action: 'renewed',
    date: new Date(),
  });

  return this;
};

// Cancel subscription
subscriptionSchema.methods.cancel = function (reason, cancelledBy) {
  this.status = 'cancelled';
  this.autoRenew = false;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();

  this.history.push({
    action: 'cancelled',
    date: new Date(),
    reason,
    changedBy: cancelledBy,
  });

  return this;
};

// Reset monthly usage
subscriptionSchema.methods.resetMonthlyUsage = function () {
  this.usage.interviewsThisMonth = 0;
  this.usage.applicationsThisMonth = 0;
  this.usage.smsCreditsUsed = 0;
  this.usage.lastResetDate = new Date();
  return this;
};

// Increment usage
subscriptionSchema.methods.incrementUsage = function (type) {
  if (type === 'interviews') {
    this.usage.interviewsThisMonth += 1;
  } else if (type === 'applications') {
    this.usage.applicationsThisMonth += 1;
  } else if (type === 'sms') {
    this.usage.smsCreditsUsed += 1;
  } else if (type === 'api') {
    this.usage.apiCallsThisHour += 1;
  }
  return this;
};

// Pre-save middleware
subscriptionSchema.pre('save', function (next) {
  // Update status if expired
  if (this.endDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
