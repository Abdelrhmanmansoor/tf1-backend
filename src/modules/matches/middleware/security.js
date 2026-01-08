/**
 * Security middleware for matches system
 */

const { ForbiddenError, ValidationError } = require('../utils/errorHandler');

/**
 * Check if user owns the match
 */
const checkMatchOwnership = async (req, res, next) => {
  try {
    const Match = require('../models/Match');
    const matchId = req.params.id;
    const userId = req.matchUser._id;

    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new ForbiddenError('Match not found');
    }

    const ownerId = match.owner_id || match.created_by;
    
    if (ownerId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to modify this match');
    }

    req.match = match;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potential HTML/JS tags
      return obj
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const mongoose = require('mongoose');
    const id = req.params[paramName];
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }
    
    next();
  };
};

/**
 * Prevent too many requests from same user
 */
const userActionLimiter = (maxActions = 10, windowMs = 60000) => {
  const userActions = new Map();

  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of userActions.entries()) {
      if (now - data.resetTime > windowMs) {
        userActions.delete(userId);
      }
    }
  }, 60000);

  return (req, res, next) => {
    if (!req.matchUser) {
      return next();
    }

    const userId = req.matchUser._id.toString();
    const now = Date.now();

    let userData = userActions.get(userId);

    if (!userData || now - userData.resetTime > windowMs) {
      userData = {
        count: 0,
        resetTime: now
      };
      userActions.set(userId, userData);
    }

    userData.count++;

    if (userData.count > maxActions) {
      return res.status(429).json({
        success: false,
        message: 'Too many actions. Please slow down.',
        code: 'TOO_MANY_ACTIONS'
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.matchUser || !req.matchUser.is_admin) {
    throw new ForbiddenError('Admin access required');
  }
  next();
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const minLength = 8;
  
  if (!password || password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long`
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  return { valid: true };
};

/**
 * Prevent NoSQL injection
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkObject = (obj) => {
    for (const key in obj) {
      const value = obj[key];
      
      // Check for MongoDB operators
      if (key.startsWith('$')) {
        throw new ValidationError('Invalid query parameter');
      }
      
      if (typeof value === 'object' && value !== null) {
        checkObject(value);
      }
    }
  };

  try {
    if (req.body && typeof req.body === 'object') {
      checkObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      checkObject(req.query);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkMatchOwnership,
  sanitizeInput,
  validateObjectId,
  userActionLimiter,
  requireAdmin,
  validateEmail,
  validatePassword,
  preventNoSQLInjection
};


