const jwt = require('jsonwebtoken');
const AdminKey = require('../models/AdminKey');
const AdminLog = require('../models/AdminLog');

// Extract client IP
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

// Log admin action
const logAdminAction = async (
  req,
  actionType,
  targetType,
  targetId = null,
  status = 'SUCCESS',
  changes = null,
  description = null,
  errorMessage = null
) => {
  try {
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Parse user agent
    const uaParser = require('ua-parser-js');
    const ua = new uaParser(userAgent);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();

    const logData = {
      adminId: req.admin?.id,
      actionType,
      targetType,
      targetId,
      description,
      changes,
      ipAddress,
      userAgent,
      status,
      errorMessage,
      metadata: {
        browser: browser.name ? `${browser.name} ${browser.version}` : 'Unknown',
        os: os.name ? `${os.name} ${os.version}` : 'Unknown',
        deviceType: device.type || 'desktop',
      },
    };

    const log = new AdminLog(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw, just log to console
  }
};

// Middleware to authenticate admin key
const authenticateAdminKey = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

    if (!adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Admin key required',
        error: 'NO_ADMIN_KEY',
      });
    }

    // Extract prefix from the admin key (first 8 chars)
    const prefix = adminKey.substring(0, 8);

    // Find the key record by prefix
    const keyRecord = await AdminKey.findByPrefix(prefix);

    if (!keyRecord) {
      // Log failed attempt
      await logAdminAction(
        req,
        'FAILED_LOGIN',
        'SYSTEM',
        null,
        'FAILED',
        null,
        'Invalid admin key prefix',
        'Admin key not found'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid admin key',
        error: 'INVALID_ADMIN_KEY',
      });
    }

    // Check if key is expired
    if (keyRecord.isExpired()) {
      await logAdminAction(
        req,
        'FAILED_LOGIN',
        'SYSTEM',
        null,
        'FAILED',
        null,
        'Expired admin key',
        'Admin key has expired'
      );

      return res.status(401).json({
        success: false,
        message: 'Admin key has expired',
        error: 'EXPIRED_KEY',
      });
    }

    // Check if key is active
    if (!keyRecord.isActive) {
      await logAdminAction(
        req,
        'FAILED_LOGIN',
        'SYSTEM',
        null,
        'FAILED',
        null,
        'Inactive admin key',
        'Admin key is inactive'
      );

      return res.status(401).json({
        success: false,
        message: 'Admin key is inactive',
        error: 'INACTIVE_KEY',
      });
    }

    // Verify the key
    if (!keyRecord.verifyKey(adminKey)) {
      await logAdminAction(
        req,
        'FAILED_LOGIN',
        'SYSTEM',
        null,
        'FAILED',
        null,
        'Invalid admin key',
        'Key verification failed'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid admin key',
        error: 'INVALID_KEY',
      });
    }

    // Check IP whitelist
    const clientIP = getClientIP(req);
    if (!keyRecord.isIPAllowed(clientIP)) {
      await logAdminAction(
        req,
        'FAILED_LOGIN',
        'SYSTEM',
        null,
        'FAILED',
        null,
        'IP not whitelisted',
        `IP ${clientIP} not in whitelist`
      );

      return res.status(403).json({
        success: false,
        message: 'IP address not whitelisted',
        error: 'IP_NOT_ALLOWED',
      });
    }

    // Update last used and usage count
    await keyRecord.updateLastUsed();

    // Attach key info to request
    req.adminKey = {
      keyName: keyRecord.keyName,
      permissions: keyRecord.permissions,
      usageCount: keyRecord.usageCount,
    };

    req.admin = {
      id: keyRecord.createdBy || keyRecord._id,
    };
    req.adminId = req.admin.id;

    // Log successful login
    await logAdminAction(
      req,
      'LOGIN',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'Admin panel accessed'
    );

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR',
    });
  }
};

// Middleware to check specific permission
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'UNAUTHORIZED',
      });
    }

    if (!req.adminKey.permissions.includes(permission)) {
      // Log permission denied
      logAdminAction(
        req,
        'PERMISSION_DENIED',
        'SYSTEM',
        null,
        'FAILED',
        null,
        `Permission denied: ${permission}`,
        `Attempted to access ${permission} without proper permission`
      ).catch(console.error);

      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}`,
        error: 'PERMISSION_DENIED',
      });
    }

    next();
  };
};

// Middleware to check CSRF token (for non-GET requests)
const checkCSRFToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      error: 'CSRF_TOKEN_MISSING',
    });
  }

  // Verify CSRF token (stored in session/request)
  if (csrfToken !== req.session?.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      error: 'INVALID_CSRF_TOKEN',
    });
  }

  next();
};

// Utility function to safely log admin action from controllers
const adminLog = {
  logAction: logAdminAction,
  getClientIP,
};

module.exports = {
  authenticateAdminKey,
  checkPermission,
  checkCSRFToken,
  adminLog,
  logAdminAction,
};
