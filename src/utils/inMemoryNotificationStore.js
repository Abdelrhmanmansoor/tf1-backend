/**
 * In-Memory Notification Store
 * Temporary storage for notifications while MongoDB connects
 * Automatically persists to MongoDB when available
 */

class InMemoryNotificationStore {
  constructor() {
    this.notifications = new Map(); // userId -> [notifications]
    this.maxPerUser = 100; // Keep last 100 notifications per user
  }

  /**
   * Add notification to memory
   */
  addNotification(userId, notification) {
    if (!userId) return null;

    const userIdStr = userId.toString();

    if (!this.notifications.has(userIdStr)) {
      this.notifications.set(userIdStr, []);
    }

    const userNotifications = this.notifications.get(userIdStr);
    const notif = {
      _id: notification._id || this._generateId(),
      ...notification,
      createdAt: notification.createdAt || new Date(),
      isRead: notification.isRead || false,
    };

    userNotifications.unshift(notif); // Add to beginning

    // Keep only latest notifications
    if (userNotifications.length > this.maxPerUser) {
      userNotifications.pop();
    }

    return notif;
  }

  /**
   * Get all notifications for user
   */
  getNotifications(userId, filter = {}) {
    const userIdStr = userId.toString();
    let notifs = this.notifications.get(userIdStr) || [];

    // Filter by type if provided
    if (filter.type) {
      notifs = notifs.filter(n => n.type === filter.type);
    }

    // Filter by read status if provided
    if (filter.isRead !== undefined) {
      notifs = notifs.filter(n => n.isRead === filter.isRead);
    }

    return notifs;
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId, notificationId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];

    const notif = notifs.find(
      n => n._id.toString() === notificationId.toString()
    );
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all as read for user
   */
  markAllAsRead(userId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];
    notifs.forEach(n => (n.isRead = true));
    return notifs.length;
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];
    return notifs.filter(n => !n.isRead).length;
  }

  /**
   * Delete notification
   */
  deleteNotification(userId, notificationId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];

    const index = notifs.findIndex(
      n => n._id.toString() === notificationId.toString()
    );
    if (index > -1) {
      notifs.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications for user
   */
  clearUserNotifications(userId) {
    const userIdStr = userId.toString();
    this.notifications.delete(userIdStr);
  }

  /**
   * Get all data (for migration to MongoDB)
   */
  getAllData() {
    const result = [];
    for (const [userId, notifs] of this.notifications.entries()) {
      result.push({ userId, notifications: notifs });
    }
    return result;
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return (
      'in-mem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Get stats
   */
  getStats() {
    let totalNotifications = 0;
    let totalUsers = 0;
    let totalUnread = 0;

    for (const [userId, notifs] of this.notifications.entries()) {
      totalUsers++;
      totalNotifications += notifs.length;
      totalUnread += notifs.filter(n => !n.isRead).length;
    }

    return {
      totalUsers,
      totalNotifications,
      totalUnread,
      storageType: 'IN-MEMORY',
    };
  }
}

module.exports = new InMemoryNotificationStore();
