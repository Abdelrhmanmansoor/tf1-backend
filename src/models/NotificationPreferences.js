const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    preferences: {
      // Channel preferences
      email: {
        enabled: {
          type: Boolean,
          default: true,
        },
        frequency: {
          type: String,
          enum: ['instant', 'daily_digest', 'weekly_digest'],
          default: 'instant',
        },
      },
      push: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false,
        },
      },

      // Type preferences
      trainingRequests: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      messages: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      payments: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      reviews: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      jobMatches: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      sessionReminders: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      applications: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      clubInvitations: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      systemUpdates: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
      },
    },

    // Quiet hours
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: {
        type: String, // "22:00"
        default: '22:00',
      },
      end: {
        type: String, // "08:00"
        default: '08:00',
      },
      timezone: {
        type: String,
        default: 'Africa/Cairo',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Statics

// Get or create preferences for a user
notificationPreferencesSchema.statics.getOrCreate = async function (userId) {
  let preferences = await this.findOne({ userId });

  if (!preferences) {
    preferences = await this.create({ userId });
  }

  return preferences;
};

// Methods

// Check if notification should be sent based on preferences and quiet hours
notificationPreferencesSchema.methods.shouldSendNotification = function (
  notificationType,
  channel
) {
  // Check channel is enabled
  if (!this.preferences[channel] || !this.preferences[channel].enabled) {
    return false;
  }

  // Check notification type preferences
  const typePrefs = this.preferences[notificationType];
  if (!typePrefs || !typePrefs[channel]) {
    return false;
  }

  // Check quiet hours
  if (this.quietHours.enabled && channel !== 'inApp') {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.quietHours.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = this.quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime < endTime) {
        return false; // In quiet hours
      }
    } else {
      if (currentTime >= startTime && currentTime < endTime) {
        return false; // In quiet hours
      }
    }
  }

  return true;
};

// Update specific preference
notificationPreferencesSchema.methods.updatePreference = function (
  notificationType,
  channel,
  value
) {
  if (!this.preferences[notificationType]) {
    this.preferences[notificationType] = {};
  }

  this.preferences[notificationType][channel] = value;
  return this.save();
};

// Enable/disable all notifications
notificationPreferencesSchema.methods.toggleAllNotifications = function (
  enabled
) {
  Object.keys(this.preferences).forEach(key => {
    if (
      typeof this.preferences[key] === 'object' &&
      this.preferences[key] !== null
    ) {
      if (this.preferences[key].enabled !== undefined) {
        this.preferences[key].enabled = enabled;
      }
    }
  });

  return this.save();
};

module.exports = mongoose.model(
  'NotificationPreferences',
  notificationPreferencesSchema
);
