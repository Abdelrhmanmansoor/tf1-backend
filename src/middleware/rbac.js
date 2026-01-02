const { ROLE_PERMISSIONS, ROLES } = require('../config/roles');

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - The required permission
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    
    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Get permissions for the user's role
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    // Get custom permissions assigned to the user
    const userCustomPermissions = req.user.permissions || [];

    // Check if user has the required permission
    if (rolePermissions.includes(permission) || userCustomPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Missing permission: ${permission}`,
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};

/**
 * Require a sports admin (or higher) role
 */
const requireSportsAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  const allowedRoles = [ROLES.ADMIN, ROLES.SPORTS_ADMINISTRATOR];
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Sports admin role required',
    code: 'INSUFFICIENT_PERMISSIONS'
  });
};

/**
 * Check team-scoped permissions (used by admin dashboards)
 */
const checkTeamPermission = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Admins and sports administrators bypass granular checks
    const privilegedRoles = [ROLES.ADMIN, ROLES.SPORTS_ADMINISTRATOR];
    if (privilegedRoles.includes(req.user.role)) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const rolePermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const combined = new Set([...userPermissions, ...rolePermissions]);

    const hasAny = permissions.some((perm) => combined.has(perm));
    if (hasAny) return next();

    return res.status(403).json({
      success: false,
      message: 'Access denied. Missing required permissions.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};

/**
 * Lightweight action logger middleware that attaches log metadata
 */
const logAction = (resource, action, description) => {
  return (req, _res, next) => {
    const message = typeof description === 'function' ? description(req) : description;
    req.auditLog = {
      resource,
      action,
      message,
      userId: req.user?._id?.toString() || null,
      timestamp: new Date()
    };
    next();
  };
};

/**
 * Middleware to check if user has ANY of the provided permissions
 * @param {string[]} permissions - Array of permissions to check
 */
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    const userCustomPermissions = req.user.permissions || [];
    const allUserPermissions = [...rolePermissions, ...userCustomPermissions];

    const hasPermission = permissions.some(p => allUserPermissions.includes(p));

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  requireSportsAdmin,
  checkTeamPermission,
  logAction
};
