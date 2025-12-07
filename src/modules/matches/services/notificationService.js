const MatchNotification = require('../models/MatchNotification');

class NotificationService {
  async createNotification(userId, type, matchId = null, payload = {}) {
    const notification = await MatchNotification.create({
      user_id: userId,
      type,
      match_id: matchId,
      payload
    });

    // Emit via Socket.IO if available
    if (global.io) {
      global.io.to(`matchUser:${userId}`).emit('notification', {
        notification_id: notification._id,
        type,
        match_id: matchId,
        payload
      });
    }

    return notification;
  }

  async getUserNotifications(userId, unreadOnly = false) {
    const query = { user_id: userId };
    
    if (unreadOnly) {
      query.read_at = null;
    }

    const notifications = await MatchNotification.find(query)
      .populate('match_id', 'venue starts_at state')
      .sort({ created_at: -1 })
      .limit(50);

    return notifications;
  }

  async markAsRead(notificationId, userId) {
    const notification = await MatchNotification.findOne({
      _id: notificationId,
      user_id: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.read_at) {
      return notification; // Already read
    }

    notification.read_at = new Date();
    await notification.save();

    return notification;
  }

  async markAllAsRead(userId) {
    await MatchNotification.updateMany(
      { user_id: userId, read_at: null },
      { read_at: new Date() }
    );

    return { success: true };
  }

  async getUnreadCount(userId) {
    const count = await MatchNotification.countDocuments({
      user_id: userId,
      read_at: null
    });

    return count;
  }
}

module.exports = new NotificationService();
