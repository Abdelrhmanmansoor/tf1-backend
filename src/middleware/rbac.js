const rolePermissions = {
  player: [
    'profile:read',
    'profile:update',
    'opportunities:view',
    'opportunities:apply',
    'messages:send',
    'messages:read'
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
    'teams:manage'
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
    'teams:manage'
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
    'services:manage'
  ]
};

const hasPermission = (userRole, requiredPermission) => {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(requiredPermission);
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Permission '${permission}' required.`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. One of the following permissions required: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. All of the following permissions required: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: permissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

const getUserPermissions = (userRole) => {
  return rolePermissions[userRole] || [];
};

const getRoleHierarchy = () => {
  return {
    player: 1,
    coach: 2,
    specialist: 3,
    club: 4
  };
};

const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hierarchy = getRoleHierarchy();
    const userRoleLevel = hierarchy[req.user.role] || 0;
    const requiredRoleLevel = hierarchy[minimumRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role '${minimumRole}' required.`,
        code: 'INSUFFICIENT_ROLE',
        requiredRole: minimumRole,
        userRole: req.user.role
      });
    }

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
  requireMinimumRole
};