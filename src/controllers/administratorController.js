const User = require('../modules/shared/models/User');
const { Alert } = require('../models/admin');
const Setting = require('../models/Setting');
const ActivityLog = require('../models/ActivityLog');

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalClubs,
      totalCoaches,
      totalPlayers,
      recentRegistrations,
      systemAlerts
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
      User.countDocuments({ isVerified: false, isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'club', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'coach', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'player', isDeleted: { $ne: true } }),
      User.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true }
      }),
      Alert.countDocuments({ resolved: false, isDeleted: { $ne: true } })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          pendingApprovals,
          totalClubs,
          totalCoaches,
          totalPlayers,
          recentRegistrations,
          systemAlerts
        }
      }
    });
  } catch (error) {
    console.error('Administrator dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error fetching dashboard data',
        messageAr: 'خطأ في جلب بيانات لوحة التحكم'
      }
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isDeleted: { $ne: true } };

    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'blocked') query.isBlocked = true;
    if (status === 'pending') query.isVerified = false;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('email firstName lastName role isActive isBlocked isVerified createdAt lastLogin')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u._id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          status: u.isBlocked ? 'blocked' : (u.isVerified ? 'active' : 'pending'),
          createdAt: u.createdAt,
          lastActive: u.lastLogin
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USERS_ERROR',
        message: 'Error fetching users',
        messageAr: 'خطأ في جلب المستخدمين'
      }
    });
  }
};

exports.getApprovals = async (req, res) => {
  try {
    const approvals = await User.find({
      isVerified: false,
      isDeleted: { $ne: true }
    })
      .select('email firstName lastName role createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        approvals: approvals.map(u => ({
          id: u._id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A',
          email: u.email,
          role: u.role,
          date: u.createdAt,
          status: 'pending'
        }))
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_APPROVALS_ERROR',
        message: 'Error fetching approvals',
        messageAr: 'خطأ في جلب طلبات الموافقة'
      }
    });
  }
};

exports.handleApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be approve or reject',
          messageAr: 'يجب أن يكون الإجراء موافقة أو رفض'
        }
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          messageAr: 'المستخدم غير موجود'
        }
      });
    }

    if (action === 'approve') {
      user.isVerified = true;
      user.isActive = true;
    } else {
      user.isActive = false;
      user.blockReason = reason || 'Registration rejected';
    }

    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: action === 'approve' ? 'USER_APPROVED' : 'USER_REJECTED',
      targetUserId: user._id,
      details: { reason }
    });

    res.json({
      success: true,
      message: action === 'approve' ? 'User approved successfully' : 'User rejected',
      messageAr: action === 'approve' ? 'تمت الموافقة على المستخدم' : 'تم رفض المستخدم'
    });
  } catch (error) {
    console.error('Handle approval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVAL_ERROR',
        message: 'Error processing approval',
        messageAr: 'خطأ في معالجة الطلب'
      }
    });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          messageAr: 'المستخدم غير موجود'
        }
      });
    }

    user.isBlocked = blocked;
    if (blocked) {
      user.blockReason = reason;
      user.blockedAt = new Date();
    } else {
      user.blockReason = undefined;
      user.blockedAt = undefined;
    }

    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      targetUserId: user._id,
      details: { reason }
    });

    res.json({
      success: true,
      message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
      messageAr: blocked ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCK_ERROR',
        message: 'Error blocking/unblocking user',
        messageAr: 'خطأ في حظر/إلغاء حظر المستخدم'
      }
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      resolved: false,
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        alerts: alerts.map(a => ({
          id: a._id,
          type: a.type,
          message: a.message,
          messageAr: a.messageAr,
          date: a.createdAt,
          resolved: a.resolved,
          priority: a.priority
        }))
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ALERTS_ERROR',
        message: 'Error fetching alerts',
        messageAr: 'خطأ في جلب التنبيهات'
      }
    });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const alert = await Alert.findByIdAndUpdate(id, {
      resolved: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      resolution
    }, { new: true });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: 'Alert not found',
          messageAr: 'التنبيه غير موجود'
        }
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      messageAr: 'تم حل التنبيه بنجاح'
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESOLVE_ALERT_ERROR',
        message: 'Error resolving alert',
        messageAr: 'خطأ في حل التنبيه'
      }
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        siteName: 'TF1',
        siteNameAr: 'تي اف ون',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_SETTINGS_ERROR',
        message: 'Error fetching settings',
        messageAr: 'خطأ في جلب الإعدادات'
      }
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    Object.assign(settings, updates);
    await settings.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'SETTINGS_UPDATED',
      details: updates
    });

    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
      messageAr: 'تم تحديث الإعدادات بنجاح'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_SETTINGS_ERROR',
        message: 'Error updating settings',
        messageAr: 'خطأ في تحديث الإعدادات'
      }
    });
  }
};
