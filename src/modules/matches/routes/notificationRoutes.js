const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// Notification routes
router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.post('/:id/read', (req, res) => notificationController.markAsRead(req, res));
router.post('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));

module.exports = router;
