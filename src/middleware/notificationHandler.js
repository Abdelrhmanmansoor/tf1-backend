/**
 * Notification Handler Middleware
 * Manages notifications with fallback to in-memory storage
 * Attempts to save to MongoDB, falls back to memory if unavailable
 */

const Notification = require('../models/Notification');
const inMemoryStore = require('../utils/inMemoryNotificationStore');
const mongoose = require('mongoose');

/**
 * Save notification to database or memory
 * Returns: { saved: true/false, source: 'mongodb'/'memory' }
 */
const saveNotification = async notificationData => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // MongoDB is connected
      const notification = await Notification.create(notificationData);
      return {
        notification,
        saved: true,
        source: 'mongodb',
      };
    } else {
      // MongoDB not connected, use memory
      const notification = inMemoryStore.addNotification(
        notificationData.userId,
        notificationData
      );
      return {
        notification,
        saved: false,
        source: 'memory',
      };
    }
  } catch (error) {
    console.error('Error saving notification:', error);
    // Fallback to memory on any error
    const notification = inMemoryStore.addNotification(
      notificationData.userId,
      notificationData
    );
    return {
      notification,
      saved: false,
      source: 'memory',
    };
  }
};

/**
 * Get notifications for user (from MongoDB or memory)
 */
const getNotifications = async (userId, options = {}) => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Get from MongoDB
      const notifications = await Notification.find({
        userId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);

      return { notifications, source: 'mongodb' };
    } else {
      // Get from memory
      const notifications = inMemoryStore.getNotifications(
        userId,
        options.filter
      );
      return { notifications, source: 'memory' };
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Fallback to memory
    const notifications = inMemoryStore.getNotifications(
      userId,
      options.filter
    );
    return { notifications, source: 'memory' };
  }
};

/**
 * Mark as read (in both storages if available)
 */
const markAsRead = async (userId, notificationId) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    }
    inMemoryStore.markAsRead(userId, notificationId);
    return true;
  } catch (error) {
    console.error('Error marking as read:', error);
    inMemoryStore.markAsRead(userId, notificationId);
    return true;
  }
};

/**
 * Get unread count
 */
const getUnreadCount = async userId => {
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
        isDeleted: false,
      });
      return count;
    } else {
      return inMemoryStore.getUnreadCount(userId);
    }
  } catch (error) {
    return inMemoryStore.getUnreadCount(userId);
  }
};

/**
 * Get storage status
 */
const getStorageStatus = () => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const memoryStats = inMemoryStore.getStats();

  return {
    primary: isMongoConnected ? 'mongodb' : 'memory',
    mongodb: isMongoConnected,
    memory: memoryStats,
  };
};

module.exports = {
  saveNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
  getStorageStatus,
  inMemoryStore,
};
