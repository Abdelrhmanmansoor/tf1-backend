/**
 * Banking-Level Security Middleware for Admin Panel
 * Implements all security best practices
 */

const rateLimit = require('express-rate-limit');
const { getClientIP } = require('./adminAuth');
const logger = require('../../../utils/logger');

// ==================== RATE LIMITING ====================

// Brute Force Protection - Login attempts
exports.bruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = getClientIP(req);
    logger.warn(`Brute force attempt detected from IP: ${ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Account temporarily locked.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// API Rate Limiting - General admin endpoints
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Rate Limiting - Sensitive operations
exports.strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for sensitive operations
  message: {
    success: false,
    message: 'Too many sensitive operations. Please wait.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== IP WHITELISTING ====================

const ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
const ENABLE_IP_WHITELIST = process.env.ENABLE_IP_WHITELIST === 'true';

exports.checkIPWhitelist = (req, res, next) => {
  if (!ENABLE_IP_WHITELIST || ALLOWED_IPS.length === 0) {
    return next(); // IP whitelist disabled
  }

  const clientIP = getClientIP(req);
  
  // Check if IP is whitelisted
  const isAllowed = ALLOWED_IPS.some((allowedIP) => {
    // Support CIDR notation (e.g., 192.168.1.0/24)
    if (allowedIP.includes('/')) {
      const [network, prefixLength] = allowedIP.split('/');
      return isIPInCIDR(clientIP, network, parseInt(prefixLength));
    }
    return clientIP === allowedIP || clientIP === '127.0.0.1' || clientIP === '::1';
  });

  if (!isAllowed) {
    logger.warn(`Blocked admin panel access from non-whitelisted IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Your IP address is not whitelisted.',
      error: 'IP_NOT_WHITELISTED',
    });
  }

  next();
};

// Helper function to check if IP is in CIDR range
function isIPInCIDR(ip, network, prefixLength) {
  const ipToNumber = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  const mask = ~(2 ** (32 - prefixLength) - 1);

  return (ipNum & mask) === (networkNum & mask);
}

// ==================== SECURITY HEADERS ====================

exports.securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  // Strict-Transport-Security (HSTS) - Only in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// ==================== INPUT VALIDATION ====================

exports.validateInput = (req, res, next) => {
  // Prevent NoSQL Injection
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove MongoDB operators
      if (key.startsWith('$')) {
        logger.warn(`Blocked MongoDB operator in input: ${key}`);
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// ==================== SESSION SECURITY ====================

exports.sessionSecurity = (req, res, next) => {
  // Set secure cookie flags
  res.cookie('admin_session', req.headers['x-admin-key']?.substring(0, 8) || 'none', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  next();
};

// ==================== AUDIT LOGGING ====================

exports.auditLog = (action, details = {}) => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      action,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      ...details,
    };

    logger.info('ADMIN_AUDIT', logData);

    // Store in response for later use
    res.locals.auditLog = logData;

    next();
  };
};

// ==================== CSRF PROTECTION ====================

const crypto = require('crypto');

// Generate CSRF token
exports.generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Verify CSRF token
exports.verifyCSRF = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      error: 'CSRF_TOKEN_INVALID',
    });
  }

  next();
};

module.exports = exports;

