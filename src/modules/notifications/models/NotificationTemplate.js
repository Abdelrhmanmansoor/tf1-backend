const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    // Unique Identifier
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Display Name
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
    },

    // Category
    category: {
      type: String,
      required: true,
      enum: ['application', 'interview', 'message', 'system', 'job', 'general'],
      index: true,
    },

    // Trigger Event
    trigger: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'APPLICATION_STAGE_CHANGED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_RESCHEDULED',
        'INTERVIEW_CANCELLED',
        'INTERVIEW_REMINDER',
        'MESSAGE_RECEIVED',
        'JOB_PUBLISHED',
        'JOB_CLOSING',
        'FEEDBACK_REQUESTED',
        'OFFER_SENT',
        'MANUAL',
      ],
    },

    // Channel Configurations
    channels: {
      // In-App Notification
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
        title: {
          type: String,
          required: true,
        },
        titleAr: String,
        body: {
          type: String,
          required: true,
        },
        bodyAr: String,
        actionUrl: String, // Deep link
        priority: {
          type: String,
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
        },
      },

      // Email
      email: {
        enabled: {
          type: Boolean,
          default: false,
        },
        subject: String,
        subjectAr: String,
        htmlTemplate: String, // HTML template with {{variables}}
        textTemplate: String, // Plain text fallback
        fromName: {
          type: String,
          default: 'TF1 Platform',
        },
        fromNameAr: {
          type: String,
          default: 'منصة TF1',
        },
        replyTo: String,
      },

      // SMS
      sms: {
        enabled: {
          type: Boolean,
          default: false,
        },
        template: String, // SMS text (max 160 chars)
        templateAr: String,
      },

      // WhatsApp
      whatsapp: {
        enabled: {
          type: Boolean,
          default: false,
        },
        template: String,
        templateAr: String,
        templateId: String, // WhatsApp approved template ID
      },

      // Push Notification
      push: {
        enabled: {
          type: Boolean,
          default: false,
        },
        title: String,
        titleAr: String,
        body: String,
        bodyAr: String,
        icon: String,
        sound: {
          type: String,
          default: 'default',
        },
      },
    },

    // Template Variables
    variables: [
      {
        key: {
          type: String,
          required: true, // e.g., 'applicantName', 'jobTitle'
        },
        label: {
          type: String,
          required: true,
        },
        labelAr: String,
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'url', 'email', 'phone'],
          default: 'string',
        },
        required: {
          type: Boolean,
          default: false,
        },
        defaultValue: mongoose.Schema.Types.Mixed,
        example: String,
        description: String,
        descriptionAr: String,
      },
    ],

    // Settings
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystemTemplate: {
      type: Boolean,
      default: true, // System templates vs custom templates
    },
    isCustomizable: {
      type: Boolean,
      default: false, // Can companies customize this template?
    },

    // Publisher Customizations (if allowed)
    customizations: [
      {
        publisherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        channels: mongoose.Schema.Types.Mixed, // Custom channel configs
        isActive: Boolean,
        updatedAt: Date,
      },
    ],

    // Usage Statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
    deliveryStats: {
      sent: {
        type: Number,
        default: 0,
      },
      delivered: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
      opened: {
        type: Number,
        default: 0,
      },
      clicked: {
        type: Number,
        default: 0,
      },
    },

    // Metadata
    description: String,
    descriptionAr: String,
    icon: String,
    color: String,

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
notificationTemplateSchema.index({ category: 1, isActive: 1 });
notificationTemplateSchema.index({ trigger: 1 });
notificationTemplateSchema.index({ isSystemTemplate: 1, isActive: 1 });

// Statics

// Get template by key
notificationTemplateSchema.statics.getByKey = async function (key) {
  return this.findOne({ key, isActive: true });
};

// Get templates by category
notificationTemplateSchema.statics.getByCategory = async function (
  category,
  isActive = true
) {
  const query = { category };
  if (isActive !== null) {
    query.isActive = isActive;
  }
  return this.find(query).sort({ name: 1 });
};

// Get templates by trigger
notificationTemplateSchema.statics.getByTrigger = async function (trigger) {
  return this.find({ trigger, isActive: true });
};

// Get all active templates
notificationTemplateSchema.statics.getActiveTemplates = async function () {
  return this.find({ isActive: true }).sort({ category: 1, name: 1 });
};

// Methods

// Render template with variables
notificationTemplateSchema.methods.render = function (
  channel,
  variables = {},
  language = 'en'
) {
  const channelConfig = this.channels[channel];

  if (!channelConfig || !channelConfig.enabled) {
    return null;
  }

  const rendered = {};

  // Render based on channel type
  switch (channel) {
    case 'inApp':
      rendered.title = this.replaceVariables(
        language === 'ar' && channelConfig.titleAr
          ? channelConfig.titleAr
          : channelConfig.title,
        variables
      );
      rendered.body = this.replaceVariables(
        language === 'ar' && channelConfig.bodyAr
          ? channelConfig.bodyAr
          : channelConfig.body,
        variables
      );
      rendered.actionUrl = this.replaceVariables(channelConfig.actionUrl, variables);
      rendered.priority = channelConfig.priority;
      break;

    case 'email':
      rendered.subject = this.replaceVariables(
        language === 'ar' && channelConfig.subjectAr
          ? channelConfig.subjectAr
          : channelConfig.subject,
        variables
      );
      rendered.html = this.replaceVariables(channelConfig.htmlTemplate, variables);
      rendered.text = this.replaceVariables(channelConfig.textTemplate, variables);
      rendered.fromName =
        language === 'ar' && channelConfig.fromNameAr
          ? channelConfig.fromNameAr
          : channelConfig.fromName;
      rendered.replyTo = channelConfig.replyTo;
      break;

    case 'sms':
      rendered.text = this.replaceVariables(
        language === 'ar' && channelConfig.templateAr
          ? channelConfig.templateAr
          : channelConfig.template,
        variables
      );
      break;

    case 'whatsapp':
      rendered.text = this.replaceVariables(
        language === 'ar' && channelConfig.templateAr
          ? channelConfig.templateAr
          : channelConfig.template,
        variables
      );
      rendered.templateId = channelConfig.templateId;
      break;

    case 'push':
      rendered.title = this.replaceVariables(
        language === 'ar' && channelConfig.titleAr
          ? channelConfig.titleAr
          : channelConfig.title,
        variables
      );
      rendered.body = this.replaceVariables(
        language === 'ar' && channelConfig.bodyAr
          ? channelConfig.bodyAr
          : channelConfig.body,
        variables
      );
      rendered.icon = channelConfig.icon;
      rendered.sound = channelConfig.sound;
      break;
  }

  return rendered;
};

// Replace variables in template string
notificationTemplateSchema.methods.replaceVariables = function (template, variables) {
  if (!template) return '';

  let result = template;

  // Replace {{variable}} with actual values
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });

  // Remove any unreplaced variables
  result = result.replace(/{{[^}]+}}/g, '');

  return result;
};

// Validate variables
notificationTemplateSchema.methods.validateVariables = function (variables) {
  const errors = [];

  this.variables.forEach(varDef => {
    if (varDef.required && !variables[varDef.key]) {
      errors.push(`Missing required variable: ${varDef.key}`);
    }

    // Type validation
    if (variables[varDef.key]) {
      const value = variables[varDef.key];
      switch (varDef.type) {
        case 'number':
          if (isNaN(value)) {
            errors.push(`Variable ${varDef.key} must be a number`);
          }
          break;
        case 'date':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`Variable ${varDef.key} must be a valid date`);
          }
          break;
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`Variable ${varDef.key} must be a valid email`);
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`Variable ${varDef.key} must be a valid URL`);
          }
          break;
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Increment usage count
notificationTemplateSchema.methods.recordUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this;
};

// Record delivery stats
notificationTemplateSchema.methods.recordDelivery = function (status) {
  if (!this.deliveryStats) {
    this.deliveryStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
    };
  }

  switch (status) {
    case 'sent':
      this.deliveryStats.sent += 1;
      break;
    case 'delivered':
      this.deliveryStats.delivered += 1;
      break;
    case 'failed':
      this.deliveryStats.failed += 1;
      break;
    case 'opened':
      this.deliveryStats.opened += 1;
      break;
    case 'clicked':
      this.deliveryStats.clicked += 1;
      break;
  }

  return this;
};

// Get customization for publisher
notificationTemplateSchema.methods.getCustomizationForPublisher = function (
  publisherId
) {
  return this.customizations.find(
    c => c.publisherId.toString() === publisherId.toString()
  );
};

// Set customization for publisher
notificationTemplateSchema.methods.setCustomizationForPublisher = function (
  publisherId,
  customChannels
) {
  const existingIndex = this.customizations.findIndex(
    c => c.publisherId.toString() === publisherId.toString()
  );

  const customization = {
    publisherId,
    channels: customChannels,
    isActive: true,
    updatedAt: new Date(),
  };

  if (existingIndex >= 0) {
    this.customizations[existingIndex] = customization;
  } else {
    this.customizations.push(customization);
  }

  return this;
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
