const express = require('express');
const router = express.Router();
const autoInitializer = require('../utils/autoInitialize');

// Import route modules
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const teamRoutes = require('./teamRoutes');
const historyRoutes = require('./historyRoutes');
const notificationRoutes = require('./notificationRoutes');
const locationRoutes = require('./locationRoutes');
const swipeRoutes = require('./swipeRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const socialRoutes = require('./socialRoutes');
const premiumRoutes = require('./premiumRoutes');
const mobileRoutes = require('./mobileRoutes');

// Import auth controller and rate limiter for direct routes
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

// Auto-initialize system middleware
router.use(autoInitializer.ensureInitialized());

// Direct registration/login routes (for backward compatibility)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Mount main routes under /api prefix
router.use('/api/auth', authRoutes);
router.use('/api/matches', matchRoutes);
router.use('/api/teams', teamRoutes);
router.use('/api/me', historyRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/locations', locationRoutes);
router.use('/api/swipe', swipeRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/social', socialRoutes);
router.use('/api/premium', premiumRoutes);
router.use('/api/mobile', mobileRoutes);

// Legacy routes for backward compatibility (direct under /matches)
router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/teams', teamRoutes);
router.use('/me', historyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/locations', locationRoutes);
router.use('/swipe', swipeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/social', socialRoutes);
router.use('/premium', premiumRoutes);
router.use('/mobile', mobileRoutes);

module.exports = router;
