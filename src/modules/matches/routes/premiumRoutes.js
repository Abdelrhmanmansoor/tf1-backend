const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All premium routes require authentication
router.use(authenticate);

router.get('/status', matchesLimiter, premiumController.getStatus);
router.post('/subscribe', matchesLimiter, premiumController.subscribe);
router.get('/usage', matchesLimiter, premiumController.getUsage);
router.get('/plans', matchesLimiter, premiumController.getPlans);

module.exports = router;

