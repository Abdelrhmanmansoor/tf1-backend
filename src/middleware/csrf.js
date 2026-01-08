/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * 
 * Implementation:
 * 1. Generate CSRF token for GET requests
 * 2. Validate CSRF token on POST/PUT/DELETE/PATCH requests
 * 3. Store token in secure cookie and return in response headers
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Store CSRF tokens in memory (in production, use Redis or database)
// Token format: { token: 'value', createdAt: timestamp, used: false }
const csrfTokenStore = new Map();

// Clean up expired tokens every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [token, data] of csrfTokenStore.entries()) {
    if (data.createdAt < oneHourAgo) {
      csrfTokenStore.delete(token);
    }
  }
  logger.debug('CSRF token store cleaned', { tokensRemaining: csrfTokenStore.size });
}, 60 * 60 * 1000);

/**
 * Generate a new CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate CSRF token and send to client
 * Called on every page load or GET request
 */
const csrf = (req, res, next) => {
  // Generate new token for this request
  const token = generateCSRFToken();
  
  // Store token with metadata
  csrfTokenStore.set(token, {
    createdAt: Date.now(),
    used: false,
    userId: req.user?._id || null,
    ip: req.ip
  });

  // Store token in secure httpOnly cookie
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Allow JavaScript to read for form submission
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 3600000, // 1 hour
    path: '/'
  });

  // Also send token in response header
  res.set('X-CSRF-Token', token);
  
  // Make token available to views/templates
  res.locals.csrfToken = token;
  req.csrfToken = token;

  next();
};

/**
 * Verify CSRF token on state-changing requests
 */
const verifyCsrf = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check for matches routes - they use JWT tokens (httpOnly cookies)
  // JWT-based authentication is CSRF-resistant by design
  if (req.path && (req.path.startsWith('/matches') || req.path.includes('/matches/'))) {
    return next();
  }

  // Skip if explicitly marked to skip CSRF (for routes that handle it differently)
  if (req.skipCSRF) {
    return next();
  }

  // Get token from multiple sources (in priority order)
  const token = 
    req.headers['x-csrf-token'] || 
    req.headers['x-xsrf-token'] ||
    req.body?._csrf ||
    req.body?.csrfToken ||
    req.cookies?.['XSRF-TOKEN'];

  if (!token) {
    logger.warn('CSRF token missing', {
      method: req.method,
      path: req.path,
      userId: req.user?._id,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      messageAr: 'رمز CSRF مفقود',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Verify token exists in store and is valid
  const tokenData = csrfTokenStore.get(token);

  if (!tokenData) {
    logger.warn('CSRF token invalid or expired', {
      method: req.method,
      path: req.path,
      userId: req.user?._id,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      message: 'Invalid or expired CSRF token',
      messageAr: 'رمز CSRF غير صحيح أو منتهي الصلاحية',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Check if token has already been used (prevent replay attacks)
  if (tokenData.used) {
    logger.warn('CSRF token reuse attempt', {
      method: req.method,
      path: req.path,
      userId: req.user?._id,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF token already used',
      messageAr: 'تم استخدام رمز CSRF بالفعل',
      code: 'CSRF_TOKEN_REUSED'
    });
  }

  // Mark token as used
  tokenData.used = true;

  // Generate new token for next request
  const newToken = generateCSRFToken();
  csrfTokenStore.set(newToken, {
    createdAt: Date.now(),
    used: false,
    userId: req.user?._id || null,
    ip: req.ip
  });

  // Set new token in response
  res.cookie('XSRF-TOKEN', newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 3600000,
    path: '/'
  });

  res.set('X-CSRF-Token', newToken);

  logger.debug('CSRF token verified successfully', {
    userId: req.user?._id,
    method: req.method,
    path: req.path
  });

  next();
};

/**
 * Get CSRF token endpoint
 * Clients can call this to get a fresh CSRF token
 */
const getCSRFToken = (req, res) => {
  const token = generateCSRFToken();
  
  csrfTokenStore.set(token, {
    createdAt: Date.now(),
    used: false,
    userId: req.user?._id || null,
    ip: req.ip
  });

  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 3600000,
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'CSRF token generated',
    data: {
      token: token,
      csrfToken: token  // Alternative format for compatibility
    },
    token: token  // Also at root level for compatibility
  });
};

/**
 * Clear CSRF tokens for a user (e.g., on logout)
 */
const clearUserCSRFTokens = (userId) => {
  for (const [token, data] of csrfTokenStore.entries()) {
    if (data.userId === userId) {
      csrfTokenStore.delete(token);
    }
  }
};

module.exports = {
  csrf,
  verifyCsrf,
  getCSRFToken,
  generateCSRFToken,
  clearUserCSRFTokens
};
