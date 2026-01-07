const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// Device registration (requires auth)
router.post('/register', authenticate, matchesLimiter, (req, res) => mobileController.registerDevice(req, res));

// Mobile dashboard (requires auth)
router.get('/dashboard', authenticate, matchesLimiter, (req, res) => mobileController.getDashboard(req, res));

// Mobile-optimized match
router.get('/matches/:matchId', optionalAuth, matchesLimiter, (req, res) => mobileController.getMatch(req, res));

// Event tracking (optional auth for anonymous events)
router.post('/track', optionalAuth, matchesLimiter, (req, res) => mobileController.trackEvent(req, res));

// App configuration (public)
router.get('/config', matchesLimiter, (req, res) => mobileController.getConfig(req, res));

module.exports = router;

