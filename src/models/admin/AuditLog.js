const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: String,
  userName: String,
  userRole: String,
  userType: {
    type: String,
    enum: ['sports-administrator', 'team', 'admin', 'user'],
    default: 'user'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed',
      'view', 'create', 'update', 'delete',
      'export', 'import',
      'permission_granted', 'permission_revoked',
      'team_member_added', 'team_member_removed',
      'settings_changed',
      'password_changed', 'password_reset',
      'access_denied',
      'route_accessed', 'api_called',
      'error', 'warning'
    ]
  },
  module: {
    type: String,
    required: true
  },
  moduleAr: String,
  description: {
    type: String,
    required: true
  },
  descriptionAr: String,
  targetId: mongoose.Schema.Types.ObjectId,
  targetType: String,
  targetName: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: {
    ip: String,
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    location: String,
    sessionId: String
  },
  route: String,
  method: String,
  statusCode: Number,
  responseTime: Number,
  isSuccess: {
    type: Boolean,
    default: true
  },
  errorMessage: String,
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  }
}, {
  timestamps: true
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'metadata.ip': 1 });
auditLogSchema.index({ userType: 1, createdAt: -1 });

auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Audit log error:', error);
    return null;
  }
};

auditLogSchema.statics.getRecentLogs = async function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

auditLogSchema.statics.getLogsByModule = async function (module, options = {}) {
  const { startDate, endDate, limit = 100 } = options;
  const query = { module };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

auditLogSchema.statics.getSecurityLogs = async function (limit = 100) {
  return this.find({
    action: { $in: ['login', 'logout', 'login_failed', 'access_denied', 'permission_granted', 'permission_revoked'] }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
