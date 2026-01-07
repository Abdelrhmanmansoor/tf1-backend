const mongoose = require('mongoose');

const pushQueueSchema = new mongoose.Schema({
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSDeviceToken',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  device_token: {
    type: String,
    required: true
  },
  notification: {
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed'],
    default: 'queued',
    index: true
  },
  scheduled_at: {
    type: Date,
    default: Date.now
  },
  sent_at: Date,
  error: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

pushQueueSchema.index({ status: 1, scheduled_at: 1 });

module.exports = mongoose.model('MSPushQueue', pushQueueSchema, 'ms_push_queue');

