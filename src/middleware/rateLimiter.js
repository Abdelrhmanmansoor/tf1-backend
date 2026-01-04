const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiting middleware for AI endpoints
 * Prevents abuse of expensive AI API calls
 */
const aiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per window default
  message: {
    success: false,
    message: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة لاحقاً.',
    messageEn: 'Too many AI requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`⚠️ AI Rate Limit Exceeded: User=${req.user?._id}, IP=${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'تم تجاوز عدد الطلبات المسموحة للذكاء الاصطناعي. يرجى المحاولة لاحقاً.',
      messageEn: 'Too many AI requests. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for admin users (optional)
    return req.user?.role === 'admin';
  }
  // Removed custom keyGenerator - will use default which handles IPv6 correctly
});

/**
 * Rate limiting for file uploads
 * Prevents spam uploads
 */
const uploadRateLimiter = rateLimit({
  windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS) || 50, // 50 uploads per hour
  message: {
    success: false,
    message: 'تم تجاوز عدد عمليات الرفع المسموحة. يرجى المحاولة لاحقاً.',
    messageEn: 'Too many upload requests. Please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`⚠️ Upload Rate Limit Exceeded: User=${req.user?._id}, IP=${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'تم تجاوز عدد عمليات الرفع المسموحة. يرجى المحاولة لاحقاً.',
      messageEn: 'Too many upload requests. Please try again later.'
    });
  }
});

/**
 * General API rate limiting
 * Protects against DDoS and abuse
 */
const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: {
    success: false,
    message: 'تم تجاوز عدد الطلبات المسموحة. يرجى المحاولة لاحقاً.',
    messageEn: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  aiRateLimiter,
  uploadRateLimiter,
  generalRateLimiter
};
