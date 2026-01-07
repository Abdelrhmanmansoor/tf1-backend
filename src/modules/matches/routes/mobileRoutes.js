const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// Device registration (requires auth)
router.post('/register', authenticate, matchesLimiter, mobileController.registerDevice);

// Mobile dashboard (requires auth)
router.get('/dashboard', authenticate, matchesLimiter, mobileController.getDashboard);

// Mobile-optimized match
router.get('/matches/:matchId', optionalAuth, matchesLimiter, mobileController.getMatch);

// Event tracking (optional auth for anonymous events)
router.post('/track', optionalAuth, matchesLimiter, mobileController.trackEvent);

// App configuration (public)
router.get('/config', matchesLimiter, mobileController.getConfig);

module.exports = router;

