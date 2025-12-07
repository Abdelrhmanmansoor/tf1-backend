const mongoose = require('mongoose');

const matchNotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    default: null
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
matchNotificationSchema.index({ user_id: 1, created_at: -1 });
matchNotificationSchema.index({ user_id: 1, read_at: 1 });

module.exports = mongoose.model('MSMatchNotification', matchNotificationSchema, 'ms_match_notifications');
