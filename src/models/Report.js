const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  reportType: {
    type: String,
    enum: ['user', 'review', 'message', 'post', 'job', 'other'],
    required: true,
    index: true
  },

  reportedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  reportedEntityModel: {
    type: String,
    enum: ['User', 'Review', 'Message', 'Post', 'Job'],
    required: true
  },

  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'fake', 'scam', 'violence', 'hate_speech', 'other'],
    required: true,
    index: true
  },

  details: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: Date,

  resolution: {
    action: {
      type: String,
      enum: ['no_action', 'warning', 'content_removed', 'user_suspended', 'user_banned']
    },
    notes: String
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  }

}, {
  timestamps: true
});

// Indexes
reportSchema.index({ reportType: 1, status: 1 });
reportSchema.index({ reportedEntityId: 1, reportType: 1 });

// Statics

// Get reports for moderation
reportSchema.statics.getReportsForModeration = async function(options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'pending',
    reportType,
    priority
  } = options;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (reportType) {
    query.reportType = reportType;
  }

  if (priority) {
    query.priority = priority;
  }

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    this.find(query)
      .populate('reporterId', 'firstName lastName avatar role')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);

  return {
    reports,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Check if entity is already reported by user
reportSchema.statics.hasUserReported = async function(reporterId, reportedEntityId, reportType) {
  const report = await this.findOne({
    reporterId,
    reportedEntityId,
    reportType,
    status: { $in: ['pending', 'reviewing'] }
  });

  return !!report;
};

// Get report count for entity
reportSchema.statics.getReportCount = async function(reportedEntityId, reportType) {
  return this.countDocuments({
    reportedEntityId,
    reportType,
    status: { $ne: 'dismissed' }
  });
};

module.exports = mongoose.model('Report', reportSchema);
