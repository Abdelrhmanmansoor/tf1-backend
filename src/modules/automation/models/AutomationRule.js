const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema(
  {
    // Owner
    publisherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Rule Info
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

    // Trigger Configuration
    trigger: {
      event: {
        type: String,
        required: true,
        enum: [
          'APPLICATION_SUBMITTED',
          'APPLICATION_STAGE_CHANGED',
          'INTERVIEW_SCHEDULED',
          'INTERVIEW_COMPLETED',
          'INTERVIEW_CANCELLED',
          'MESSAGE_RECEIVED',
          'JOB_PUBLISHED',
          'JOB_DEADLINE_APPROACHING',
          'APPLICATION_UPDATED',
          'FEEDBACK_SUBMITTED',
        ],
      },
      // Conditions to filter when rule should execute
      conditions: [
        {
          field: {
            type: String, // e.g., 'status', 'stage', 'jobId'
            required: true,
          },
          operator: {
            type: String,
            enum: [
              'equals',
              'not_equals',
              'contains',
              'not_contains',
              'greater_than',
              'less_than',
              'in',
              'not_in',
              'exists',
              'not_exists',
            ],
            required: true,
          },
          value: mongoose.Schema.Types.Mixed, // Can be string, number, array, etc.
        },
      ],
    },

    // Actions to Execute
    actions: [
      {
        type: {
          type: String,
          required: true,
          enum: [
            'SEND_NOTIFICATION',
            'CREATE_THREAD',
            'SEND_MESSAGE',
            'SEND_EMAIL',
            'SEND_SMS',
            'SCHEDULE_INTERVIEW',
            'GENERATE_MEETING_LINK',
            'ASSIGN_TO_STAGE',
            'ADD_TAG',
            'CREATE_TASK',
            'UPDATE_FIELD',
            'WEBHOOK',
          ],
        },
        order: {
          type: Number,
          default: 0, // Execution order
        },
        config: {
          // Action-specific configuration
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Status & Control
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isTemplate: {
      type: Boolean,
      default: false, // System templates that users can copy
    },
    priority: {
      type: Number,
      default: 0, // Higher priority rules execute first
    },

    // Execution Tracking
    executionCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: Date,
    lastSuccessAt: Date,
    lastFailureAt: Date,

    // Limits & Throttling
    limits: {
      maxExecutionsPerHour: Number,
      maxExecutionsPerDay: Number,
      cooldownMinutes: Number, // Min time between executions
    },
    throttling: {
      executionsThisHour: {
        type: Number,
        default: 0,
      },
      executionsToday: {
        type: Number,
        default: 0,
      },
      lastExecutionTime: Date,
      hourResetAt: Date,
      dayResetAt: Date,
    },

    // Execution Logs (last 10)
    recentLogs: [
      {
        executedAt: {
          type: Date,
          default: Date.now,
        },
        triggeredBy: mongoose.Schema.Types.Mixed, // Data that triggered the rule
        success: Boolean,
        error: String,
        actionsExecuted: Number,
        executionTimeMs: Number,
      },
    ],

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
automationRuleSchema.index({ publisherId: 1, isActive: 1 });
automationRuleSchema.index({ 'trigger.event': 1, isActive: 1 });
automationRuleSchema.index({ isTemplate: 1, isActive: 1 });

// Statics

// Find active rules for an event
automationRuleSchema.statics.findActiveRulesForEvent = async function (
  event,
  publisherId
) {
  return this.find({
    'trigger.event': event,
    publisherId,
    isActive: true,
  }).sort({ priority: -1, createdAt: 1 });
};

// Get system templates
automationRuleSchema.statics.getTemplates = async function () {
  return this.find({
    isTemplate: true,
    isActive: true,
  }).lean();
};

// Get statistics
automationRuleSchema.statics.getStatistics = async function (publisherId) {
  const stats = await this.aggregate([
    { $match: { publisherId: mongoose.Types.ObjectId(publisherId) } },
    {
      $group: {
        _id: null,
        totalRules: { $sum: 1 },
        activeRules: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        totalExecutions: { $sum: '$executionCount' },
        totalSuccesses: { $sum: '$successCount' },
        totalFailures: { $sum: '$failureCount' },
      },
    },
  ]);

  return stats[0] || {
    totalRules: 0,
    activeRules: 0,
    totalExecutions: 0,
    totalSuccesses: 0,
    totalFailures: 0,
  };
};

// Methods

// Check if rule conditions match the data
automationRuleSchema.methods.matchesConditions = function (data) {
  if (!this.trigger.conditions || this.trigger.conditions.length === 0) {
    return true; // No conditions means always match
  }

  return this.trigger.conditions.every(condition => {
    const fieldValue = this.getNestedValue(data, condition.field);
    return this.evaluateCondition(fieldValue, condition.operator, condition.value);
  });
};

// Helper to get nested object values
automationRuleSchema.methods.getNestedValue = function (obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
};

// Evaluate a single condition
automationRuleSchema.methods.evaluateCondition = function (
  fieldValue,
  operator,
  conditionValue
) {
  switch (operator) {
    case 'equals':
      return fieldValue == conditionValue;
    case 'not_equals':
      return fieldValue != conditionValue;
    case 'contains':
      return String(fieldValue).includes(conditionValue);
    case 'not_contains':
      return !String(fieldValue).includes(conditionValue);
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    case 'exists':
      return fieldValue !== null && fieldValue !== undefined;
    case 'not_exists':
      return fieldValue === null || fieldValue === undefined;
    default:
      return false;
  }
};

// Check if rule is throttled
automationRuleSchema.methods.isThrottled = function () {
  const now = new Date();

  // Check hourly limit
  if (this.limits?.maxExecutionsPerHour) {
    // Reset counter if hour has passed
    if (
      !this.throttling.hourResetAt ||
      now - this.throttling.hourResetAt > 60 * 60 * 1000
    ) {
      this.throttling.executionsThisHour = 0;
      this.throttling.hourResetAt = now;
    }

    if (this.throttling.executionsThisHour >= this.limits.maxExecutionsPerHour) {
      return true;
    }
  }

  // Check daily limit
  if (this.limits?.maxExecutionsPerDay) {
    // Reset counter if day has passed
    if (
      !this.throttling.dayResetAt ||
      now - this.throttling.dayResetAt > 24 * 60 * 60 * 1000
    ) {
      this.throttling.executionsToday = 0;
      this.throttling.dayResetAt = now;
    }

    if (this.throttling.executionsToday >= this.limits.maxExecutionsPerDay) {
      return true;
    }
  }

  // Check cooldown
  if (this.limits?.cooldownMinutes && this.throttling.lastExecutionTime) {
    const cooldownMs = this.limits.cooldownMinutes * 60 * 1000;
    const timeSinceLastExecution = now - this.throttling.lastExecutionTime;
    if (timeSinceLastExecution < cooldownMs) {
      return true;
    }
  }

  return false;
};

// Record execution
automationRuleSchema.methods.recordExecution = function (
  success,
  triggeredBy,
  error = null,
  actionsExecuted = 0,
  executionTimeMs = 0
) {
  const now = new Date();

  // Update counters
  this.executionCount += 1;
  if (success) {
    this.successCount += 1;
    this.lastSuccessAt = now;
  } else {
    this.failureCount += 1;
    this.lastFailureAt = now;
  }
  this.lastExecutedAt = now;

  // Update throttling
  this.throttling.executionsThisHour += 1;
  this.throttling.executionsToday += 1;
  this.throttling.lastExecutionTime = now;

  // Add to recent logs (keep last 10)
  const logEntry = {
    executedAt: now,
    triggeredBy,
    success,
    error,
    actionsExecuted,
    executionTimeMs,
  };

  this.recentLogs.unshift(logEntry);
  if (this.recentLogs.length > 10) {
    this.recentLogs = this.recentLogs.slice(0, 10);
  }

  return this;
};

// Toggle active status
automationRuleSchema.methods.toggle = function () {
  this.isActive = !this.isActive;
  return this;
};

// Clone as template
automationRuleSchema.methods.cloneForPublisher = async function (newPublisherId) {
  const clone = new this.constructor({
    publisherId: newPublisherId,
    name: this.name,
    nameAr: this.nameAr,
    description: this.description,
    descriptionAr: this.descriptionAr,
    trigger: this.trigger,
    actions: this.actions,
    isActive: false, // Start as inactive
    isTemplate: false,
    priority: this.priority,
    limits: this.limits,
  });

  return clone.save();
};

// Get readable summary
automationRuleSchema.methods.getSummary = function (language = 'en') {
  const name = language === 'ar' && this.nameAr ? this.nameAr : this.name;
  const description =
    language === 'ar' && this.descriptionAr ? this.descriptionAr : this.description;

  return {
    name,
    description,
    event: this.trigger.event,
    conditionCount: this.trigger.conditions.length,
    actionCount: this.actions.length,
    isActive: this.isActive,
    executionCount: this.executionCount,
    successRate:
      this.executionCount > 0
        ? ((this.successCount / this.executionCount) * 100).toFixed(2)
        : 0,
  };
};

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
