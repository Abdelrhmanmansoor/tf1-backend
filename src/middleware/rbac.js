const { ROLE_PERMISSIONS } = require('../config/roles');

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
  checkAnyPermission
};
