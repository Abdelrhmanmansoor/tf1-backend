const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient user
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Sender user (if applicable)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Notification type
  type: {
    type: String,
    enum: [
      'job_application',
      'application_status_change',
      'interview_scheduled',
      'job_posted',
      'message_received',
      'profile_viewed',
      'application_rejected',
      'application_accepted',
      'application_shortlisted',
      'message_reply',
      'conversation_started'
    ],
    required: true,
    index: true
  },

  // Title and description
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  // Related data
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['job', 'application', 'message', 'conversation', 'user'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },

  // Additional data
  data: {
    jobTitle: String,
    companyName: String,
    applicationStatus: String,
    messagePreview: String,
    imageUrl: String,
    actionUrl: String
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  // Action status
  isActioned: {
    type: Boolean,
    default: false
  },

  actionedAt: Date,

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Expiry (for temporary notifications)
  expiresAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // Auto-delete after 30 days
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ 'relatedEntity.entityId': 1 });

// Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = Date.now();
  return this.save();
};

notificationSchema.methods.markAsActioned = function() {
  this.isActioned = true;
  this.actionedAt = Date.now();
  return this.save();
};

notificationSchema.statics.createNotification = async function(
  recipientId,
  type,
  title,
  description,
  relatedEntity,
  data = {},
  priority = 'normal'
) {
  try {
    const notification = new this({
      recipientId,
      type,
      title,
      description,
      relatedEntity,
      data,
      priority
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
