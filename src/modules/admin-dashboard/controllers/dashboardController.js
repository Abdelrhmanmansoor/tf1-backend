const AdminLog = require('../models/AdminLog');
const AdminKey = require('../models/AdminKey');
const { logAdminAction, getClientIP } = require('../middleware/adminAuth');

// Get dashboard overview statistics
exports.getDashboardOverview = async (req, res) => {
  try {
    const days = req.query.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get action statistics
    const stats = await AdminLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
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

    // Get admin activity
    const admins = await AdminLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$adminId',
          actions: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin',
        },
      },
      {
        $unwind: '$admin',
      },
      {
        $sort: { actions: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get action timeline
    const timeline = await AdminLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Get failure rate
    const failureStats = await AdminLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          failed: 1,
          successRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$total', '$failed'] },
                  '$total',
                ],
              },
              100,
            ],
          },
        },
      },
    ]);

    const overview = {
      period: { days, startDate },
      stats,
      topAdmins: admins,
      timeline,
      failureRate: failureStats[0] || { total: 0, failed: 0, successRate: 100 },
    };

    await logAdminAction(
      req,
      'VIEW_DASHBOARD',
      'SYSTEM',
      null,
      'SUCCESS'
    );

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    await logAdminAction(
      req,
      'VIEW_DASHBOARD',
      'SYSTEM',
      null,
      'FAILED',
      null,
      'Failed to fetch dashboard overview',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

// Get activity logs with filters
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, actionType, targetType, adminId, status } =
      req.query;

    const skip = (page - 1) * limit;
    const filters = {};

    if (actionType) filters.actionType = actionType;
    if (targetType) filters.targetType = targetType;
    if (adminId) filters.adminId = adminId;
    if (status) filters.status = status;

    const logs = await AdminLog.find(filters)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AdminLog.countDocuments(filters);

    await logAdminAction(
      req,
      'VIEW_LOGS',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'Activity logs accessed'
    );

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message,
    });
  }
};

// Export logs as CSV
exports.exportLogs = async (req, res) => {
  try {
    const { startDate, endDate, actionType } = req.query;

    const filters = {};
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    if (actionType) filters.actionType = actionType;

    const logs = await AdminLog.find(filters)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Convert to CSV
    const csv = convertLogsToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="admin-logs.csv"'
    );

    await logAdminAction(
      req,
      'EXPORT_DATA',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      `Exported ${logs.length} logs to CSV`
    );

    res.send(csv);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting logs',
      error: error.message,
    });
  }
};

// Get admin key management
exports.getAdminKeys = async (req, res) => {
  try {
    const keys = await AdminKey.getActiveKeys();

    await logAdminAction(
      req,
      'VIEW_SYSTEM',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'Admin keys viewed'
    );

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('Error fetching admin keys:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin keys',
      error: error.message,
    });
  }
};

// Create new admin key
exports.createAdminKey = async (req, res) => {
  try {
    const {
      keyName,
      description,
      permissions,
      expiresAt,
      ipWhitelist,
      rateLimit,
      purpose,
    } = req.body;

    // Validate required fields
    if (!keyName) {
      return res.status(400).json({
        success: false,
        message: 'Key name is required',
      });
    }

    // Generate new key
    const { rawKey, hashedKey, keyPrefix } = AdminKey.generateKey();

    const newKey = new AdminKey({
      keyName,
      hashedKey,
      keyPrefix,
      description,
      permissions: permissions || [
        'view_dashboard',
        'manage_posts',
        'manage_media',
        'manage_users',
        'view_logs',
        'manage_system_settings',
      ],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      ipWhitelist: ipWhitelist || [],
      rateLimit: rateLimit || { maxRequests: 1000, windowMs: 3600000 },
      createdBy: req.adminId,
      metadata: { purpose },
    });

    await newKey.save();

    await logAdminAction(
      req,
      'CREATE_SYSTEM_CONFIG',
      'SYSTEM',
      newKey._id,
      'SUCCESS',
      null,
      `Created new admin key: ${keyName}`,
      null,
      null
    );

    res.status(201).json({
      success: true,
      data: {
        keyId: newKey._id,
        keyName: newKey.keyName,
        rawKey,
        // IMPORTANT: Return raw key only once during creation
        keyPrefix: newKey.keyPrefix,
        message: 'Store the raw key securely. It will not be shown again.',
      },
    });
  } catch (error) {
    console.error('Error creating admin key:', error);

    await logAdminAction(
      req,
      'CREATE_SYSTEM_CONFIG',
      'SYSTEM',
      null,
      'FAILED',
      null,
      'Failed to create admin key',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error creating admin key',
      error: error.message,
    });
  }
};

// Revoke admin key
exports.revokeAdminKey = async (req, res) => {
  try {
    const { keyId } = req.params;

    const key = await AdminKey.findById(keyId);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: 'Admin key not found',
      });
    }

    await key.revoke();

    await logAdminAction(
      req,
      'UPDATE_SYSTEM_CONFIG',
      'SYSTEM',
      keyId,
      'SUCCESS',
      { before: { isActive: true }, after: { isActive: false } },
      `Revoked admin key: ${key.keyName}`
    );

    res.json({
      success: true,
      message: 'Admin key revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking admin key:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking admin key',
      error: error.message,
    });
  }
};

// Helper function to convert logs to CSV
function convertLogsToCSV(logs) {
  const headers = [
    'Admin',
    'Action Type',
    'Target Type',
    'Status',
    'IP Address',
    'Description',
    'Timestamp',
  ];

  const rows = logs.map((log) => [
    log.adminId?.name || 'Unknown',
    log.actionType,
    log.targetType,
    log.status,
    log.ipAddress,
    log.description || '',
    new Date(log.createdAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

module.exports = {
  getDashboardOverview: exports.getDashboardOverview,
  getActivityLogs: exports.getActivityLogs,
  exportLogs: exports.exportLogs,
  getAdminKeys: exports.getAdminKeys,
  createAdminKey: exports.createAdminKey,
  revokeAdminKey: exports.revokeAdminKey,
};
