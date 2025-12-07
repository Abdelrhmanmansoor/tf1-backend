const notificationService = require('../services/notificationService');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const userId = req.matchUser._id;
      const { unread } = req.query;

      const notifications = await notificationService.getUserNotifications(
        userId,
        unread === 'true'
      );

      const unreadCount = await notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          unread_count: unreadCount
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving notifications'
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error marking notification as read'
      });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.matchUser._id;

      await notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error marking notifications as read'
      });
    }
  }
}

module.exports = new NotificationController();
