const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'CREATE_POST',
        'UPDATE_POST',
        'DELETE_POST',
        'PUBLISH_POST',
        'UNPUBLISH_POST',
        'UPLOAD_MEDIA',
        'DELETE_MEDIA',
        'CREATE_USER',
        'UPDATE_USER',
        'DELETE_USER',
        'CHANGE_ROLE',
        'VIEW_USER',
        'SYSTEM_CONFIG_UPDATE',
        'BACKUP_CREATED',
        'API_SYNC',
        'LOGIN',
        'LOGOUT',
        'FAILED_LOGIN',
        'PERMISSION_DENIED',
        'BULK_ACTION',
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['POST', 'MEDIA', 'USER', 'SYSTEM', 'BACKUP', 'API'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    targetName: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
      default: 'SUCCESS',
    },
    errorMessage: {
      type: String,
      required: false,
    },
    metadata: {
      browser: String,
      os: String,
      deviceType: String,
      customData: mongoose.Schema.Types.Mixed,
    },
    affectedRecords: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'admin_logs',
    indexes: [
      { adminId: 1, createdAt: -1 },
      { actionType: 1, createdAt: -1 },
      { targetType: 1, createdAt: -1 },
      { ipAddress: 1, createdAt: -1 },
      { 'metadata.browser': 1 },
      { createdAt: -1 },
    ],
  }
);

// TTL index - автоматически удаляет логи старше 180 дней
adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

// Метод для поиска по датам
adminLogSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ createdAt: -1 });
};

// Метод для получения сводки действий админа
adminLogSchema.statics.getAdminActivitySummary = function (adminId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        adminId: mongoose.Types.ObjectId(adminId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Метод для получения последних действий с фильтром
adminLogSchema.statics.getRecentLogs = function (filters = {}, limit = 50) {
  const query = {};

  if (filters.adminId) {
    query.adminId = filters.adminId;
  }
  if (filters.actionType) {
    query.actionType = filters.actionType;
  }
  if (filters.targetType) {
    query.targetType = filters.targetType;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  return this.find(query)
    .populate('adminId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Метод для получения статистики действий по типам
adminLogSchema.statics.getActionStatistics = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        successCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0],
          },
        },
        failedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

module.exports = mongoose.model('AdminLog', adminLogSchema);
