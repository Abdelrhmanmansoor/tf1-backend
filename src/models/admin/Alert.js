const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['warning', 'error', 'info', 'success'],
    required: true
  },
  category: {
    type: String,
    enum: ['system', 'security', 'user', 'payment', 'content', 'performance'],
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  messageAr: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetRoles: [{
    type: String
  }],
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String,
  relatedEntity: {
    type: {
      type: String,
      enum: ['user', 'document', 'payment', 'meeting', 'task']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  actionUrl: String,
  actionLabel: String,
  actionLabelAr: String,
  expiresAt: Date,
  viewedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: Date
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

alertSchema.index({ clubId: 1, resolved: 1 });
alertSchema.index({ type: 1, priority: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
