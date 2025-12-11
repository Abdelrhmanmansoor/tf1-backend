const { AdministrativeTeam, AuditLog } = require('../models/admin');
const User = require('../modules/shared/models/User');

exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;

    const adminTeam = await AdministrativeTeam.findOne({
      'teamMembers.userId': user._id,
      'teamMembers.isActive': true
    }).populate('adminId', 'firstName lastName email');

    if (!adminTeam) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_TEAM_MEMBER',
          message: 'You are not a member of any team',
          messageAr: 'أنت لست عضواً في أي فريق',
          redirectTo: '/dashboard'
        }
      });
    }

    const teamMember = adminTeam.teamMembers.find(
      m => m.userId.toString() === user._id.toString() && m.isActive
    );

    if (!teamMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MEMBERSHIP_INACTIVE',
          message: 'Your team membership is inactive',
          messageAr: 'عضويتك في الفريق غير نشطة',
          redirectTo: '/dashboard'
        }
      });
    }

    const allowedModules = [...new Set(teamMember.permissions.map(p => p.module))];

    await AuditLog.log({
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      userType: 'team',
      action: 'view',
      module: 'dashboard',
      description: 'Team member accessed dashboard',
      descriptionAr: 'دخل عضو الفريق إلى لوحة التحكم',
      route: req.originalUrl,
      method: req.method,
      isSuccess: true,
      severity: 'info'
    });

    res.json({
      success: true,
      data: {
        member: {
          id: teamMember._id,
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accessKey: teamMember.accessKey,
          role: 'team',
          hasFullAccess: false
        },
        leader: {
          id: adminTeam.adminId._id,
          name: `${adminTeam.adminId.firstName} ${adminTeam.adminId.lastName}`,
          email: adminTeam.adminId.email
        },
        permissions: teamMember.permissions,
        allowedModules,
        navigation: generateNavigationForPermissions(teamMember.permissions)
      }
    });
  } catch (error) {
    console.error('Team dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error loading team dashboard',
        messageAr: 'خطأ في تحميل لوحة تحكم الفريق'
      }
    });
  }
};

exports.getMyPermissions = async (req, res) => {
  try {
    const user = req.user;

    const adminTeam = await AdministrativeTeam.findOne({
      'teamMembers.userId': user._id,
      'teamMembers.isActive': true
    });

    if (!adminTeam) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_TEAM_MEMBER',
          message: 'You are not a member of any team',
          messageAr: 'أنت لست عضواً في أي فريق',
          redirectTo: '/dashboard'
        }
      });
    }

    const teamMember = adminTeam.teamMembers.find(
      m => m.userId.toString() === user._id.toString() && m.isActive
    );

    res.json({
      success: true,
      data: {
        permissions: teamMember.permissions,
        allowedModules: [...new Set(teamMember.permissions.map(p => p.module))],
        navigation: generateNavigationForPermissions(teamMember.permissions)
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

exports.checkModuleAccess = async (req, res) => {
  try {
    const { module } = req.params;
    const user = req.user;

    if (user.role === 'admin') {
      return res.json({
        success: true,
        data: {
          hasAccess: true,
          module,
          actions: ['view', 'create', 'edit', 'delete', 'manage', 'export', 'import']
        }
      });
    }

    const adminTeam = await AdministrativeTeam.findOne({
      $or: [
        { adminId: user._id },
        { 'teamMembers.userId': user._id, 'teamMembers.isActive': true }
      ]
    });

    if (!adminTeam) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          module,
          reason: 'Not a team member',
          reasonAr: 'لست عضواً في أي فريق',
          redirectTo: '/dashboard'
        }
      });
    }

    if (adminTeam.adminId.toString() === user._id.toString()) {
      return res.json({
        success: true,
        data: {
          hasAccess: true,
          module,
          actions: ['view', 'create', 'edit', 'delete', 'manage', 'export', 'import']
        }
      });
    }

    const teamMember = adminTeam.teamMembers.find(
      m => m.userId.toString() === user._id.toString() && m.isActive
    );

    const modulePermission = teamMember.permissions.find(
      p => p.module.toLowerCase() === module.toLowerCase()
    );

    if (!modulePermission) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          module,
          reason: 'No permission for this module',
          reasonAr: 'لا توجد صلاحية لهذا القسم',
          redirectTo: '/team-dashboard'
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasAccess: true,
        module,
        actions: modulePermission.actions
      }
    });
  } catch (error) {
    console.error('Check module access error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECK_ERROR',
        message: 'Error checking module access',
        messageAr: 'خطأ في التحقق من الوصول'
      }
    });
  }
};

exports.getMyActivity = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;

    const [logs, total] = await Promise.all([
      AuditLog.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments({ userId: user._id })
    ]);

    res.json({
      success: true,
      data: {
        activity: logs.map(log => ({
          id: log._id,
          action: log.action,
          module: log.module,
          moduleAr: log.moduleAr,
          description: log.description,
          descriptionAr: log.descriptionAr,
          route: log.route,
          isSuccess: log.isSuccess,
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
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching activity',
        messageAr: 'خطأ في جلب النشاط'
      }
    });
  }
};

function generateNavigationForPermissions(permissions) {
  const navigation = [];
  const modules = [...new Set(permissions.map(p => p.module))];

  const moduleConfig = {
    dashboard: { name: 'Dashboard', nameAr: 'لوحة التحكم', icon: 'dashboard', path: '/team-dashboard' },
    users: { name: 'Users', nameAr: 'المستخدمين', icon: 'users', path: '/team-dashboard/users' },
    jobs: { name: 'Jobs', nameAr: 'الوظائف', icon: 'briefcase', path: '/team-dashboard/jobs' },
    matches: { name: 'Matches', nameAr: 'المباريات', icon: 'trophy', path: '/team-dashboard/matches' },
    content: { name: 'Content', nameAr: 'المحتوى', icon: 'file-text', path: '/team-dashboard/content' },
    categories: { name: 'Categories', nameAr: 'التصنيفات', icon: 'folder', path: '/team-dashboard/categories' },
    settings: { name: 'Settings', nameAr: 'الإعدادات', icon: 'settings', path: '/team-dashboard/settings' },
    reports: { name: 'Reports', nameAr: 'التقارير', icon: 'bar-chart', path: '/team-dashboard/reports' },
    notifications: { name: 'Notifications', nameAr: 'الإشعارات', icon: 'bell', path: '/team-dashboard/notifications' },
    logs: { name: 'Activity Logs', nameAr: 'سجلات النشاط', icon: 'activity', path: '/team-dashboard/logs' },
    'age-groups': { name: 'Age Groups', nameAr: 'الفئات العمرية', icon: 'users', path: '/team-dashboard/age-groups' }
  };

  modules.forEach(module => {
    const config = moduleConfig[module];
    if (config) {
      const perm = permissions.find(p => p.module === module);
      navigation.push({
        ...config,
        module,
        actions: perm ? perm.actions : []
      });
    }
  });

  return navigation;
}

exports.accessDeniedPage = async (req, res) => {
  res.json({
    success: false,
    error: {
      code: 'ACCESS_DENIED',
      message: 'You do not have permission to access this resource',
      messageAr: 'ليس لديك صلاحية للوصول إلى هذا المورد',
      redirectTo: '/team-dashboard',
      showReturnButton: true
    }
  });
};
