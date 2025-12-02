const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    userRole: {
      type: String,
      enum: ['player', 'coach', 'club', 'specialist', 'admin', 'administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary'],
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        // Player notifications
        'training_offer',
        'training_accepted',
        'training_rejected',
        'session_reminder',
        'session_cancelled',
        'session_completed',
        'job_match',
        'club_accepted',
        'club_rejected',
        'message_received',
        'review_received',
        // Coach notifications
        'training_request',
        'session_booked',
        'payment_received',
        'club_invitation',
        // Specialist notifications
        'consultation_request',
        // Club notifications
        'membership_request',
        'job_application',
        'facility_booking',
        // Match notifications
        'match_joined',
        'match_left',
        'match_cancelled',
        'match_reminder',
        'new_player_joined',
        'player_left_match',
        // Job application notifications
        'new_application',
        'application_received',
        'application_reviewed',
        // Common notifications
        'new_follower',
        'profile_verified',
        'account_warning',
        'system_update',
      ],
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    titleAr: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    messageAr: {
      type: String,
    },

    // Related entity
    relatedTo: {
      entityType: {
        type: String,
        enum: [
          'training_request',
          'training_session',
          'consultation_request',
          'consultation_session',
          'job',
          'job_application',
          'club_membership',
          'message',
          'conversation',
          'review',
          'facility_booking',
          'user',
          'system',
          'match',
          'public_match',
        ],
      },
      entityId: mongoose.Schema.Types.ObjectId,
    },

    // Action link (deep link to relevant page)
    actionUrl: {
      type: String,
      trim: true,
    },

    // Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: Date,

    // Delivery channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },

    // Email/Push delivery status
    deliveryStatus: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    // Grouping (for bundling similar notifications)
    groupKey: {
      type: String,
      trim: true,
      index: true,
    },

    // Auto-delete after expiry
    expiresAt: {
      type: Date,
    },

    // Metadata (additional data for notification)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: -1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Statics

// Get unread count for a user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    isRead: false,
  });
};

// Get notifications for a user with pagination
notificationSchema.statics.getUserNotifications = async function (
  userId,
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    priority = null,
    type = null,
  } = options;

  const query = { userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (priority) {
    query.priority = priority;
  }

  if (type) {
    query.type = type;
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    notifications,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

// Mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

// Mark multiple as read
notificationSchema.statics.markMultipleAsRead = async function (
  userId,
  notificationIds
) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

// Delete old read notifications
notificationSchema.statics.deleteOldReadNotifications = async function (
  daysOld = 30
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isRead: true,
    readAt: { $lt: cutoffDate },
  });
};

// Get grouped notifications
notificationSchema.statics.getGroupedNotifications = async function (
  userId,
  groupKey
) {
  return this.find({
    userId,
    groupKey,
  }).sort({ createdAt: -1 });
};

// Methods

// Mark single notification as read
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

// Check if notification has expired
notificationSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Get formatted notification (with language support)
notificationSchema.methods.format = function (language = 'en') {
  return {
    _id: this._id,
    type: this.type,
    title: language === 'ar' && this.titleAr ? this.titleAr : this.title,
    message:
      language === 'ar' && this.messageAr ? this.messageAr : this.message,
    relatedTo: this.relatedTo,
    actionUrl: this.actionUrl,
    isRead: this.isRead,
    readAt: this.readAt,
    priority: this.priority,
    metadata: this.metadata,
    createdAt: this.createdAt,
  };
};

// Helper to create notification with default expiry
notificationSchema.statics.createNotification = async function (data) {
  // Set default expiry to 30 days if not provided
  if (!data.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    data.expiresAt = expiryDate;
  }

  return this.create(data);
};

module.exports = mongoose.model('Notification', notificationSchema);
