/**
 * Admin Dashboard Authentication Middleware
 * Development Version - No MongoDB Required
 */

const crypto = require('crypto');
const logger = require('../../../utils/logger') || console;

// Mock admin keys for development
const MOCK_ADMIN_KEYS = {
  'sk_admin_2a2097d2dbf949c50e3a5f2eaa231e81c4f5d2fb1128443165a6198201b758eb': {
    name: 'Test Admin Key',
    permissions: [
      'view_dashboard',
      'manage_posts',
      'manage_media',
      'manage_users',
      'view_logs',
      'manage_system_settings',
      'manage_backups',
      'manage_api_integrations',
      'delete_logs',
      'export_data'
    ],
    isActive: true,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }
};

// Get client IP
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

// Authenticate Admin Key
const authenticateAdminKey = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

    if (!adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Admin key required',
        error: 'NO_ADMIN_KEY'
      });
    }

    // Check if key exists in mock keys (development mode)
    const keyData = MOCK_ADMIN_KEYS[adminKey];

    if (!keyData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin key',
        error: 'INVALID_ADMIN_KEY'
      });
    }

    // Check if key is active
    if (!keyData.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin key is inactive',
        error: 'INACTIVE_KEY'
      });
    }

    // Check if key is expired
    if (new Date() > keyData.expiresAt) {
      return res.status(401).json({
        success: false,
        message: 'Admin key has expired',
        error: 'EXPIRED_KEY'
      });
    }

    // Attach admin info to request
    req.admin = {
      id: 'admin_dev_' + adminKey.substring(0, 8),
      keyPrefix: adminKey.substring(0, 8),
      permissions: keyData.permissions,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent']
    };

    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

// Check Permissions
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!req.admin.permissions || !req.admin.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
        error: 'PERMISSION_DENIED',
        requiredPermission
      });
    }

    next();
  };
};

module.exports = {
  authenticateAdminKey,
  checkPermission,
  getClientIP,
  MOCK_ADMIN_KEYS
};
