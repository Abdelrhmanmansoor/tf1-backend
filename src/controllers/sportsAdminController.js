const { AdministrativeTeam, AuditLog, Permission } = require('../models/admin');
const User = require('../modules/shared/models/User');
const crypto = require('crypto');

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;

    let adminTeam = await AdministrativeTeam.findOne({ adminId: user._id });

    if (!adminTeam) {
      adminTeam = await AdministrativeTeam.create({
        adminId: user._id,
        adminName: `${user.firstName} ${user.lastName}`,
        adminEmail: user.email,
        adminAccessKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
        teamMembers: [],
        isActive: true
      });
    }

    const [
      totalTeamMembers,
      activeMembers,
      recentLogs,
      pendingActions
    ] = await Promise.all([
      adminTeam.teamMembers.length,
      adminTeam.teamMembers.filter(m => m.isActive).length,
      AuditLog.find({ userType: { $in: ['sports-administrator', 'team'] }, userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      0
    ]);

    await AuditLog.log({
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      userType: 'sports-administrator',
      action: 'view',
      module: 'dashboard',
      description: 'Sports Administrator accessed dashboard',
      descriptionAr: 'دخل الإداري الرياضي إلى لوحة التحكم',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        administrator: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accessKey: adminTeam.adminAccessKey,
          role: 'sports-administrator'
        },
        stats: {
          totalTeamMembers,
          activeMembers,
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
        settings: adminTeam.settings
      }
    });
  } catch (error) {
    console.error('Sports Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error loading dashboard',
        messageAr: 'خطأ في تحميل لوحة التحكم'
      }
    });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const adminTeam = await AdministrativeTeam.findOne({ adminId: req.user._id })
      .populate('teamMembers.userId', 'firstName lastName email role avatar lastLogin');

    if (!adminTeam) {
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
        members: adminTeam.teamMembers.map(m => ({
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
        maxMembers: adminTeam.settings.maxTeamMembers,
        currentCount: adminTeam.teamMembers.length
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

    let adminTeam = await AdministrativeTeam.findOne({ adminId: req.user._id });

    if (!adminTeam) {
      adminTeam = await AdministrativeTeam.create({
        adminId: req.user._id,
        adminName: `${req.user.firstName} ${req.user.lastName}`,
        adminEmail: req.user.email,
        adminAccessKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
        teamMembers: [],
        isActive: true
      });
    }

    const existingMember = adminTeam.teamMembers.find(
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

    if (adminTeam.teamMembers.length >= adminTeam.settings.maxTeamMembers) {
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

    adminTeam.teamMembers.push({
      userId: userToAdd._id,
      name: `${userToAdd.firstName} ${userToAdd.lastName}`,
      email: userToAdd.email,
      accessKey,
      permissions,
      isActive: true,
      addedAt: new Date(),
      addedBy: req.user._id
    });

    await adminTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'sports-administrator',
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
          id: adminTeam.teamMembers[adminTeam.teamMembers.length - 1]._id,
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

    const adminTeam = await AdministrativeTeam.findOne({ adminId: req.user._id });

    if (!adminTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const member = adminTeam.teamMembers.id(memberId);

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

    await adminTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'sports-administrator',
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

    const adminTeam = await AdministrativeTeam.findOne({ adminId: req.user._id });

    if (!adminTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const member = adminTeam.teamMembers.id(memberId);

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

    await adminTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'sports-administrator',
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
    // Limited permissions for Sports Administrator - scoped only to their management
    const permissions = [
      { code: 'DASHBOARD_VIEW', name: 'View Dashboard', nameAr: 'عرض لوحة التحكم', module: 'dashboard', category: 'dashboard' },

      { code: 'TEAM_MANAGE', name: 'Manage Team', nameAr: 'إدارة الفريق', module: 'team', category: 'team' },

      { code: 'REPORTS_VIEW', name: 'View Reports', nameAr: 'عرض التقارير', module: 'reports', category: 'reports' },
      { code: 'REPORTS_EXPORT', name: 'Export Reports', nameAr: 'تصدير التقارير', module: 'reports', category: 'reports' },
    ];

    const categories = [
      { id: 'dashboard', name: 'Dashboard', nameAr: 'لوحة التحكم' },
      { id: 'team', name: 'Team', nameAr: 'الفريق' },
      { id: 'reports', name: 'Reports', nameAr: 'التقارير' }
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
    const { page = 1, limit = 50, action, module, startDate, endDate } = req.query;

    const query = {
      userId: req.user._id // STRICTLY SCOPED to this admin
    };

    if (action) query.action = action;
    if (module) query.module = module;

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

    const adminTeam = await AdministrativeTeam.findOne({ adminId: req.user._id });

    if (!adminTeam) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found',
          messageAr: 'الفريق غير موجود'
        }
      });
    }

    const previousSettings = { ...adminTeam.settings.toObject() };

    if (allowTeamInvites !== undefined) adminTeam.settings.allowTeamInvites = allowTeamInvites;
    if (requireAccessKey !== undefined) adminTeam.settings.requireAccessKey = requireAccessKey;
    if (sessionTimeout !== undefined) adminTeam.settings.sessionTimeout = sessionTimeout;
    if (maxTeamMembers !== undefined) adminTeam.settings.maxTeamMembers = maxTeamMembers;

    await adminTeam.save();

    await AuditLog.log({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      userType: 'sports-administrator',
      action: 'settings_changed',
      module: 'settings',
      description: 'Team settings updated',
      descriptionAr: 'تم تحديث إعدادات الفريق',
      previousValue: previousSettings,
      newValue: adminTeam.settings,
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        settings: adminTeam.settings
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
