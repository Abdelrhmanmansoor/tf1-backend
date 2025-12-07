const rateLimit = require('express-rate-limit');

// General matches rate limiter (100 req/15min)
const matchesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'MATCHES_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints rate limiter (stricter - 10 req/15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'MATCHES_AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Join/leave operations limiter (30 req/15min)
const joinLeaveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many join/leave requests. Please slow down.',
    code: 'MATCHES_JOIN_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Chat rate limiter (60 req/minute)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: 'Too many chat messages. Please slow down.',
    code: 'MATCHES_CHAT_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  matchesLimiter,
  authLimiter,
  joinLeaveLimiter,
  chatLimiter
};
