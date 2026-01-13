const jwtService = require('../utils/jwt');
const User = require('../modules/shared/models/User');
const logger = require('../utils/logger');

const resolveToken = req => {
  if (req.headers.authorization) {
    try {
      return jwtService.extractTokenFromHeader(req.headers.authorization);
    } catch (error) {
      logger.warn('Failed to parse authorization header', {
        message: error.message,
        path: req.path,
      });
    }
  }

  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

const authenticate = async (req, res, next) => {
  try {
    const token = resolveToken(req);

    if (!token) {
      // Enhanced logging for debugging
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderValue: req.headers.authorization ? 'Bearer ***' : 'none',
        hasCookies: !!req.cookies,
        cookieNames: req.cookies ? Object.keys(req.cookies).join(', ') : 'none',
        hasAccessTokenCookie: !!(req.cookies && req.cookies.accessToken),
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    const decoded = jwtService.verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: user._id,
      role: user.role,
      path: req.path,
      method: req.method,
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path,
    });

    if (error.message.includes('expired') || error.message.includes('Token has expired')) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.message.includes('environment variable')) {
      logger.error('JWT secrets not configured', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact support.',
        code: 'SERVER_ERROR',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      code: 'INVALID_TOKEN',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = resolveToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwtService.verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-password');
    req.user = user || null;
    req.token = token;

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please authenticate first.',
      code: 'NOT_AUTHENTICATED',
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required. Please verify your email address.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireEmailVerification,
};
