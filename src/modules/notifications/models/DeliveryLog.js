const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema(
  {
    // References
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Delivery Channel
    channel: {
      type: String,
      required: true,
      enum: ['email', 'sms', 'push', 'whatsapp', 'inapp'],
      index: true,
    },

    // Recipient Information
    recipient: {
      email: String,
      phone: String,
      deviceToken: String, // For push notifications
      whatsappNumber: String,
    },

    // Delivery Status
    status: {
      type: String,
      required: true,
      enum: [
        'queued',
        'sending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'rejected',
        'opened',
        'clicked',
      ],
      default: 'queued',
      index: true,
    },

    // Timing
    queuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sendingAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    failedAt: Date,

    // Provider Information
    provider: {
      type: String,
      enum: [
        'sendgrid',
        'ses',
        'mailgun',
        'twilio',
        'firebase',
        'onesignal',
        'expo',
        'whatsapp-api',
        'internal',
      ],
    },
    providerId: String, // External message/delivery ID from provider
    providerResponse: mongoose.Schema.Types.Mixed,

    // Error Handling
    errorMessage: String,
    errorCode: String,
    errorDetails: mongoose.Schema.Types.Mixed,

    // Retry Information
    attempts: {
      type: Number,
      default: 1,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    nextRetryAt: Date,

    // Content (for debugging)
    content: {
      subject: String,
      body: String,
      htmlBody: String,
      template: String,
      variables: mongoose.Schema.Types.Mixed,
    },

    // Tracking
    tracking: {
      ipAddress: String,
      userAgent: String,
      deviceType: String,
      location: {
        country: String,
        city: String,
      },
      clickedLinks: [
        {
          url: String,
          clickedAt: Date,
        },
      ],
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Cost (if applicable)
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
deliveryLogSchema.index({ userId: 1, channel: 1, status: 1 });
deliveryLogSchema.index({ notificationId: 1, channel: 1 });
deliveryLogSchema.index({ status: 1, nextRetryAt: 1 });
deliveryLogSchema.index({ queuedAt: -1 });
deliveryLogSchema.index({ createdAt: -1 });

// Statics

// Get delivery statistics for a user
deliveryLogSchema.statics.getUserStatistics = async function (
  userId,
  dateRange = {}
) {
  const { startDate, endDate } = dateRange;

  const matchStage = { userId: mongoose.Types.ObjectId(userId) };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$channel',
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        totalCost: { $sum: '$cost.amount' },
      },
    },
  ]);

  return stats;
};

// Get global delivery statistics
deliveryLogSchema.statics.getGlobalStatistics = async function (dateRange = {}) {
  const { startDate, endDate } = dateRange;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        queued: { $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] } },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        totalCost: { $sum: '$cost.amount' },
        avgDeliveryTime: {
          $avg: {
            $subtract: ['$deliveredAt', '$queuedAt'],
          },
        },
      },
    },
  ]);

  const result = stats[0] || { total: 0 };

  // Calculate rates
  if (result.total > 0) {
    result.deliveryRate = ((result.delivered / result.sent) * 100).toFixed(2);
    result.openRate = ((result.opened / result.delivered) * 100).toFixed(2);
    result.clickRate = ((result.clicked / result.opened) * 100).toFixed(2);
    result.failureRate = ((result.failed / result.total) * 100).toFixed(2);
  }

  return result;
};

// Get failed deliveries for retry
deliveryLogSchema.statics.getFailedForRetry = async function (limit = 100) {
  const now = new Date();

  return this.find({
    status: 'failed',
    attempts: { $lt: this.maxAttempts },
    $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: null }],
  })
    .limit(limit)
    .lean();
};

// Get delivery rate by channel
deliveryLogSchema.statics.getChannelPerformance = async function (dateRange = {}) {
  const { startDate, endDate } = dateRange;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const performance = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$channel',
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDeliveryTime: {
          $avg: {
            $cond: [
              { $and: ['$deliveredAt', '$queuedAt'] },
              { $subtract: ['$deliveredAt', '$queuedAt'] },
              null,
            ],
          },
        },
        totalCost: { $sum: '$cost.amount' },
      },
    },
    {
      $project: {
        channel: '$_id',
        total: 1,
        delivered: 1,
        failed: 1,
        deliveryRate: {
          $multiply: [{ $divide: ['$delivered', '$total'] }, 100],
        },
        avgDeliveryTimeMinutes: {
          $divide: ['$avgDeliveryTime', 60000], // Convert ms to minutes
        },
        totalCost: 1,
      },
    },
    { $sort: { deliveryRate: -1 } },
  ]);

  return performance;
};

// Methods

// Mark as sent
deliveryLogSchema.methods.markAsSent = function (providerId, providerResponse = null) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.providerId = providerId;
  this.providerResponse = providerResponse;
  return this;
};

// Mark as delivered
deliveryLogSchema.methods.markAsDelivered = function () {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this;
};

// Mark as failed
deliveryLogSchema.methods.markAsFailed = function (errorMessage, errorCode = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;

  // Schedule retry if attempts remain
  if (this.attempts < this.maxAttempts) {
    const retryDelayMinutes = Math.pow(2, this.attempts) * 5; // Exponential backoff
    this.nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
  }

  return this;
};

// Mark as opened
deliveryLogSchema.methods.markAsOpened = function (trackingData = {}) {
  this.status = 'opened';
  this.openedAt = new Date();

  if (trackingData) {
    this.tracking = {
      ...this.tracking,
      ...trackingData,
    };
  }

  return this;
};

// Mark as clicked
deliveryLogSchema.methods.markAsClicked = function (url, trackingData = {}) {
  this.status = 'clicked';
  this.clickedAt = new Date();

  if (!this.tracking) {
    this.tracking = {};
  }

  if (!this.tracking.clickedLinks) {
    this.tracking.clickedLinks = [];
  }

  this.tracking.clickedLinks.push({
    url,
    clickedAt: new Date(),
  });

  if (trackingData) {
    this.tracking = {
      ...this.tracking,
      ...trackingData,
    };
  }

  return this;
};

// Increment retry attempt
deliveryLogSchema.methods.incrementAttempt = function () {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  return this;
};

// Calculate delivery time
deliveryLogSchema.methods.getDeliveryTime = function () {
  if (this.deliveredAt && this.queuedAt) {
    return Math.floor((this.deliveredAt - this.queuedAt) / 1000); // in seconds
  }
  return null;
};

// Check if should retry
deliveryLogSchema.methods.shouldRetry = function () {
  if (this.status !== 'failed') return false;
  if (this.attempts >= this.maxAttempts) return false;
  if (!this.nextRetryAt) return true;
  return this.nextRetryAt <= new Date();
};

module.exports = mongoose.model('DeliveryLog', deliveryLogSchema);
