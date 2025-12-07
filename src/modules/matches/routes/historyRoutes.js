const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// History route
router.get('/matches/history', historyController.getMyMatchHistory);

module.exports = router;
