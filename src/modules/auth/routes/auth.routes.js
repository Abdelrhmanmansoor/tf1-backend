const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, optionalAuth } = require('../../../middleware/auth');
const { csrf, verifyCsrf, getCSRFToken } = require('../../../middleware/csrf');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification,
  validateResendVerificationByToken
} = require('../../../middleware/validation');

// Auth-specific rate limiter - more lenient
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

// Login specific rate limiter - even more restrictive
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit login attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const router = express.Router();

// ==================== CSRF TOKEN ENDPOINTS ====================
// Get fresh CSRF token for client-side use
router.get('/csrf-token', csrf, getCSRFToken);

// ==================== PUBLIC AUTHENTICATION ENDPOINTS ====================
// These endpoints need CSRF protection but no authentication
router.post('/register', authLimiter, csrf, verifyCsrf, validateRegister, authController.register);

router.post('/login', loginLimiter, csrf, verifyCsrf, validateLogin, authController.login);

// Token refresh doesn't need CSRF (uses refresh token in httpOnly cookie)
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Password reset flows
router.post('/forgot-password', authLimiter, csrf, verifyCsrf, validateForgotPassword, authController.forgotPassword);

router.post('/reset-password', authLimiter, csrf, verifyCsrf, validateResetPassword, authController.resetPassword);

// Email verification - support both GET and POST for different client flows
router.get('/verify-email', csrf, validateEmailVerification, authController.verifyEmail);
router.post('/verify-email', (req, res, next) => {
  if (req.body && req.body.token && !req.query.token) {
    req.query.token = req.body.token;
  }
  next();
}, csrf, verifyCsrf, validateEmailVerification, authController.verifyEmail);

// ==================== AUTHENTICATED ENDPOINTS ====================
// These endpoints require both authentication AND CSRF protection
router.post('/resend-verification', authenticate, csrf, verifyCsrf, validateResendVerification, authController.resendVerification);

router.post('/resend-verification-by-token', csrf, verifyCsrf, validateResendVerificationByToken, authController.resendVerificationByToken);

router.post('/logout', authenticate, csrf, verifyCsrf, authController.logout);

// Profile endpoints - generate CSRF tokens for GETs
router.get('/profile', authenticate, csrf, authController.getProfile);

router.get('/role-info', optionalAuth, csrf, authController.getRoleInfo);

router.get('/test-account', authController.testAccount);

module.exports = router;
