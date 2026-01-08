const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const JobApplication = require('../../club/models/JobApplication');
const Notification = require('../../notifications/models/Notification');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const logger = require('../../../utils/logger');

/**
 * @route   POST /api/v1/messages/conversation/:applicationId
 * @desc    Start or get conversation for an application
 * @access  Private
 */
exports.startOrGetConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { applicationId } = req.params;
  const { subject = 'Job Application Discussion' } = req.body;

  // Get application
  const application = await JobApplication.findById(applicationId)
    .populate('jobId')
    .populate('applicantId');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
      messageAr: 'الطلب غير موجود'
    });
  }

  // Check if user is either publisher or applicant
  const isApplicant = application.applicantId._id.toString() === userId.toString();
  const isPublisher = application.jobId.publishedBy.toString() === userId.toString();

  if (!isApplicant && !isPublisher) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({ applicationId });

  if (!conversation) {
    // Create new conversation
    conversation = await Conversation.createConversation(
      applicationId,
      application.jobId._id,
      application.jobId.publishedBy,
      application.applicantId._id,
      subject
    );

    logger.info(`✅ Conversation created for application ${applicationId}`);
  }

  await conversation.populate('participants.userId', 'firstName lastName avatar email');

  res.status(200).json({
    success: true,
    conversation
  });
});

/**
 * @route   GET /api/v1/messages/conversation/:conversationId
 * @desc    Get conversation with messages
 * @access  Private
 */
exports.getConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
      messageAr: 'المحادثة غير موجودة'
    });
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.userId.toString() === userId.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  // Get messages
  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('senderId', 'firstName lastName avatar')
      .populate('readBy.userId', 'firstName lastName')
      .lean(),
    Message.countDocuments({ conversationId })
  ]);

  // Mark conversation as read for this user
  await conversation.markAsRead(userId);

  await conversation.populate('participants.userId', 'firstName lastName avatar');

  res.status(200).json({
    success: true,
    conversation,
    messages: messages.reverse(),
    pagination: {
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
});

/**
 * @route   POST /api/v1/messages/send
 * @desc    Send a message
 * @access  Private
 */
exports.sendMessage = catchAsync(async (req, res) => {
  const senderId = req.user._id;
  const { conversationId, content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
      messageAr: 'محتوى الرسالة مطلوب'
    });
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
      messageAr: 'المحادثة غير موجودة'
    });
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.userId.toString() === senderId.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  // Create message
  const message = new Message({
    conversationId,
    senderId,
    content: content.trim()
  });

  await message.save();

  // Update conversation last message
  await conversation.updateLastMessage(content, senderId);

  // Notify other participants
  for (const participant of conversation.participants) {
    if (participant.userId.toString() !== senderId.toString()) {
      // Increment unread count
      await conversation.incrementUnread(participant.userId);

      // Create notification
      try {
        const sender = await User.findById(senderId);
        await Notification.createNotification(
          participant.userId,
          'message_received',
          'رسالة جديدة من ' + (sender?.firstName || 'مستخدم'),
          content.substring(0, 100),
          {
            entityType: 'message',
            entityId: message._id
          },
          {
            messagePreview: content.substring(0, 100),
            conversationId: conversationId.toString(),
            senderName: sender?.firstName || 'Unknown'
          }
        );
      } catch (notifError) {
        logger.error('Error creating notification:', notifError);
      }
    }
  }

  logger.info(`✅ Message sent in conversation ${conversationId} by ${senderId}`);

  await message.populate('senderId', 'firstName lastName avatar');

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    messageAr: 'تم إرسال الرسالة بنجاح',
    message: message
  });
});

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for user
 * @access  Private
 */
exports.getConversations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { limit = 20, skip = 0, status = 'active' } = req.query;

  const query = {
    'participants.userId': userId
  };

  if (status !== 'all') {
    query.status = status;
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(query)
      .sort('-lastMessageAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('participants.userId', 'firstName lastName avatar')
      .lean(),
    Conversation.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    conversations,
    pagination: {
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
});

/**
 * @route   PUT /api/v1/messages/:messageId
 * @desc    Edit a message
 * @access  Private
 */
exports.editMessage = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
      messageAr: 'محتوى الرسالة مطلوب'
    });
  }

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found',
      messageAr: 'الرسالة غير موجودة'
    });
  }

  // Check if user is sender
  if (message.senderId.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  await message.edit(content.trim());

  logger.info(`✅ Message edited: ${messageId}`);

  res.status(200).json({
    success: true,
    message: 'Message updated successfully',
    messageAr: 'تم تحديث الرسالة بنجاح',
    message
  });
});

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
exports.deleteMessage = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found',
      messageAr: 'الرسالة غير موجودة'
    });
  }

  // Check if user is sender
  if (message.senderId.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  await message.softDelete();

  logger.info(`✅ Message deleted: ${messageId}`);

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
    messageAr: 'تم حذف الرسالة بنجاح'
  });
});

/**
 * @route   PUT /api/v1/messages/conversation/:conversationId/schedule-interview
 * @desc    Schedule interview for application
 * @access  Private (job-publisher)
 */
exports.scheduleInterview = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;
  const { scheduledDate, scheduledTime, location, meetingLink } = req.body;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found',
      messageAr: 'المحادثة غير موجودة'
    });
  }

  // Check if user is publisher
  const publisherParticipant = conversation.participants.find(
    p => p.role === 'publisher' && p.userId.toString() === userId.toString()
  );

  if (!publisherParticipant) {
    return res.status(403).json({
      success: false,
      message: 'Only job publisher can schedule interviews',
      messageAr: 'فقط ناشر الوظيفة يمكنه جدولة المقابلات'
    });
  }

  conversation.interviewDetails = {
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    location,
    meetingLink,
    interviewStatus: 'scheduled'
  };

  await conversation.save();

  // Notify applicant
  const applicantId = conversation.participants.find(p => p.role === 'applicant').userId;
  try {
    await Notification.createNotification(
      applicantId,
      'interview_scheduled',
      'تم جدولة مقابلتك',
      `تم جدولة مقابلتك في ${scheduledDate} الساعة ${scheduledTime}`,
      {
        entityType: 'conversation',
        entityId: conversationId
      },
      {
        scheduledDate,
        scheduledTime,
        location,
        meetingLink
      },
      'high'
    );
  } catch (error) {
    logger.error('Error creating interview notification:', error);
  }

  logger.info(`✅ Interview scheduled for conversation ${conversationId}`);

  res.status(200).json({
    success: true,
    message: 'Interview scheduled successfully',
    messageAr: 'تم جدولة المقابلة بنجاح',
    conversation
  });
});
