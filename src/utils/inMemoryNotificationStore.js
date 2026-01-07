/**
 * Persistent Notification Store (with File Backup)
 * Stores notifications in memory + JSON file
 * Works even without MongoDB!
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger') || console;

const STORAGE_FILE = path.join(__dirname, '../../data/notifications.json');

class InMemoryNotificationStore {
  constructor() {
    this.notifications = new Map(); // userId -> [notifications]
    this.maxPerUser = 100; // Keep last 100 notifications per user
    this.loaded = false;
    this.load(); // Load on startup
  }

  async ensureDataDir() {
    const dataDir = path.join(__dirname, '../../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Ignore
    }
  }

  async load() {
    if (this.loaded) return;
    
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      this.notifications = new Map();
      parsed.forEach(({ userId, notifications }) => {
        this.notifications.set(userId, notifications);
      });
      
      logger.info(`📦 Loaded notifications from file: ${this.notifications.size} users`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('⚠️  Error loading notifications:', error.message);
      }
    }
    this.loaded = true;
  }

  async save() {
    try {
      await this.ensureDataDir();
      const data = [];
      for (const [userId, notifications] of this.notifications.entries()) {
        data.push({ userId, notifications });
      }
      await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('⚠️  Error saving notifications:', error.message);
    }
  }

  /**
   * Add notification to memory + save to file
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

    // Save to file (async, no await to keep it fast)
    this.save().catch(err => logger.error('Save error:', err));

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
   * Mark notification as read + save
   */
  markAsRead(userId, notificationId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];

    const notif = notifs.find(
      n => n._id.toString() === notificationId.toString()
    );
    if (notif) {
      notif.isRead = true;
      this.save().catch(err => logger.error('Save error:', err));
      return true;
    }
    return false;
  }

  /**
   * Mark all as read for user + save
   */
  markAllAsRead(userId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];
    notifs.forEach(n => (n.isRead = true));
    this.save().catch(err => logger.error('Save error:', err));
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
   * Delete notification + save
   */
  deleteNotification(userId, notificationId) {
    const userIdStr = userId.toString();
    const notifs = this.notifications.get(userIdStr) || [];

    const index = notifs.findIndex(
      n => n._id.toString() === notificationId.toString()
    );
    if (index > -1) {
      notifs.splice(index, 1);
      this.save().catch(err => logger.error('Save error:', err));
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
      storageType: 'FILE-BACKED (JSON)',
    };
  }

  /**
   * Cleanup old notifications (30+ days)
   */
  async cleanup(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    for (const [userId, notifs] of this.notifications.entries()) {
      const before = notifs.length;
      const filtered = notifs.filter(n => new Date(n.createdAt) > cutoffDate);
      this.notifications.set(userId, filtered);
      deletedCount += (before - filtered.length);
    }
    
    if (deletedCount > 0) {
      await this.save();
      logger.info(`🗑️  Cleaned up ${deletedCount} old notifications`);
    }
    
    return deletedCount;
  }
}

module.exports = new InMemoryNotificationStore();
