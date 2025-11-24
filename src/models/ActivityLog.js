const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'PROFILE_UPDATE',
      'PASSWORD_CHANGE',
      'EMAIL_CHANGE',
      'USER_BLOCKED',
      'USER_UNBLOCKED',
      'SETTINGS_UPDATE',
      'ARTICLE_CREATE',
      'ARTICLE_PUBLISH',
      'ARTICLE_DELETE',
      'JOB_CREATE',
      'JOB_DELETE',
      'MESSAGE_SEND',
      'FILE_UPLOAD',
      'ADMIN_ACTION',
      'OTHER',
    ],
    index: true,
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success',
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
