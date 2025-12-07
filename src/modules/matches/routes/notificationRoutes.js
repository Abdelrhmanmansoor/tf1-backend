const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// Notification routes
router.get('/', notificationController.getNotifications);
router.post('/:id/read', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);

module.exports = router;
