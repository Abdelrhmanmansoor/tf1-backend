const { LeaderTeam, AuditLog, Permission } = require('../models/admin');
const User = require('../modules/shared/models/User');
const crypto = require('crypto');

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    
    let leaderTeam = await LeaderTeam.findOne({ leaderId: user._id });
    
    if (!leaderTeam) {
      leaderTeam = await LeaderTeam.create({
        leaderId: user._id,
        leaderName: `${user.firstName} ${user.lastName}`,
        leaderEmail: user.email,
        leaderAccessKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
        teamMembers: [],
        isActive: true
      });
    }

    const [
      totalTeamMembers,
      activeMembers,
      recentLogs,
      totalUsers,
      pendingActions
    ] = await Promise.all([
      leaderTeam.teamMembers.length,
      leaderTeam.teamMembers.filter(m => m.isActive).length,
      AuditLog.find({ userType: { $in: ['leader', 'team'] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      User.countDocuments({ isActive: true }),
      0
    ]);

    await AuditLog.log({
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      userType: 'leader',
      action: 'view',
      module: 'dashboard',
      description: 'Leader accessed dashboard',
      descriptionAr: 'دخل القائد إلى لوحة التحكم',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        leader: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accessKey: leaderTeam.leaderAccessKey,
          role: 'leader',
          hasFullAccess: true
        },
        stats: {
          totalTeamMembers,
          activeMembers,
          totalUsers,
          pendingActions
        },
        recentActivity: recentLogs.map(log => ({
          id: log._id,
          action: log.action,
          module: log.module,
          moduleAr: log.moduleAr,
          description: log.description,
          descriptionAr: log.descriptionAr,
          userName: log.userName,
          userType: log.userType,
          createdAt: log.createdAt,
          isSuccess: log.isSuccess
        })),
        settings: leaderTeam.settings
      }
    });
  } catch (error) {
    console.error('Leader dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error loading leader dashboard',
        messageAr: 'خطأ في تحميل لوحة تحكم القائد'
      }
    });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const leaderTeam = await LeaderTeam.findOne({ leaderId: req.user._id })
      .populate('teamMembers.userId', 'firstName lastName email role avatar lastLogin');

    if (!leaderTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: {
        members: leaderTeam.teamMembers.map(m => ({
          id: m._id,
          userId: m.userId?._id,
          name: m.name || (m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : 'Unknown'),
          email: m.email || m.userId?.email,
          accessKey: m.accessKey,
          permissions: m.permissions,
          isActive: m.isActive,
          lastLogin: m.lastLogin || m.userId?.lastLogin,
          addedAt: m.addedAt
        })),
        maxMembers: leaderTeam.settings.maxTeamMembers,
        currentCount: leaderTeam.teamMembers.length
      }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching team members',
        messageAr: 'خطأ في جلب أعضاء الفريق'
      }
    });
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const { email, permissions = [] } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
          messageAr: 'البريد الإلكتروني مطلوب'
        }
      });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found with this email',
          messageAr: 'المستخدم غير موجود بهذا البريد الإلكتروني'
        }
      });
    }

    let leaderTeam = await LeaderTeam.findOne({ leaderId: req.user._id });

    if (!leaderTeam) {
      leaderTeam = await LeaderTeam.create({
        leaderId: req.user._id,
        leaderName: `${req.user.firstName} ${req.user.lastName}`,
        leaderEmail: req.user.email,
        leaderAccessKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
        teamMembers: [],
        isActive: true
      });
    }

    const existingMember = leaderTeam.teamMembers.find(
      m => m.userId.toString() === userToAdd._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MEMBER_EXISTS',
          message: 'User is already a team member',
          messageAr: 'المستخدم عضو بالفعل في الفريق'
        }
      });
    }

    if (leaderTeam.teamMembers.length >= leaderTeam.settings.maxTeamMembers) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MAX_MEMBERS_REACHED',
          message: 'Maximum team members limit reached',
          messageAr: 'تم الوصول إلى الحد الأقصى لأعضاء الفريق'
        }
      });
    }

    const accessKey = crypto.randomBytes(16).toString('hex').toUpperCase();

    leaderTeam.teamMembers.push({
      userId: userToAdd._id,
      name: `${userToAdd.firstName} ${userToAdd.lastName}`,
      email: userToAdd.email,
      accessKey,
      permissions,
      isActive: true,
      addedAt: new Date(),
      addedBy: req.user._id
    });

    await leaderTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'team_member_added',
      module: 'team',
      description: `Added team member: ${userToAdd.email}`,
      descriptionAr: `تمت إضافة عضو فريق: ${userToAdd.email}`,
      targetId: userToAdd._id,
      targetType: 'User',
      targetName: `${userToAdd.firstName} ${userToAdd.lastName}`,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.status(201).json({
      success: true,
      data: {
        member: {
          id: leaderTeam.teamMembers[leaderTeam.teamMembers.length - 1]._id,
          userId: userToAdd._id,
          name: `${userToAdd.firstName} ${userToAdd.lastName}`,
          email: userToAdd.email,
          accessKey,
          permissions,
          isActive: true
        }
      },
      message: 'Team member added successfully',
      messageAr: 'تمت إضافة عضو الفريق بنجاح'
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Error adding team member',
        messageAr: 'خطأ في إضافة عضو الفريق'
      }
    });
  }
};

exports.updateMemberPermissions = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { permissions } = req.body;

    const leaderTeam = await LeaderTeam.findOne({ leaderId: req.user._id });

    if (!leaderTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const member = leaderTeam.teamMembers.id(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Team member not found',
          messageAr: 'عضو الفريق غير موجود'
        }
      });
    }

    const previousPermissions = [...member.permissions];
    member.permissions = permissions;

    await leaderTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'permission_granted',
      module: 'team',
      description: `Updated permissions for: ${member.name}`,
      descriptionAr: `تم تحديث صلاحيات: ${member.name}`,
      targetId: member.userId,
      targetType: 'User',
      targetName: member.name,
      previousValue: previousPermissions,
      newValue: permissions,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        member: {
          id: member._id,
          name: member.name,
          permissions: member.permissions
        }
      },
      message: 'Permissions updated successfully',
      messageAr: 'تم تحديث الصلاحيات بنجاح'
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error updating permissions',
        messageAr: 'خطأ في تحديث الصلاحيات'
      }
    });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const leaderTeam = await LeaderTeam.findOne({ leaderId: req.user._id });

    if (!leaderTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const member = leaderTeam.teamMembers.id(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Team member not found',
          messageAr: 'عضو الفريق غير موجود'
        }
      });
    }

    const memberName = member.name;
    const memberEmail = member.email;

    member.isActive = false;

    await leaderTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'team_member_removed',
      module: 'team',
      description: `Removed team member: ${memberEmail}`,
      descriptionAr: `تمت إزالة عضو الفريق: ${memberEmail}`,
      targetId: member.userId,
      targetType: 'User',
      targetName: memberName,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      message: 'Team member removed successfully',
      messageAr: 'تمت إزالة عضو الفريق بنجاح'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_ERROR',
        message: 'Error removing team member',
        messageAr: 'خطأ في إزالة عضو الفريق'
      }
    });
  }
};

exports.getAvailablePermissions = async (req, res) => {
  try {
    const permissions = [
      { code: 'DASHBOARD_VIEW', name: 'View Dashboard', nameAr: 'عرض لوحة التحكم', module: 'dashboard', category: 'dashboard' },
      { code: 'DASHBOARD_ANALYTICS', name: 'View Analytics', nameAr: 'عرض التحليلات', module: 'dashboard', category: 'dashboard' },
      
      { code: 'USERS_VIEW', name: 'View Users', nameAr: 'عرض المستخدمين', module: 'users', category: 'users' },
      { code: 'USERS_CREATE', name: 'Create Users', nameAr: 'إنشاء مستخدمين', module: 'users', category: 'users' },
      { code: 'USERS_EDIT', name: 'Edit Users', nameAr: 'تعديل المستخدمين', module: 'users', category: 'users' },
      { code: 'USERS_DELETE', name: 'Delete Users', nameAr: 'حذف المستخدمين', module: 'users', category: 'users' },
      { code: 'USERS_BLOCK', name: 'Block Users', nameAr: 'حظر المستخدمين', module: 'users', category: 'users' },
      
      { code: 'JOBS_VIEW', name: 'View Jobs', nameAr: 'عرض الوظائف', module: 'jobs', category: 'jobs' },
      { code: 'JOBS_CREATE', name: 'Create Jobs', nameAr: 'إنشاء وظائف', module: 'jobs', category: 'jobs' },
      { code: 'JOBS_EDIT', name: 'Edit Jobs', nameAr: 'تعديل الوظائف', module: 'jobs', category: 'jobs' },
      { code: 'JOBS_DELETE', name: 'Delete Jobs', nameAr: 'حذف الوظائف', module: 'jobs', category: 'jobs' },
      { code: 'JOBS_APPLICATIONS', name: 'Manage Applications', nameAr: 'إدارة الطلبات', module: 'jobs', category: 'jobs' },
      
      { code: 'MATCHES_VIEW', name: 'View Matches', nameAr: 'عرض المباريات', module: 'matches', category: 'matches' },
      { code: 'MATCHES_CREATE', name: 'Create Matches', nameAr: 'إنشاء مباريات', module: 'matches', category: 'matches' },
      { code: 'MATCHES_EDIT', name: 'Edit Matches', nameAr: 'تعديل المباريات', module: 'matches', category: 'matches' },
      { code: 'MATCHES_DELETE', name: 'Delete Matches', nameAr: 'حذف المباريات', module: 'matches', category: 'matches' },
      
      { code: 'CONTENT_VIEW', name: 'View Content', nameAr: 'عرض المحتوى', module: 'content', category: 'content' },
      { code: 'CONTENT_CREATE', name: 'Create Content', nameAr: 'إنشاء محتوى', module: 'content', category: 'content' },
      { code: 'CONTENT_EDIT', name: 'Edit Content', nameAr: 'تعديل المحتوى', module: 'content', category: 'content' },
      { code: 'CONTENT_DELETE', name: 'Delete Content', nameAr: 'حذف المحتوى', module: 'content', category: 'content' },
      { code: 'CONTENT_PUBLISH', name: 'Publish Content', nameAr: 'نشر المحتوى', module: 'content', category: 'content' },
      
      { code: 'CATEGORIES_VIEW', name: 'View Categories', nameAr: 'عرض التصنيفات', module: 'categories', category: 'content' },
      { code: 'CATEGORIES_MANAGE', name: 'Manage Categories', nameAr: 'إدارة التصنيفات', module: 'categories', category: 'content' },
      
      { code: 'SETTINGS_VIEW', name: 'View Settings', nameAr: 'عرض الإعدادات', module: 'settings', category: 'settings' },
      { code: 'SETTINGS_EDIT', name: 'Edit Settings', nameAr: 'تعديل الإعدادات', module: 'settings', category: 'settings' },
      
      { code: 'REPORTS_VIEW', name: 'View Reports', nameAr: 'عرض التقارير', module: 'reports', category: 'reports' },
      { code: 'REPORTS_EXPORT', name: 'Export Reports', nameAr: 'تصدير التقارير', module: 'reports', category: 'reports' },
      
      { code: 'NOTIFICATIONS_VIEW', name: 'View Notifications', nameAr: 'عرض الإشعارات', module: 'notifications', category: 'system' },
      { code: 'NOTIFICATIONS_SEND', name: 'Send Notifications', nameAr: 'إرسال إشعارات', module: 'notifications', category: 'system' },
      
      { code: 'LOGS_VIEW', name: 'View Logs', nameAr: 'عرض السجلات', module: 'logs', category: 'system' },
      { code: 'LOGS_EXPORT', name: 'Export Logs', nameAr: 'تصدير السجلات', module: 'logs', category: 'system' },
      
      { code: 'AGE_GROUPS_VIEW', name: 'View Age Groups', nameAr: 'عرض الفئات العمرية', module: 'age-groups', category: 'content' },
      { code: 'AGE_GROUPS_MANAGE', name: 'Manage Age Groups', nameAr: 'إدارة الفئات العمرية', module: 'age-groups', category: 'content' }
    ];

    const categories = [
      { id: 'dashboard', name: 'Dashboard', nameAr: 'لوحة التحكم' },
      { id: 'users', name: 'Users', nameAr: 'المستخدمين' },
      { id: 'jobs', name: 'Jobs', nameAr: 'الوظائف' },
      { id: 'matches', name: 'Matches', nameAr: 'المباريات' },
      { id: 'content', name: 'Content', nameAr: 'المحتوى' },
      { id: 'settings', name: 'Settings', nameAr: 'الإعدادات' },
      { id: 'reports', name: 'Reports', nameAr: 'التقارير' },
      { id: 'system', name: 'System', nameAr: 'النظام' }
    ];

    res.json({
      success: true,
      data: {
        permissions,
        categories
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching permissions',
        messageAr: 'خطأ في جلب الصلاحيات'
      }
    });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, module, userId, startDate, endDate } = req.query;

    const query = {};

    if (action) query.action = action;
    if (module) query.module = module;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log._id,
          action: log.action,
          module: log.module,
          moduleAr: log.moduleAr,
          description: log.description,
          descriptionAr: log.descriptionAr,
          userName: log.userName,
          userEmail: log.userEmail,
          userRole: log.userRole,
          userType: log.userType,
          route: log.route,
          method: log.method,
          statusCode: log.statusCode,
          isSuccess: log.isSuccess,
          severity: log.severity,
          metadata: log.metadata,
          createdAt: log.createdAt
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
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching audit logs',
        messageAr: 'خطأ في جلب سجلات التدقيق'
      }
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { allowTeamInvites, requireAccessKey, sessionTimeout, maxTeamMembers } = req.body;

    const leaderTeam = await LeaderTeam.findOne({ leaderId: req.user._id });

    if (!leaderTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const previousSettings = { ...leaderTeam.settings.toObject() };

    if (allowTeamInvites !== undefined) leaderTeam.settings.allowTeamInvites = allowTeamInvites;
    if (requireAccessKey !== undefined) leaderTeam.settings.requireAccessKey = requireAccessKey;
    if (sessionTimeout !== undefined) leaderTeam.settings.sessionTimeout = sessionTimeout;
    if (maxTeamMembers !== undefined) leaderTeam.settings.maxTeamMembers = maxTeamMembers;

    await leaderTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'leader',
      action: 'settings_changed',
      module: 'settings',
      description: 'Team settings updated',
      descriptionAr: 'تم تحديث إعدادات الفريق',
      previousValue: previousSettings,
      newValue: leaderTeam.settings,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        settings: leaderTeam.settings
      },
      message: 'Settings updated successfully',
      messageAr: 'تم تحديث الإعدادات بنجاح'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Error updating settings',
        messageAr: 'خطأ في تحديث الإعدادات'
      }
    });
  }
};
