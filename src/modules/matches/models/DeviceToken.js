const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  device_token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  last_used: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

deviceTokenSchema.index({ user_id: 1, active: 1 });

module.exports = mongoose.model('MSDeviceToken', deviceTokenSchema, 'ms_device_tokens');

