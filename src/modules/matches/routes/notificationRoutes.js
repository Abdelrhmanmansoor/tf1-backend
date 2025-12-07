const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Notification routes
router.get('/', notificationController.getNotifications);
router.post('/:id/read', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);

module.exports = router;
