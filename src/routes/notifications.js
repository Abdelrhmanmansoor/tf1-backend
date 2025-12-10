const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/unread/count', notificationController.getUnreadCount);
router.get('/unread-count', notificationController.getUnreadCount); // Alias
router.get('/jobs', notificationController.getJobNotifications);
router.get('/group/:groupKey', notificationController.getGroupedNotifications);

// Mark as read (support both PUT and PATCH)
router.put('/:id/read', notificationController.markAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.put('/read-multiple', notificationController.markMultipleAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);

// Delete notifications
router.delete('/:id', notificationController.deleteNotification);
router.delete('/clear-all', notificationController.clearAllNotifications);

// Notification settings/preferences
router.get('/settings', notificationController.getNotificationSettings);
router.put('/settings', notificationController.updateNotificationSettings);
router.put(
  '/settings/toggle-all',
  notificationController.toggleAllNotifications
);

module.exports = router;
