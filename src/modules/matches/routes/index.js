const express = require('express');
const router = express.Router();
const autoInitializer = require('../utils/autoInitialize');

// Middleware to skip CSRF check for matches routes
// Matches routes use JWT tokens (httpOnly cookies) which are CSRF-resistant
// CSRF protection is not needed for JWT-based authentication
router.use((req, res, next) => {
  // Skip CSRF validation for all matches routes
  // JWT tokens in httpOnly cookies are protected against CSRF by design
  req.skipCSRF = true;
  next();
});

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
router.post('/register', authLimiter, (req, res) => authController.register(req, res));
router.post('/login', authLimiter, (req, res) => authController.login(req, res));

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
