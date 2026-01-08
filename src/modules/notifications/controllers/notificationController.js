const Notification = require('../models/Notification');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { isRead = false, limit = 20, skip = 0, sort = '-createdAt' } = req.query;

  const query = { recipientId: userId };
  
  if (isRead !== 'all') {
    query.isRead = isRead === 'true';
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('senderId', 'firstName lastName avatar')
      .lean(),
    Notification.countDocuments(query)
  ]);

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    isRead: false
  });

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
      pages: Math.ceil(total / parseInt(limit))
    },
    unreadCount
  });
});

/**
 * @route   GET /api/v1/notifications/unread
 * @desc    Get unread notification count
 * @access  Private
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    isRead: false
  });

  res.status(200).json({
    success: true,
    unreadCount
  });
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const notification = await Notification.findOne({
    _id: id,
    recipientId: userId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
      messageAr: 'الإشعار غير موجود'
    });
  }

  await notification.markAsRead();

  logger.info(`✅ Notification marked as read for user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    messageAr: 'تم تحديد الإشعار كمقروء',
    notification
  });
});

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    {
      recipientId: userId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );

  logger.info(`✅ All notifications marked as read for user ${userId}. Modified: ${result.modifiedCount}`);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    messageAr: 'تم تحديد جميع الإشعارات كمقروءة',
    modifiedCount: result.modifiedCount
  });
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
exports.deleteNotification = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipientId: userId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
      messageAr: 'الإشعار غير موجود'
    });
  }

  logger.info(`✅ Notification deleted for user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Notification deleted',
    messageAr: 'تم حذف الإشعار'
  });
});

/**
 * @route   DELETE /api/v1/notifications
 * @desc    Delete all notifications
 * @access  Private
 */
exports.deleteAllNotifications = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.deleteMany({
    recipientId: userId
  });

  logger.info(`✅ All notifications deleted for user ${userId}. Deleted: ${result.deletedCount}`);

  res.status(200).json({
    success: true,
    message: 'All notifications deleted',
    messageAr: 'تم حذف جميع الإشعارات',
    deletedCount: result.deletedCount
  });
});

/**
 * @route   GET /api/v1/notifications/by-type/:type
 * @desc    Get notifications by type
 * @access  Private
 */
exports.getNotificationsByType = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { type } = req.params;
  const { limit = 20, skip = 0 } = req.query;

  const validTypes = [
    'job_application',
    'application_status_change',
    'interview_scheduled',
    'job_posted',
    'message_received',
    'profile_viewed',
    'application_rejected',
    'application_accepted',
    'application_shortlisted',
    'message_reply',
    'conversation_started'
  ];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid notification type',
      messageAr: 'نوع الإشعار غير صحيح'
    });
  }

  const [notifications, total] = await Promise.all([
    Notification.find({
      recipientId: userId,
      type
    })
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('senderId', 'firstName lastName avatar')
      .lean(),
    Notification.countDocuments({
      recipientId: userId,
      type
    })
  ]);

  res.status(200).json({
    success: true,
    notifications,
    total,
    type
  });
});

/**
 * Create notification helper function
 */
exports.createNotification = async (
  recipientId,
  type,
  title,
  description,
  relatedEntity,
  data = {},
  priority = 'normal'
) => {
  try {
    const notification = await Notification.createNotification(
      recipientId,
      type,
      title,
      description,
      relatedEntity,
      data,
      priority
    );

    logger.info(`✅ Notification created for user ${recipientId}: ${type}`);
    return notification;
  } catch (error) {
    logger.error(`❌ Error creating notification:`, error);
    throw error;
  }
};
