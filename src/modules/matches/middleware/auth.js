const jwtService = require('../utils/jwtService');
const platformJwt = require('../../../utils/jwt');
const MatchUser = require('../models/MatchUser');
const User = require('../../shared/models/User');

const authenticate = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookie first (new method)
    if (req.cookies && req.cookies.matches_token) {
      token = req.cookies.matches_token;
    } 
    // Fallback to Bearer token for backward compatibility
    else if (req.headers.authorization) {
      token = jwtService.extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    let decoded;
    let matchUser = null;
    try {
      decoded = jwtService.verifyAccessToken(token);
      if (decoded.type === 'matches') {
        matchUser = await MatchUser.findById(decoded.userId).select('-password_hash');
      }
    } catch (e) {
      decoded = null;
    }

    // Fallback: accept main platform JWT and bridge to MatchUser
    if (!matchUser) {
      let platformDecoded;
      try {
        platformDecoded = platformJwt.verifyAccessToken(token);
      } catch (e) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
          code: 'INVALID_TOKEN',
        });
      }

      const platformUser = await User.findById(platformDecoded.userId);
      if (!platformUser) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
          code: 'USER_NOT_FOUND',
        });
      }
      if (!platformUser.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before accessing matches',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }

      // Find or create shadow MatchUser
      matchUser = await MatchUser.findOne({ email: platformUser.email });
      if (!matchUser) {
        const crypto = require('crypto');
        const randomPass = crypto.randomBytes(16).toString('hex');
        matchUser = await MatchUser.create({
          email: platformUser.email.toLowerCase(),
          password_hash: randomPass,
          name: platformUser.fullName || `${platformUser.firstName || ''} ${platformUser.lastName || ''}`.trim() || platformUser.email,
          phone: platformUser.phone || null,
          verified: true,
          role: 'MatchUser'
        });
      } else if (!matchUser.verified) {
        matchUser.verified = true;
        await matchUser.save();
      }
    }

    req.matchUser = matchUser;
    req.token = token;
    next();
  } catch (error) {
    console.error('Matches authentication error:', error);

    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      code: 'INVALID_TOKEN',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookie first
    if (req.cookies && req.cookies.matches_token) {
      token = req.cookies.matches_token;
    } 
    // Fallback to Bearer token
    else if (req.headers.authorization) {
      token = jwtService.extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      req.matchUser = null;
      return next();
    }

    let decoded;
    let matchUser = null;
    try {
      decoded = jwtService.verifyAccessToken(token);
      if (decoded.type === 'matches') {
        matchUser = await MatchUser.findById(decoded.userId).select('-password_hash');
      }
    } catch (e) {
      decoded = null;
    }

    if (!matchUser) {
      try {
        const platformDecoded = platformJwt.verifyAccessToken(token);
        const platformUser = await User.findById(platformDecoded.userId);
        if (platformUser && platformUser.isVerified) {
          matchUser = await MatchUser.findOne({ email: platformUser.email });
          if (!matchUser) {
            const crypto = require('crypto');
            const randomPass = crypto.randomBytes(16).toString('hex');
            matchUser = await MatchUser.create({
              email: platformUser.email.toLowerCase(),
              password_hash: randomPass,
              name: platformUser.fullName || `${platformUser.firstName || ''} ${platformUser.lastName || ''}`.trim() || platformUser.email,
              phone: platformUser.phone || null,
              verified: true,
              role: 'MatchUser'
            });
          } else if (!matchUser.verified) {
            matchUser.verified = true;
            await matchUser.save();
          }
        }
      } catch (e) {
        // ignore optional auth failures
      }
    }

    req.matchUser = matchUser || null;
    req.token = token;

    next();
  } catch (error) {
    req.matchUser = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
