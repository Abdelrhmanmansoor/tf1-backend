const jwtService = require('../utils/jwtService');
const MatchUser = require('../models/MatchUser');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    const token = jwtService.extractTokenFromHeader(authHeader);
    const decoded = jwtService.verifyAccessToken(token);

    // Verify it's a matches token
    if (decoded.type !== 'matches') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    const user = await MatchUser.findById(decoded.userId).select('-password_hash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.matchUser = user;
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
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.matchUser = null;
      return next();
    }

    const token = jwtService.extractTokenFromHeader(authHeader);
    const decoded = jwtService.verifyAccessToken(token);

    if (decoded.type === 'matches') {
      const user = await MatchUser.findById(decoded.userId).select('-password_hash');
      req.matchUser = user || null;
      req.token = token;
    } else {
      req.matchUser = null;
    }

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
