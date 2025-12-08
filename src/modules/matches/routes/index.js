const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const teamRoutes = require('./teamRoutes');
const historyRoutes = require('./historyRoutes');
const notificationRoutes = require('./notificationRoutes');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

// Mount routes
router.use('/auth', authRoutes);

// Backward-compatible routes for registration and login
// These map to the same endpoints as /auth/signup and /auth/login
router.post('/register', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

router.use('/', matchRoutes);  // Match routes at root of /matches
router.use('/teams', teamRoutes);
router.use('/me', historyRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
