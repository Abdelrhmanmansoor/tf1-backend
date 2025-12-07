const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected routes
router.get('/me', authenticate, authController.me);

module.exports = router;
