const jwtService = require('../utils/jwt');
const User = require('../modules/shared/models/User');
const logger = require('../utils/logger');

const resolveToken = req => {
  // #region agent log
  const fs = require('fs');
  try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:5',message:'Resolve token called',data:{path:req.path,hasAuthHeader:!!req.headers.authorization,authHeaderValue:req.headers.authorization?'Bearer ...':null,hasCookies:!!req.cookies,cookieNames:req.cookies?Object.keys(req.cookies).join(','):'none',hasAccessToken:!!(req.cookies&&req.cookies.accessToken),hasAccessTokenNew:!!(req.cookies&&req.cookies.access_token),hasSportxAccessToken:!!(req.cookies&&req.cookies.sportx_access_token)},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
  // #endregion
  
  // Try Authorization header first
  if (req.headers.authorization) {
    try {
      const token = jwtService.extractTokenFromHeader(req.headers.authorization);
      
      // #region agent log
      try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:9',message:'Token from Authorization header',data:{found:true,tokenPreview:token?token.substring(0,20)+'...':null},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
      // #endregion
      
      return token;
    } catch (error) {
      logger.warn('Failed to parse authorization header', {
        message: error.message,
        path: req.path,
      });
    }
  }

  // Try cookies - check both access_token (new) and accessToken (legacy)
  if (req.cookies) {
    if (req.cookies.access_token) {
      logger.debug('Token found in access_token cookie', { path: req.path });
      
      // #region agent log
      try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:20',message:'Token from access_token cookie',data:{found:true},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
      // #endregion
      
      return req.cookies.access_token;
    }
    if (req.cookies.accessToken) {
      logger.debug('Token found in accessToken cookie (legacy)', { path: req.path });
      
      // #region agent log
      try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:25',message:'Token from accessToken cookie',data:{found:true},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
      // #endregion
      
      return req.cookies.accessToken;
    }
    if (req.cookies.sportx_access_token) {
      // #region agent log
      try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:28',message:'Token from sportx_access_token cookie',data:{found:true},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
      // #endregion
      
      return req.cookies.sportx_access_token;
    }
  }

  // #region agent log
  try { fs.appendFileSync('c:\\Users\\abdel\\Desktop\\SportsPlatform-BE\\.cursor\\debug.log', JSON.stringify({location:'auth.js:31',message:'No token found anywhere',data:{path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'auth-debug',hypothesisId:'D'})+'\n'); } catch(e){}
  // #endregion

  return null;
};

const authenticate = async (req, res, next) => {
  try {
    // SAFEGUARD: Check JWT_ACCESS_SECRET before processing
    if (!process.env.JWT_ACCESS_SECRET) {
      console.error('❌ [AUTH MIDDLEWARE] CRITICAL: JWT_ACCESS_SECRET environment variable is missing!');
      logger.error('JWT_ACCESS_SECRET environment variable is not set', {
        path: req.path,
        ip: req.ip
      });
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact support.',
        code: 'MISSING_JWT_SECRET'
      });
    }
    
    const token = resolveToken(req);

    if (!token) {
      // Enhanced debugging for missing tokens
      const cookieHeader = req.headers.cookie || '';
      const hasAuthHeader = !!req.headers.authorization;
      const cookieNames = req.cookies ? Object.keys(req.cookies).join(', ') : '';
      const hasAccessTokenCookie = !!(req.cookies && (req.cookies.access_token || req.cookies.accessToken));
      
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path,
        hasAuthHeader,
        hasCookies: cookieHeader.length > 0,
        cookieNames,
        hasAccessTokenCookie,
        cookieHeaderLength: cookieHeader.length,
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
