const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid webhook URL',
      },
    },
    events: {
      type: [String],
      required: true,
      enum: [
        'post.created',
        'post.updated',
        'post.deleted',
        'media.uploaded',
        'media.deleted',
        'user.created',
        'user.updated',
        'user.deleted',
        'settings.changed',
        'backup.completed',
        'system.alert',
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    headers: {
      type: Map,
      of: String,
      required: false,
    },
    retryPolicy: {
      maxRetries: {
        type: Number,
        default: 3,
      },
      retryDelay: {
        type: Number,
        default: 5000, // 5 seconds
      },
    },
    deliveryAttempts: [
      {
        timestamp: Date,
        statusCode: Number,
        responseBody: String,
        success: Boolean,
      },
    ],
    lastDelivery: {
      timestamp: Date,
      statusCode: Number,
      success: Boolean,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'webhooks',
  }
);

// Index for active webhooks
webhookSchema.index({ isActive: 1, events: 1 });

// Method to record delivery attempt
webhookSchema.methods.recordDeliveryAttempt = function (
  statusCode,
  responseBody,
  success
) {
  this.deliveryAttempts.push({
    timestamp: new Date(),
    statusCode,
    responseBody,
    success,
  });

  // Keep only last 100 attempts
  if (this.deliveryAttempts.length > 100) {
    this.deliveryAttempts.shift();
  }

  this.lastDelivery = {
    timestamp: new Date(),
    statusCode,
    success,
  };

  return this.save();
};

// Get delivery status
webhookSchema.methods.getDeliveryStatus = function () {
  if (!this.lastDelivery) {
    return 'NO_DELIVERY';
  }

  return this.lastDelivery.success ? 'SUCCESS' : 'FAILED';
};

// Get success rate
webhookSchema.methods.getSuccessRate = function () {
  if (this.deliveryAttempts.length === 0) {
    return 0;
  }

  const successCount = this.deliveryAttempts.filter(
    (attempt) => attempt.success
  ).length;
  return (successCount / this.deliveryAttempts.length) * 100;
};

module.exports = mongoose.model('Webhook', webhookSchema);
