const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');
const User = require('../modules/shared/models/User');

// @desc Get all system settings
// @route GET /api/v1/admin/settings
// @access Private (admin only)
exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne({});
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      code: 'SETTINGS_ERROR',
    });
  }
};

// @desc Update system settings
// @route PATCH /api/v1/admin/settings
// @access Private (admin only)
exports.updateSettings = async (req, res) => {
  try {
    const {
      siteName,
      siteDescription,
      siteLogoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      maintenanceMode,
      maintenanceMessage,
      registrationEnabled,
      emailVerificationRequired,
      termsUrl,
      privacyUrl,
      supportEmail,
      socialLinks,
      featuresConfig,
    } = req.body;

    let settings = await Setting.findOne({});
    if (!settings) {
      settings = new Setting();
    }

    if (siteName) settings.siteName = siteName;
    if (siteDescription) settings.siteDescription = siteDescription;
    if (siteLogoUrl) settings.siteLogoUrl = siteLogoUrl;
    if (primaryColor) settings.theme.primaryColor = primaryColor;
    if (secondaryColor) settings.theme.secondaryColor = secondaryColor;
    if (accentColor) settings.theme.accentColor = accentColor;
    if (backgroundColor) settings.theme.backgroundColor = backgroundColor;
    if (textColor) settings.theme.textColor = textColor;
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage) settings.maintenanceMessage = maintenanceMessage;
    if (typeof registrationEnabled === 'boolean') settings.features.registrationEnabled = registrationEnabled;
    if (typeof emailVerificationRequired === 'boolean') settings.features.emailVerificationRequired = emailVerificationRequired;
    if (termsUrl) settings.legal.termsUrl = termsUrl;
    if (privacyUrl) settings.legal.privacyUrl = privacyUrl;
    if (supportEmail) settings.support.email = supportEmail;
    if (socialLinks) settings.social = socialLinks;
    if (featuresConfig) settings.features = { ...settings.features, ...featuresConfig };

    await settings.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'SETTINGS_UPDATE',
      details: {
        changedFields: Object.keys(req.body),
        timestamp: new Date(),
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      code: 'UPDATE_ERROR',
    });
  }
};

// @desc Get activity logs
// @route GET /api/v1/admin/logs?limit=50&action=LOGIN
// @access Private (admin only)
exports.getActivityLogs = async (req, res) => {
  try {
    const { limit = 50, action, userId, startDate, endDate } = req.query;
    let query = {};

    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      code: 'LOGS_ERROR',
    });
  }
};

// @desc Get user login history
// @route GET /api/v1/admin/user-logins?limit=100
// @access Private (admin only)
exports.getUserLoginHistory = async (req, res) => {
  try {
    const { limit = 100, userId } = req.query;
    let query = { action: 'LOGIN' };

    if (userId) query.userId = userId;

    const loginLogs = await ActivityLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: loginLogs.length,
      data: loginLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching login history',
      code: 'HISTORY_ERROR',
    });
  }
};

// @desc Get user activity
// @route GET /api/v1/admin/user-activity/:userId?limit=50
// @access Private (admin only)
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    const activities = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      activities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      code: 'ACTIVITY_ERROR',
    });
  }
};

// @desc Get system analytics
// @route GET /api/v1/admin/analytics
// @access Private (admin only)
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setDate(1)),
      },
      isDeleted: false,
    });

    const loginLogsThisMonth = await ActivityLog.countDocuments({
      action: 'LOGIN',
      createdAt: {
        $gte: new Date(new Date().setDate(1)),
      },
    });

    const usersByRole = await User.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const verifiedUsers = await User.countDocuments({
      isVerified: true,
      isDeleted: false,
    });

    const blockedUsers = await User.countDocuments({
      isBlocked: true,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        loginLogsThisMonth,
        verifiedUsers,
        blockedUsers,
        usersByRole: usersByRole.map(r => ({
          role: r._id,
          count: r.count,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      code: 'ANALYTICS_ERROR',
    });
  }
};

// @desc Block/Unblock user
// @route PATCH /api/v1/admin/users/:userId/block
// @access Private (admin only)
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot block admin accounts',
        code: 'ADMIN_BLOCK_FORBIDDEN',
      });
    }

    user.isBlocked = isBlocked;
    user.blockReason = reason;
    await user.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      details: {
        targetUserId: userId,
        reason: reason,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      code: 'UPDATE_ERROR',
    });
  }
};
