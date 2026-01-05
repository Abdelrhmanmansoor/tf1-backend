const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
      default: 'Admin Dashboard',
    },
    siteDescription: {
      type: String,
      required: false,
    },
    siteUrl: {
      type: String,
      required: true,
      default: 'http://localhost',
    },
    adminEmail: {
      type: String,
      required: true,
      default: 'admin@example.com',
    },
    siteLogo: {
      type: String,
      required: false,
    },
    favicon: {
      type: String,
      required: false,
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#2563eb',
      },
      secondaryColor: {
        type: String,
        default: '#1e40af',
      },
      accentColor: {
        type: String,
        default: '#f59e0b',
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    security: {
      enableTwoFactor: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Number,
        default: 3600000, // 1 hour in ms
      },
      passwordPolicy: {
        minLength: {
          type: Number,
          default: 8,
        },
        requireUppercase: {
          type: Boolean,
          default: true,
        },
        requireNumbers: {
          type: Boolean,
          default: true,
        },
        requireSpecialChars: {
          type: Boolean,
          default: true,
        },
        expiryDays: {
          type: Number,
          default: 90,
        },
      },
      ipWhitelist: {
        enabled: {
          type: Boolean,
          default: false,
        },
        ips: [String],
      },
    },
    email: {
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'mailgun', 'aws-ses'],
        default: 'smtp',
      },
      senderEmail: String,
      senderName: String,
      smtpConfig: {
        host: String,
        port: Number,
        secure: Boolean,
        auth: {
          user: String,
          pass: String,
        },
      },
    },
    storage: {
      provider: {
        type: String,
        enum: ['local', 's3', 'cloudinary', 'azure'],
        default: 'local',
      },
      maxFileSize: {
        type: Number,
        default: 52428800, // 50MB
      },
      allowedFormats: [String],
    },
    backup: {
      autoBackup: {
        type: Boolean,
        default: true,
      },
      backupSchedule: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
      backupTime: {
        type: String,
        default: '02:00', // HH:mm format
      },
      retentionDays: {
        type: Number,
        default: 30,
      },
    },
    api: {
      enablePublicAPI: {
        type: Boolean,
        default: false,
      },
      rateLimit: {
        requestsPerHour: {
          type: Number,
          default: 1000,
        },
      },
      corsOrigins: [String],
    },
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      slackWebhook: String,
      webhookUrl: String,
      eventTypes: [
        {
          event: String,
          enabled: Boolean,
        },
      ],
    },
    maintenance: {
      isUnderMaintenance: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: String,
      maintenanceStartTime: Date,
      maintenanceEndTime: Date,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'system_settings',
  }
);

// Ensure only one settings document exists
systemSettingsSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingSettings = await this.constructor.findOne();
    if (existingSettings) {
      throw new Error(
        'System settings document already exists. Update the existing one.'
      );
    }
  }
  next();
});

// Instance method to get theme colors
systemSettingsSchema.methods.getThemeColors = function () {
  return {
    primary: this.theme.primaryColor,
    secondary: this.theme.secondaryColor,
    accent: this.theme.accentColor,
    darkMode: this.theme.darkMode,
  };
};

// Instance method to validate email configuration
systemSettingsSchema.methods.validateEmailConfig = function () {
  if (this.email.provider === 'smtp') {
    const { host, port, auth } = this.email.smtpConfig;
    if (!host || !port || !auth?.user || !auth?.pass) {
      throw new Error('SMTP configuration is incomplete');
    }
  }
  return true;
};

// Static method to get settings
systemSettingsSchema.statics.getSettings = function () {
  return this.findOne();
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
