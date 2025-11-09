const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, optionalAuth } = require('../../../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification
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

router.post('/register', authLimiter, validateRegister, authController.register);

router.post('/login', loginLimiter, validateLogin, authController.login);

router.post('/refresh-token', authLimiter, authController.refreshToken);

router.post('/forgot-password', authLimiter, validateForgotPassword, authController.forgotPassword);

router.post('/reset-password', authLimiter, validateResetPassword, authController.resetPassword);

router.get('/verify-email', validateEmailVerification, authController.verifyEmail);

router.post('/resend-verification', validateResendVerification, authController.resendVerification);

router.post('/logout', authenticate, authController.logout);

router.get('/profile', authenticate, authController.getProfile);

router.get('/role-info', optionalAuth, authController.getRoleInfo);

router.get('/test-account', authController.testAccount);

module.exports = router;