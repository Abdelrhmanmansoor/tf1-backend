const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, optionalAuth } = require('../../../middleware/auth');
const { verifyCsrf, getCSRFToken } = require('../../../middleware/csrf');
let {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification,
  validateResendVerificationByToken
} = require('../../../middleware/validation');

// Safe fallback for new validators
const validateResendVerificationByTokenSafe = Array.isArray(validateResendVerificationByToken)
  ? validateResendVerificationByToken
  : [(req, res, next) => next()];

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
// This should be called by frontend BEFORE submitting any form
router.get('/csrf-token', getCSRFToken);

// ==================== PUBLIC AUTHENTICATION ENDPOINTS ====================
// These endpoints need CSRF protection but no authentication
// Order: Rate Limit -> CSRF Verify -> Validation -> Controller
// NOTE: verifyCsrf is the ONLY csrf middleware needed - it handles verification + rotation
router.post('/register', authLimiter, verifyCsrf, validateRegister, authController.register);

router.post('/login', loginLimiter, verifyCsrf, validateLogin, authController.login);

// Token refresh doesn't need CSRF (uses refresh token in httpOnly cookie)
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Password reset flows
router.post('/forgot-password', authLimiter, verifyCsrf, validateForgotPassword, authController.forgotPassword);

router.post('/reset-password', authLimiter, verifyCsrf, validateResetPassword, authController.resetPassword);

// Email verification - support both GET and POST for different client flows
router.get('/verify-email', validateEmailVerification, authController.verifyEmail);
router.post('/verify-email', (req, res, next) => {
  if (req.body && req.body.token && !req.query.token) {
    req.query.token = req.body.token;
  }
  next();
}, verifyCsrf, validateEmailVerification, authController.verifyEmail);

// ==================== AUTHENTICATED ENDPOINTS ====================
// These endpoints require both authentication AND CSRF protection
router.post('/resend-verification', authenticate, verifyCsrf, validateResendVerification, authController.resendVerification);

router.post('/resend-verification-by-token', verifyCsrf, validateResendVerificationByTokenSafe, authController.resendVerificationByToken);

router.post('/logout', authenticate, verifyCsrf, authController.logout);

// Profile endpoints
router.get('/profile', authenticate, authController.getProfile);

// Get current user (alias for /profile - used by frontend)
router.get('/me', authenticate, authController.getProfile);

router.get('/role-info', optionalAuth, authController.getRoleInfo);

router.get('/test-account', authController.testAccount);

// ==================== OTP VERIFICATION ENDPOINTS ====================
// Send OTP via SMS, WhatsApp, or Email
router.post('/send-otp', authLimiter, verifyCsrf, authController.sendOTP);

// Verify OTP code
router.post('/verify-otp', authLimiter, verifyCsrf, authController.verifyOTP);

// Request password reset via phone OTP
router.post('/forgot-password-otp', authLimiter, verifyCsrf, authController.forgotPasswordOTP);

// Reset password using OTP
router.post('/reset-password-otp', authLimiter, verifyCsrf, authController.resetPasswordOTP);

// Get OTP balance (admin only)
router.get('/otp-balance', authenticate, authController.getOTPBalance);

module.exports = router;
