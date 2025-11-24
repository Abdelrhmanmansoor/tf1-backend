const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const {
  getNotifications,
  inMemoryStore,
} = require('../middleware/notificationHandler');

// @desc    Get all notifications for authenticated user
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      priority,
      type,
    } = req.query;

    const userId = req.user._id.toString();

    // Get from handler (MongoDB or memory)
    const { notifications, source } = await getNotifications(userId, {
      limit: parseInt(limit),
      filter: { unreadOnly, priority, type },
    });

    console.log(
      `📬 Retrieved ${notifications.length} notifications from ${source}`
    );

    // Format notifications
    const language = req.user.language || 'en';
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      title:
        language === 'ar' && notification.titleAr
          ? notification.titleAr
          : notification.title,
      message:
        language === 'ar' && notification.messageAr
          ? notification.messageAr
          : notification.message,
    }));

    res.status(200).json({
      success: true,
      count: formattedNotifications.length,
      total: formattedNotifications.length,
      page: parseInt(page),
      pages: Math.ceil(formattedNotifications.length / parseInt(limit)),
      hasMore: false,
      data: formattedNotifications,
      source,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

// @desc    Get unread notifications only
// @route   GET /api/v1/notifications/unread
// @access  Private
exports.getUnreadNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id.toString();

    const { notifications, source } = await getNotifications(userId, {
      limit: parseInt(limit),
      filter: { unreadOnly: true },
    });

    const language = req.user.language || 'en';
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      title:
        language === 'ar' && notification.titleAr
          ? notification.titleAr
          : notification.title,
      message:
        language === 'ar' && notification.messageAr
          ? notification.messageAr
          : notification.message,
    }));

    res.status(200).json({
      success: true,
      count: formattedNotifications.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      hasMore: result.hasMore,
      data: formattedNotifications,
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notifications',
      error: error.message,
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message,
    });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message,
    });
  }
};

// @desc    Mark multiple notifications as read
// @route   PUT /api/v1/notifications/read-multiple
// @access  Private
exports.markMultipleAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (
      !notificationIds ||
      !Array.isArray(notificationIds) ||
      notificationIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of notification IDs',
      });
    }

    const result = await Notification.markMultipleAsRead(
      req.user._id,
      notificationIds
    );

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking multiple notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message,
    });
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message,
    });
  }
};

// @desc    Clear all notifications (mark as deleted)
// @route   DELETE /api/v1/notifications/clear-all
// @access  Private
exports.clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'All notifications cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing notifications',
      error: error.message,
    });
  }
};

// @desc    Get notification preferences
// @route   GET /api/v1/notifications/settings
// @access  Private
exports.getNotificationSettings = async (req, res) => {
  try {
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification settings',
      error: error.message,
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/notifications/settings
// @access  Private
exports.updateNotificationSettings = async (req, res) => {
  try {
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    // Update preferences
    if (req.body.preferences) {
      preferences.preferences = {
        ...preferences.preferences,
        ...req.body.preferences,
      };
    }

    // Update quiet hours
    if (req.body.quietHours) {
      preferences.quietHours = {
        ...preferences.quietHours,
        ...req.body.quietHours,
      };
    }

    await preferences.save();

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: preferences,
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification settings',
      error: error.message,
    });
  }
};

// @desc    Toggle all notifications on/off
// @route   PUT /api/v1/notifications/settings/toggle-all
// @access  Private
exports.toggleAllNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide enabled status (true/false)',
      });
    }

    const preferences = await NotificationPreferences.getOrCreate(req.user._id);
    await preferences.toggleAllNotifications(enabled);

    res.status(200).json({
      success: true,
      message: `All notifications ${enabled ? 'enabled' : 'disabled'}`,
      data: preferences,
    });
  } catch (error) {
    console.error('Error toggling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling notifications',
      error: error.message,
    });
  }
};

// @desc    Get notifications by group
// @route   GET /api/v1/notifications/group/:groupKey
// @access  Private
exports.getGroupedNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getGroupedNotifications(
      req.user._id,
      req.params.groupKey
    );

    const language = req.user.language || 'en';
    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      title:
        language === 'ar' && notification.titleAr
          ? notification.titleAr
          : notification.title,
      message:
        language === 'ar' && notification.messageAr
          ? notification.messageAr
          : notification.message,
      relatedTo: notification.relatedTo,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      readAt: notification.readAt,
      priority: notification.priority,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedNotifications.length,
      data: formattedNotifications,
    });
  } catch (error) {
    console.error('Error fetching grouped notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grouped notifications',
      error: error.message,
    });
  }
};

// Helper function to create and send notification (used by other controllers)
exports.createNotification = async notificationData => {
  try {
    // Get user preferences
    const preferences = await NotificationPreferences.getOrCreate(
      notificationData.userId
    );

    // Determine channels based on preferences
    const channels = {
      inApp: true, // Always create in-app notification
      email: false,
      push: false,
      sms: false,
    };

    // Map notification type to preference category
    const typeMapping = {
      training_request: 'trainingRequests',
      training_offer: 'trainingRequests',
      training_accepted: 'trainingRequests',
      training_rejected: 'trainingRequests',
      session_booked: 'trainingRequests',
      session_reminder: 'sessionReminders',
      session_cancelled: 'sessionReminders',
      session_completed: 'sessionReminders',
      message_received: 'messages',
      review_received: 'reviews',
      payment_received: 'payments',
      job_match: 'jobMatches',
      job_application: 'applications',
      club_accepted: 'applications',
      club_rejected: 'applications',
      club_invitation: 'clubInvitations',
      consultation_request: 'trainingRequests',
      membership_request: 'applications',
      facility_booking: 'applications',
      system_update: 'systemUpdates',
    };

    const preferenceCategory =
      typeMapping[notificationData.type] || 'systemUpdates';

    // Check if we should send to each channel
    if (preferences.preferences[preferenceCategory]) {
      channels.email = preferences.shouldSendNotification(
        preferenceCategory,
        'email'
      );
      channels.push = preferences.shouldSendNotification(
        preferenceCategory,
        'push'
      );
      channels.sms = preferences.shouldSendNotification(
        preferenceCategory,
        'sms'
      );
    }

    // Create notification with determined channels
    const notification = await Notification.createNotification({
      ...notificationData,
      channels,
    });

    // Emit Socket.io event for real-time delivery
    const io = global.io;
    if (io) {
      io.to(notificationData.userId.toString()).emit(
        'new_notification',
        notification
      );
    }

    // TODO: Send email if channels.email is true
    // TODO: Send push notification if channels.push is true
    // TODO: Send SMS if channels.sms is true

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Helper function to create notification for multiple users
exports.createBulkNotifications = async (users, notificationDataTemplate) => {
  try {
    const notifications = await Promise.all(
      users.map(user =>
        exports.createNotification({
          ...notificationDataTemplate,
          userId: user._id || user,
          userRole: user.role,
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};
