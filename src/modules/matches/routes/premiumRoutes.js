const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All premium routes require authentication
router.use(authenticate);

router.get('/status', matchesLimiter, (req, res) => premiumController.getStatus(req, res));
router.post('/subscribe', matchesLimiter, (req, res) => premiumController.subscribe(req, res));
router.get('/usage', matchesLimiter, (req, res) => premiumController.getUsage(req, res));
router.get('/plans', matchesLimiter, (req, res) => premiumController.getPlans(req, res));

module.exports = router;

