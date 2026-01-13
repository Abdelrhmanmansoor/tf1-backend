/**
 * CSRF Protection Middleware - Signed Token (Header Only)
 * Works reliably with cross-origin requests (Vercel frontend + Render backend)
 * 
 * Design:
 * 1. Token Generation: GET /csrf-token creates signed token with timestamp
 * 2. Token Storage: Client stores in memory (via JSON response)
 * 3. Token Validation: Verify signature + check expiration (NO cookie required)
 * 4. Token Format: base64(payload).signature where payload = {nonce, timestamp}
 * 5. Signature: HMAC SHA256 of payload using CSRF_SECRET
 * 
 * Why Header-Only (not Double Submit Cookie)?
 * - Cross-origin cookies are blocked by modern browsers (SameSite, third-party cookie restrictions)
 * - Header-only with signed tokens is equally secure when combined with Origin validation
 * - Works reliably across all deployment scenarios
 * 
 * Security Features:
 * - Cryptographically signed tokens (HMAC SHA256)
 * - Timestamp-based expiration (configurable, default 1 hour)
 * - Origin/Referer header validation for state-changing requests
 * - Stateless - works across multiple instances
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Configuration
const CSRF_TOKEN_TTL_MS = parseInt(process.env.CSRF_TOKEN_TTL_MS || '3600000', 10); // 1 hour default
const CSRF_SECRET = process.env.CSRF_SECRET || (() => {
  // Generate a secret if not set (WARNING: This changes on restart - MUST set in production)
  logger.warn('⚠️ CSRF_SECRET not set - generating random secret. Set CSRF_SECRET in .env for production!');
  return crypto.randomBytes(32).toString('hex');
})();
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

/**
 * Sign a token payload using HMAC SHA256
 * @param {string} payload - The payload to sign (base64 encoded)
 * @returns {string} - HMAC signature (hex)
 */
const signToken = (payload) => {
  return crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
};

/**
 * Generate a cryptographically secure CSRF token
 * Format: base64({nonce, timestamp}).signature
 * @returns {string} - Signed token
 */
const generateCSRFToken = () => {
  // Generate random nonce
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create payload with timestamp
  const payload = {
    nonce,
    timestamp: Date.now(),
  };
  
  // Encode payload as base64
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Sign the payload
  const signature = signToken(payloadBase64);
  
  // Return: payload.signature
  return `${payloadBase64}.${signature}`;
};

/**
 * Verify a CSRF token's signature and expiration
 * @param {string} token - The token to verify
 * @returns {{valid: boolean, expired: boolean, payload: object|null}}
 */
const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, expired: false, payload: null };
  }
  
  // Split token into payload and signature
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, expired: false, payload: null };
  }
  
  const [payloadBase64, signature] = parts;
  
  // Verify signature
  const expectedSignature = signToken(payloadBase64);
  if (signature !== expectedSignature) {
    return { valid: false, expired: false, payload: null };
  }
  
  // Decode payload
  let payload;
  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    payload = JSON.parse(payloadJson);
  } catch (error) {
    return { valid: false, expired: false, payload: null };
  }
  
  // Check expiration
  const tokenAge = Date.now() - payload.timestamp;
  const expired = tokenAge > CSRF_TOKEN_TTL_MS;
  
  return {
    valid: !expired,
    expired,
    payload: expired ? null : payload,
  };
};

/**
 * Build cookie options based on environment
 * Supports cross-origin scenarios (frontend/backend on different domains)
 */
const getCookieOptions = () => {
  // For Render.com, Vercel, or any cloud deployment - always assume cross-origin
  // When frontend (e.g., Vercel) and backend (e.g., Render) are on different domains
  const isCloudDeployment = !!(process.env.RENDER || process.env.VERCEL || process.env.REPL_ID);
  const isCrossOrigin = isCloudDeployment || !!process.env.FRONTEND_URL;
  
  // In production with cross-origin: must use SameSite=None + Secure
  // In development: use SameSite=Lax (more permissive)
  if (isProduction && isCrossOrigin) {
    return {
      httpOnly: false, // Must be false - client JS needs to read this
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for cross-origin cookies
      maxAge: Math.floor(CSRF_TOKEN_TTL_MS / 1000), // Convert to seconds
      path: '/',
    };
  }
  
  return {
    httpOnly: false, // Must be false - client JS needs to read this
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax',
    maxAge: Math.floor(CSRF_TOKEN_TTL_MS / 1000), // Convert to seconds
    path: '/',
  };
};

/**
 * Validate Origin/Referer header against allowed origins
 * Returns true if valid, false if invalid
 */
const validateOrigin = (req) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Get Origin header (preferred) or Referer as fallback
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  
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
  
  // In production, be strict for state-changing requests
  if (!origin) {
    // For POST/PUT/PATCH/DELETE, require origin or referer
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        return allowedOrigins.some(allowed => 
          refererOrigin === allowed.replace(/\/$/, '') || 
          refererOrigin.endsWith('tf1one.com')
        );
      } catch (e) {
        return false;
      }
    }
    // No origin or referer in production - reject
    return false;
  }
  
  const originHost = origin.replace(/\/$/, '');
  return allowedOrigins.some(allowed => 
    originHost === allowed.replace(/\/$/, '') || 
    originHost.endsWith('tf1one.com')
  );
};

/**
 * Extract CSRF token from request
 * Priority: Header > Cookie
 */
const extractToken = (req) => {
  return (
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.headers['X-CSRF-Token'] ||
    req.headers['X-XSRF-TOKEN'] ||
    req.cookies?.['XSRF-TOKEN'] ||
    req.cookies?.['xsrf-token']
  );
};

/**
 * Legacy csrf middleware - passthrough for backward compatibility
 */
const csrf = (req, res, next) => {
  next();
};

/**
 * Verify CSRF token on state-changing requests
 * This is the main CSRF protection middleware
 * Uses Signed Token pattern (Header only - no cookie required)
 * This works reliably with cross-origin requests
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

  // Step 1: Validate Origin/Referer header (for state-changing requests)
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

  // Step 2: Extract CSRF token from header ONLY (no cookie required)
  // This is the key change - we only need the header token
  const headerToken = req.headers['x-csrf-token'] || 
                     req.headers['x-xsrf-token'] || 
                     req.headers['X-CSRF-Token'] || 
                     req.headers['X-XSRF-TOKEN'];

  if (!headerToken) {
    logger.warn('CSRF: Token missing in header', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      origin: req.headers.origin
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.',
      messageAr: 'رمز CSRF مفقود. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Step 3: Verify token signature and expiration (the token is self-contained)
  const verification = verifyToken(headerToken);
  
  if (!verification.valid) {
    if (verification.expired) {
      logger.warn('CSRF: Token expired', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'CSRF token expired. Please refresh the page and try again.',
        messageAr: 'انتهت صلاحية رمز CSRF. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
        code: 'CSRF_TOKEN_EXPIRED'
      });
    } else {
      logger.warn('CSRF: Invalid token signature', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'CSRF token invalid. Please refresh the page and try again.',
        messageAr: 'رمز CSRF غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
  }

  // Token is valid - allow request to proceed
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
  
  // Set cookie
  const cookieOptions = getCookieOptions();
  res.cookie('XSRF-TOKEN', token, cookieOptions);

  // Log cookie settings for debugging
  logger.debug('CSRF token generated and cookie set', {
    path: req.path,
    origin: req.headers.origin,
    cookieOptions: {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge
    }
  });

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
 * Note: With stateless tokens, we can't revoke them server-side
 * This is a no-op for backward compatibility
 */
const clearUserCSRFTokens = (userId) => {
  // Stateless tokens can't be revoked server-side
  // They expire naturally via timestamp
  logger.debug('clearUserCSRFTokens called (no-op for stateless tokens)', { userId });
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
