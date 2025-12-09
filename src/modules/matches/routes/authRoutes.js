const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/signup', authLimiter, authController.signup); // Backward compatibility
router.post('/verify', authController.verify);
router.get('/verify', authController.verify); // Support both POST and GET for verification
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.me);

module.exports = router;
