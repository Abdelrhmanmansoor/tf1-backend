const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', authLimiter, (req, res) => authController.register(req, res));
router.post('/signup', authLimiter, (req, res) => authController.signup(req, res)); // Backward compatibility
router.post('/verify', (req, res) => authController.verify(req, res));
router.get('/verify', (req, res) => authController.verify(req, res)); // Support both POST and GET for verification
router.get('/verify-email', (req, res) => authController.verifyEmail(req, res)); // New endpoint for /matches/verify-email
router.post('/login', authLimiter, (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/resend-verification', authLimiter, (req, res) => authController.resendVerification(req, res)); // Resend verification email

// Protected routes
router.get('/me', authenticate, (req, res) => authController.me(req, res));

module.exports = router;
