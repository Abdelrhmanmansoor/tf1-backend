const mongoose = require('mongoose');

const appEventSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    index: true
  },
  event_name: {
    type: String,
    required: true,
    index: true
  },
  event_data: {
    type: mongoose.Schema.Types.Mixed
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for analytics
appEventSchema.index({ event_name: 1, timestamp: -1 });
appEventSchema.index({ user_id: 1, event_name: 1, timestamp: -1 });

// TTL index - auto-delete events older than 90 days
appEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('MSAppEvent', appEventSchema, 'ms_app_events');


