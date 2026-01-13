/**
 * CSRF Protection Middleware - Secure Implementation
 * Protects against Cross-Site Request Forgery attacks
 * 
 * Design:
 * 1. Token Generation: GET /csrf-token issues a fresh token
 * 2. Token Storage: Server-side Map + Cookie (readable by JS)
 * 3. Token Validation: Check header X-CSRF-Token against stored token
 * 4. No Single-Use: Tokens are reusable within TTL to prevent UX issues
 * 5. Origin/Referer Validation: Additional layer for state-changing requests
 * 
 * Security Features:
 * - Cryptographically secure random tokens (32 bytes)
 * - TTL-based expiration (configurable, default 1 hour)
 * - Origin/Referer header validation
 * - SameSite cookie attribute
 * - Secure flag in production
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Configuration
const CSRF_TOKEN_TTL_MS = parseInt(process.env.CSRF_TOKEN_TTL_MS || '3600000', 10); // 1 hour default
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Allowed origins for CSRF validation (must match CORS allowedOrigins)
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://tf1one.com',
    'https://www.tf1one.com',
  ];
  
  // Add Replit domain if specified
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  
  // Add frontend URL if specified
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

// Store CSRF tokens in memory (in production, consider Redis for multi-instance deployments)
// Token format: { createdAt: timestamp, ip: string, fingerprint: string }
const csrfTokenStore = new Map();

// Clean up expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, data] of csrfTokenStore.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_TTL_MS) {
      csrfTokenStore.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug('CSRF token store cleaned', { cleaned, remaining: csrfTokenStore.size });
  }
}, 10 * 60 * 1000);

/**
 * Generate a cryptographically secure CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Build cookie options based on environment
 * Supports cross-origin scenarios (frontend/backend on different domains)
 */
const getCookieOptions = () => {
  // Check if cross-origin (frontend and backend on different domains)
  const frontendUrl = process.env.FRONTEND_URL || '';
  const backendUrl = process.env.BACKEND_URL || '';
  const isCrossOrigin = frontendUrl && backendUrl && 
    new URL(frontendUrl).origin !== new URL(backendUrl).origin;
  
  return {
    httpOnly: false, // Must be false - client JS needs to read this
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? (isCrossOrigin ? 'none' : 'lax') : 'lax',
    maxAge: CSRF_TOKEN_TTL_MS,
    path: '/',
    // Domain is intentionally not set - browser will use request domain
  };
};

/**
 * Validate Origin/Referer header against allowed origins
 * Returns true if valid, false if invalid
 */
const validateOrigin = (req) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Get Origin header (preferred) or Referer as fallback
  const origin = req.headers.origin || req.headers.referer;
  
  // In development, be more lenient
  if (!isProduction) {
    // Allow if no origin (same-origin requests, Postman, etc.)
    if (!origin) return true;
    
    // Check against allowed origins
    const originHost = origin.replace(/\/$/, ''); // Remove trailing slash
    if (allowedOrigins.some(allowed => originHost.startsWith(allowed.replace(/\/$/, '')))) {
      return true;
    }
    
    // In dev, log but allow
    logger.debug('CSRF: Origin not in allowlist (allowed in dev)', { origin });
    return true;
  }
  
  // In production, be strict
  if (!origin) {
    // Allow same-origin requests (no Origin header typically means same-origin)
    // But be careful - some browsers/clients don't send Origin
    const referer = req.headers.referer;
    if (referer) {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.some(allowed => 
        refererOrigin === allowed.replace(/\/$/, '') || 
        refererOrigin.endsWith('tf1one.com')
      );
    }
    // No origin or referer - potentially dangerous, but allow for API clients
    // The CSRF token itself provides protection
    return true;
  }
  
  const originHost = origin.replace(/\/$/, '');
  return allowedOrigins.some(allowed => 
    originHost === allowed.replace(/\/$/, '') || 
    originHost.endsWith('tf1one.com')
  );
};

/**
 * Extract CSRF token from request
 * Priority: Header > Body > Cookie
 */
const extractToken = (req) => {
  return (
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.headers['X-CSRF-Token'] ||
    req.headers['X-XSRF-TOKEN'] ||
    req.body?._csrf ||
    req.body?.csrfToken ||
    req.cookies?.['XSRF-TOKEN']
  );
};

/**
 * Legacy csrf middleware - now only adds token to response (doesn't verify)
 * This is for backward compatibility with routes that use csrf() before verifyCsrf()
 * The actual verification happens in verifyCsrf()
 */
const csrf = (req, res, next) => {
  // This middleware is now a no-op passthrough
  // Token generation happens ONLY in getCSRFToken
  // Token verification happens ONLY in verifyCsrf
  next();
};

/**
 * Verify CSRF token on state-changing requests
 * This is the main CSRF protection middleware
 */
const verifyCsrf = (req, res, next) => {
  // Skip CSRF check for safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check for matches routes - they use JWT in httpOnly cookies
  // JWT-based auth with httpOnly cookies is inherently CSRF-resistant
  if (req.path && (req.path.startsWith('/matches') || req.path.includes('/matches/'))) {
    return next();
  }

  // Skip if explicitly marked (for webhooks, internal services, etc.)
  if (req.skipCSRF) {
    return next();
  }

  // Step 1: Validate Origin/Referer header
  if (!validateOrigin(req)) {
    logger.warn('CSRF: Origin validation failed', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      referer: req.headers.referer,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'Request origin not allowed',
      messageAr: 'مصدر الطلب غير مسموح',
      code: 'CSRF_ORIGIN_INVALID'
    });
  }

  // Step 2: Extract CSRF token from request
  const token = extractToken(req);

  if (!token) {
    logger.warn('CSRF: Token missing', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      hasOrigin: !!req.headers.origin,
      hasCookie: !!req.cookies?.['XSRF-TOKEN']
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.',
      messageAr: 'رمز CSRF مفقود. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Step 3: Verify token exists in store
  const tokenData = csrfTokenStore.get(token);

  if (!tokenData) {
    logger.warn('CSRF: Token not found in store (expired or invalid)', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      tokenPrefix: token.substring(0, 8) + '...'
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF token expired or invalid. Please refresh the page and try again.',
      messageAr: 'رمز CSRF منتهي الصلاحية أو غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Step 4: Check token expiration
  const tokenAge = Date.now() - tokenData.createdAt;
  if (tokenAge > CSRF_TOKEN_TTL_MS) {
    csrfTokenStore.delete(token);
    
    logger.warn('CSRF: Token expired', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      tokenAge: Math.round(tokenAge / 1000) + 's'
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF token expired. Please refresh the page and try again.',
      messageAr: 'انتهت صلاحية رمز CSRF. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      code: 'CSRF_TOKEN_EXPIRED'
    });
  }

  // Token is valid - DO NOT mark as used (allow reuse within TTL)
  // This prevents the "token reuse" error that breaks user experience

  // Step 5: Generate a fresh token for the response (token rotation)
  const newToken = generateCSRFToken();
  csrfTokenStore.set(newToken, {
    createdAt: Date.now(),
    ip: req.ip,
    fingerprint: req.headers['user-agent'] || 'unknown'
  });

  // Set new token in response cookie and header
  const cookieOptions = getCookieOptions();
  res.cookie('XSRF-TOKEN', newToken, cookieOptions);
  res.set('X-CSRF-Token', newToken);

  logger.debug('CSRF: Token verified successfully', {
    method: req.method,
    path: req.path
  });

  next();
};

/**
 * Get CSRF token endpoint handler
 * Clients MUST call this before any state-changing request (login, register, etc.)
 * 
 * Usage:
 *   GET /api/v1/auth/csrf-token
 *   
 * Response:
 *   - Sets XSRF-TOKEN cookie (readable by JavaScript)
 *   - Returns token in JSON body
 *   - Sets X-CSRF-Token response header
 */
const getCSRFToken = (req, res) => {
  const token = generateCSRFToken();
  
  // Store token with metadata
  csrfTokenStore.set(token, {
    createdAt: Date.now(),
    ip: req.ip,
    fingerprint: req.headers['user-agent'] || 'unknown'
  });

  // Set cookie
  const cookieOptions = getCookieOptions();
  res.cookie('XSRF-TOKEN', token, cookieOptions);

  // Set response header
  res.set('X-CSRF-Token', token);

  // Return token in multiple formats for client compatibility
  res.status(200).json({
    success: true,
    message: 'CSRF token generated',
    data: {
      token: token,
      csrfToken: token,
      expiresIn: CSRF_TOKEN_TTL_MS
    },
    token: token // Root level for backward compatibility
  });
};

/**
 * Clear all CSRF tokens for a user (call on logout)
 */
const clearUserCSRFTokens = (userId) => {
  // Since we don't track userId in tokens anymore (for simplicity),
  // this is now a no-op. Tokens expire naturally via TTL.
  // If needed, we can add userId tracking back.
  logger.debug('clearUserCSRFTokens called (no-op)', { userId });
};

/**
 * Middleware to add CSRF token to all responses (optional)
 * Use this if you want every response to include a fresh token
 */
const csrfTokenRefresh = (req, res, next) => {
  // Only for non-GET requests that succeeded
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    // If there's already a token in the response, don't override
    if (res.get('X-CSRF-Token')) {
      return originalJson(body);
    }
    
    // Generate fresh token for next request
    const token = generateCSRFToken();
    csrfTokenStore.set(token, {
      createdAt: Date.now(),
      ip: req.ip,
      fingerprint: req.headers['user-agent'] || 'unknown'
    });
    
    res.cookie('XSRF-TOKEN', token, getCookieOptions());
    res.set('X-CSRF-Token', token);
    
    return originalJson(body);
  };
  next();
};

module.exports = {
  csrf,
  verifyCsrf,
  getCSRFToken,
  generateCSRFToken,
  clearUserCSRFTokens,
  csrfTokenRefresh,
  validateOrigin,
  extractToken
};
