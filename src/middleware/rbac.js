const { LeaderTeam, AuditLog } = require('../models/admin');

const rolePermissions = {
  player: [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'opportunities:apply',
    'messages:send',
    'messages:read',
  ],
  coach: [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'opportunities:create',
    'opportunities:update',
    'opportunities:delete',
    'players:view',
    'players:contact',
    'messages:send',
    'messages:read',
    'teams:manage',
  ],
  club: [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'opportunities:create',
    'opportunities:update',
    'opportunities:delete',
    'players:view',
    'players:contact',
    'coaches:view',
    'coaches:contact',
    'messages:send',
    'messages:read',
    'events:create',
    'events:manage',
    'teams:create',
    'teams:manage',
  ],
  specialist: [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'opportunities:create',
    'opportunities:update',
    'opportunities:delete',
    'players:view',
    'players:contact',
    'coaches:view',
    'coaches:contact',
    'messages:send',
    'messages:read',
    'services:create',
    'services:manage',
  ],
  admin: ['*'],
  'administrative-officer': [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'messages:send',
    'messages:read',
  ],
};

const hasPermission = (userRole, requiredPermission) => {
  const permissions = rolePermissions[userRole] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
};

const requirePermission = permission => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        messageAr: 'يجب تسجيل الدخول',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Permission '${permission}' required.`,
        messageAr: 'تم رفض الوصول. الصلاحية غير متوفرة.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission,
        userRole: req.user.role,
        redirectTo: '/dashboard',
      });
    }

    next();
  };
};

const requireAnyPermission = permissions => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        messageAr: 'يجب تسجيل الدخول',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const hasAnyPermission = permissions.some(permission =>
      hasPermission(req.user.role, permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. One of the following permissions required: ${permissions.join(', ')}`,
        messageAr: 'تم رفض الوصول. إحدى الصلاحيات التالية مطلوبة.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        userRole: req.user.role,
        redirectTo: '/dashboard',
      });
    }

    next();
  };
};

const requireAllPermissions = permissions => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        messageAr: 'يجب تسجيل الدخول',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const hasAllPermissions = permissions.every(permission =>
      hasPermission(req.user.role, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. All of the following permissions required: ${permissions.join(', ')}`,
        messageAr: 'تم رفض الوصول. جميع الصلاحيات التالية مطلوبة.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        userRole: req.user.role,
        redirectTo: '/dashboard',
      });
    }

    next();
  };
};

const getUserPermissions = userRole => {
  return rolePermissions[userRole] || [];
};

const getRoleHierarchy = () => {
  return {
    player: 1,
    coach: 2,
    specialist: 3,
    club: 4,
    'administrative-officer': 5,
    admin: 10,
  };
};

const requireMinimumRole = minimumRole => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        messageAr: 'يجب تسجيل الدخول',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const hierarchy = getRoleHierarchy();
    const userRoleLevel = hierarchy[req.user.role] || 0;
    const requiredRoleLevel = hierarchy[minimumRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role '${minimumRole}' required.`,
        messageAr: 'تم رفض الوصول. مستوى الدور غير كافٍ.',
        code: 'INSUFFICIENT_ROLE',
        requiredRole: minimumRole,
        userRole: req.user.role,
        redirectTo: '/dashboard',
      });
    }

    next();
  };
};

const checkTeamPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            messageAr: 'يجب تسجيل الدخول'
          }
        });
      }

      if (user.role === 'admin') {
        req.isLeader = true;
        req.hasFullAccess = true;
        return next();
      }

      const leaderTeam = await LeaderTeam.findOne({
        $or: [
          { leaderId: user._id },
          { 'teamMembers.userId': user._id }
        ]
      });

      if (!leaderTeam) {
        return next();
      }

      if (leaderTeam.leaderId.toString() === user._id.toString()) {
        req.isLeader = true;
        req.hasFullAccess = true;
        req.leaderTeam = leaderTeam;
        return next();
      }

      const teamMember = leaderTeam.teamMembers.find(
        m => m.userId.toString() === user._id.toString() && m.isActive
      );

      if (!teamMember) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Team membership inactive',
            messageAr: 'عضوية الفريق غير نشطة',
            redirectTo: '/dashboard'
          }
        });
      }

      req.isLeader = false;
      req.hasFullAccess = false;
      req.teamMember = teamMember;
      req.leaderTeam = leaderTeam;

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return next();
      }

      const userPermissions = teamMember.permissions.flatMap(p => 
        p.actions.map(a => `${p.module.toUpperCase()}_${a.toUpperCase()}`)
      );

      const hasPermissionCheck = requiredPermissions.some(rp => 
        userPermissions.includes(rp.toUpperCase())
      );

      if (!hasPermissionCheck) {
        await AuditLog.log({
          userId: user._id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          userType: 'team',
          action: 'access_denied',
          module: 'rbac',
          description: `Permission denied: ${requiredPermissions.join(', ')}`,
          descriptionAr: `تم رفض الصلاحية: ${requiredPermissions.join(', ')}`,
          route: req.originalUrl,
          method: req.method,
          isSuccess: false,
          severity: 'warning'
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to access this resource',
            messageAr: 'ليس لديك صلاحية للوصول إلى هذا المورد',
            redirectTo: '/team-dashboard',
            requiredPermissions
          }
        });
      }

      next();
    } catch (error) {
      console.error('Team RBAC middleware error:', error);
      next();
    }
  };
};

const requireLeader = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          messageAr: 'يجب تسجيل الدخول'
        }
      });
    }

    if (user.role === 'admin') {
      req.isLeader = true;
      req.hasFullAccess = true;
      return next();
    }

    const leaderTeam = await LeaderTeam.findOne({ leaderId: user._id });

    if (!leaderTeam) {
      await AuditLog.log({
        userId: user._id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        userType: 'team',
        action: 'access_denied',
        module: 'leader',
        description: 'Non-leader tried to access leader-only resource',
        descriptionAr: 'حاول مستخدم غير قائد الوصول إلى مورد خاص بالقادة',
        route: req.originalUrl,
        method: req.method,
        isSuccess: false,
        severity: 'warning'
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'LEADER_ONLY',
          message: 'This action is restricted to Leaders only',
          messageAr: 'هذا الإجراء مقتصر على القادة فقط',
          redirectTo: '/team-dashboard'
        }
      });
    }

    req.isLeader = true;
    req.hasFullAccess = true;
    req.leaderTeam = leaderTeam;
    next();
  } catch (error) {
    console.error('Leader check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECK_ERROR',
        message: 'Leader check failed',
        messageAr: 'فشل التحقق من القيادة'
      }
    });
  }
};

const logAction = (module, action, descriptionFn) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(body) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 400;

      const description = typeof descriptionFn === 'function' 
        ? descriptionFn(req, res, body) 
        : descriptionFn;

      AuditLog.log({
        userId: req.user?._id,
        userEmail: req.user?.email,
        userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Unknown',
        userRole: req.user?.role,
        userType: req.isLeader ? 'leader' : 'team',
        action,
        module,
        description,
        route: req.originalUrl,
        method: req.method,
        statusCode,
        responseTime,
        isSuccess,
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      }).catch(err => console.error('Audit log error:', err));

      return originalSend.call(this, body);
    };

    next();
  };
};

module.exports = {
  rolePermissions,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  getUserPermissions,
  getRoleHierarchy,
  requireMinimumRole,
  checkTeamPermission,
  requireLeader,
  logAction
};
