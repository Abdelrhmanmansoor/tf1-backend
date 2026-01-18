const MessageThread = require('../models/MessageThread');
const Message = require('../../../models/Message');
const NotificationTemplate = require('../../notifications/models/NotificationTemplate');
const Notification = require('../../../models/Notification');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/publisher/messages/threads
 * @desc    Get message threads for publisher
 * @access  Private (Publisher)
 */
exports.getThreads = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, status = 'active', type, search } = req.query;

  const result = await MessageThread.getUserThreads(userId, {
    page,
    limit,
    status,
    type,
    search,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   GET /api/v1/publisher/messages/threads/:id
 * @desc    Get single thread with messages
 * @access  Private (Publisher/Applicant)
 */
exports.getThread = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const thread = await MessageThread.findById(id)
    .populate('jobId', 'title titleAr sport category')
    .populate('applicationId', 'status createdAt')
    .populate('interviewId', 'type scheduledAt status');

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  // Verify user is participant
  if (!thread.isParticipant(userId)) {
    throw new AppError('You do not have permission to view this thread', 403);
  }

  // Get messages
  const messages = await Message.find({
    conversationId: id,
    isDeleted: false,
  })
    .populate('senderId', 'firstName lastName avatar role')
    .sort({ sentAt: 1 })
    .lean();

  // Mark thread as read
  thread.markAsRead(userId);
  await thread.save();

  res.status(200).json({
    success: true,
    data: {
      thread,
      messages,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/messages/threads
 * @desc    Create new message thread
 * @access  Private (Publisher)
 */
exports.createThread = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { applicationId, jobId, applicantId, subject } = req.body;

  // Check if thread already exists
  let thread = await MessageThread.findOne({ applicationId });

  if (thread) {
    return res.status(200).json({
      success: true,
      message: 'Thread already exists',
      data: {
        thread,
      },
    });
  }

  // Create new thread
  thread = await MessageThread.findOrCreateForApplication(
    applicationId,
    jobId,
    applicantId,
    publisherId
  );

  logger.info(`Thread ${thread._id} created for application ${applicationId}`);

  res.status(201).json({
    success: true,
    message: 'Thread created successfully',
    data: {
      thread,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/messages/threads/:id/messages
 * @desc    Send message in thread
 * @access  Private (Publisher/Applicant)
 */
exports.sendMessage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const senderId = req.user._id;
  const { content, contentAr, attachments, messageType = 'text' } = req.body;

  const thread = await MessageThread.findById(id);

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  // Verify user is participant
  if (!thread.isParticipant(senderId)) {
    throw new AppError('You do not have permission to send messages in this thread', 403);
  }

  // Create message
  const message = await Message.create({
    conversationId: id,
    senderId,
    senderRole: req.user.role,
    messageType,
    content,
    contentAr,
    attachments: attachments || [],
    sentAt: new Date(),
  });

  // Update thread last message
  thread.updateLastMessage({
    content,
    contentAr,
    senderId,
    senderName: `${req.user.firstName} ${req.user.lastName}`,
    sentAt: new Date(),
    type: messageType,
  });
  await thread.save();

  // Send notification to other participants
  const otherParticipants = thread.participants.filter(
    p => p.userId.toString() !== senderId.toString() && p.isActive
  );

  for (const participant of otherParticipants) {
    await Notification.createNotification({
      userId: participant.userId,
      userRole: participant.role,
      type: 'message_received',
      title: 'New Message',
      titleAr: 'رسالة جديدة',
      message: `${req.user.firstName} sent you a message`,
      messageAr: `${req.user.firstName} أرسل لك رسالة`,
      actionUrl: `/messages/${thread._id}`,
      relatedTo: {
        entityType: 'message',
        entityId: message._id,
      },
      priority: 'normal',
    });

    // Emit real-time notification
    if (global.io) {
      global.io.to(`user_${participant.userId}`).emit('new_message', {
        threadId: thread._id,
        message,
      });
    }
  }

  // TRIGGER AUTOMATION (New Message Received)
  // We fire this asynchronously
  const automationIntegration = require('../../job-publisher/integrations/automationIntegration');
  automationIntegration.onMessageReceived(message, thread).catch(err => {
    logger.error(`Failed to trigger automation for message ${message._id}`, err);
  });

  logger.info(`Message sent in thread ${id} by user ${senderId}`);

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: {
      message,
    },
  });
});

/**
 * @route   PATCH /api/v1/publisher/messages/threads/:id/messages/:messageId
 * @desc    Edit message
 * @access  Private (Sender only)
 */
exports.editMessage = catchAsync(async (req, res) => {
  const { id, messageId } = req.params;
  const userId = req.user._id;
  const { content } = req.body;

  const message = await Message.findOne({
    _id: messageId,
    conversationId: id,
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Edit message
  await message.editMessage(content, userId);

  logger.info(`Message ${messageId} edited by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Message updated successfully',
    data: {
      message,
    },
  });
});

/**
 * @route   DELETE /api/v1/publisher/messages/threads/:id/messages/:messageId
 * @desc    Delete message
 * @access  Private (Sender only)
 */
exports.deleteMessage = catchAsync(async (req, res) => {
  const { id, messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    conversationId: id,
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Soft delete message
  await message.softDelete(userId);

  logger.info(`Message ${messageId} deleted by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

/**
 * @route   PATCH /api/v1/publisher/messages/threads/:id/close
 * @desc    Close thread
 * @access  Private (Publisher)
 */
exports.closeThread = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const thread = await MessageThread.findById(id);

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  // Verify user is publisher (only publisher can close threads)
  const publisherParticipant = thread.participants.find(
    p => p.role === 'publisher' && p.userId.toString() === userId.toString()
  );

  if (!publisherParticipant) {
    throw new AppError('Only publisher can close threads', 403);
  }

  thread.close(userId, reason);
  await thread.save();

  logger.info(`Thread ${id} closed by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Thread closed successfully',
    data: {
      thread,
    },
  });
});

/**
 * @route   PATCH /api/v1/publisher/messages/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  await message.markAsRead(userId);

  res.status(200).json({
    success: true,
    message: 'Message marked as read',
  });
});

/**
 * @route   GET /api/v1/publisher/messages/templates
 * @desc    Get message templates
 * @access  Private (Publisher)
 */
exports.getTemplates = catchAsync(async (req, res) => {
  const templates = await NotificationTemplate.find({
    category: 'message',
    isActive: true,
  }).lean();

  res.status(200).json({
    success: true,
    data: {
      templates,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/messages/templates/:templateId/send
 * @desc    Send message using template
 * @access  Private (Publisher)
 */
exports.sendTemplateMessage = catchAsync(async (req, res) => {
  const { templateId } = req.params;
  const senderId = req.user._id;
  const { threadId, variables } = req.body;

  const template = await NotificationTemplate.findById(templateId);

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  const thread = await MessageThread.findById(threadId);

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  // Verify user is participant
  if (!thread.isParticipant(senderId)) {
    throw new AppError('You do not have permission to send messages in this thread', 403);
  }

  // Render template
  const rendered = template.render('inApp', variables);

  if (!rendered) {
    throw new AppError('Failed to render template', 500);
  }

  // Create message
  const message = await Message.create({
    conversationId: threadId,
    senderId,
    senderRole: req.user.role,
    messageType: 'template',
    content: rendered.body,
    sentAt: new Date(),
  });

  // Update thread last message
  thread.updateLastMessage({
    content: rendered.body,
    senderId,
    senderName: `${req.user.firstName} ${req.user.lastName}`,
    sentAt: new Date(),
    type: 'template',
  });
  await thread.save();

  logger.info(`Template message sent in thread ${threadId} by user ${senderId}`);

  res.status(201).json({
    success: true,
    message: 'Template message sent successfully',
    data: {
      message,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await MessageThread.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
    },
  });
});

module.exports = exports;
