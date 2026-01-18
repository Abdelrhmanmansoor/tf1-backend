const Interview = require('../models/Interview');
const JobApplication = require('../../club/models/JobApplication');
const Job = require('../../club/models/Job');
const User = require('../../shared/models/User');
const MessageThread = require('../../messaging/models/MessageThread');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const interviewService = require('../services/interviewService');
const notificationService = require('../services/interviewNotificationService');

/**
 * @route   POST /api/v1/publisher/interviews
 * @desc    Schedule a new interview
 * @access  Private (Publisher)
 */
exports.scheduleInterview = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const {
    applicationId,
    type,
    scheduledAt,
    duration,
    timezone,
    location,
    interviewers,
    instructionsForApplicant,
    instructionsForApplicantAr,
    preparationMaterials,
    notes,
    meetingPlatform,
  } = req.body;

  // Validate application
  const application = await JobApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  }).populate('jobId applicantId');

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Verify publisher owns this job
  const job = await Job.findOne({
    _id: application.jobId,
    publishedBy: publisherId,
    isDeleted: false,
  });

  if (!job) {
    throw new AppError('You do not have permission to schedule interviews for this job', 403);
  }

  // Create interview data
  const interviewData = {
    jobId: application.jobId._id,
    applicationId: application._id,
    applicantId: application.applicantId._id,
    publisherId,
    type,
    scheduledAt: new Date(scheduledAt),
    duration: duration || 60,
    timezone: timezone || 'Asia/Riyadh',
    status: 'scheduled',
    instructionsForApplicant,
    instructionsForApplicantAr,
    preparationMaterials,
    notes,
    createdBy: publisherId,
    interviewers: interviewers || [],
  };

  // Handle online interview
  if (type === 'online') {
    interviewData.meetingPlatform = meetingPlatform || 'internal';

    if (meetingPlatform === 'internal') {
      // Generate internal meeting link
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const token = Interview.generateMeetingToken();
      interviewData.meetingToken = token;
      interviewData.meetingUrl = `${baseUrl}/interview/${token}`;
    } else {
      // External platform - URL should be provided
      interviewData.meetingUrl = req.body.meetingUrl;
      interviewData.meetingId = req.body.meetingId;
      interviewData.meetingPassword = req.body.meetingPassword;
    }
  }

  // Handle onsite interview
  if (type === 'onsite') {
    interviewData.location = location;
  }

  // Quick access data
  interviewData.jobData = {
    title: application.jobId.title,
    titleAr: application.jobId.titleAr,
    position: application.jobId.position || application.jobId.title,
    companyName: req.user.companyName,
  };

  interviewData.applicantData = {
    name: `${application.applicantId.firstName} ${application.applicantId.lastName}`,
    email: application.applicantId.email,
    phone: application.applicantId.phone,
    avatar: application.applicantId.avatar,
  };

  // Create interview
  const interview = await Interview.create(interviewData);

  // Schedule reminders
  interview.scheduleReminders();
  await interview.save();

  // Create or find message thread
  const thread = await MessageThread.findOrCreateForApplication(
    applicationId,
    application.jobId._id,
    application.applicantId._id,
    publisherId
  );

  interview.messageThreadId = thread._id;
  await interview.save();

  // Send interview invitation through multiple channels
  await notificationService.sendInterviewInvitation(interview);

  // Update application status to 'interview'
  application.status = 'interview';
  await application.save();

  logger.info(`Interview ${interview._id} scheduled by publisher ${publisherId}`);

  res.status(201).json({
    success: true,
    message: 'Interview scheduled successfully',
    data: {
      interview,
      thread,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/interviews
 * @desc    Get interviews for publisher
 * @access  Private (Publisher)
 */
exports.getInterviews = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const {
    page = 1,
    limit = 20,
    status,
    type,
    startDate,
    endDate,
    jobId,
    applicantId,
  } = req.query;

  const query = {
    publisherId,
  };

  if (status) query.status = status;
  if (type) query.type = type;
  if (jobId) query.jobId = jobId;
  if (applicantId) query.applicantId = applicantId;

  if (startDate || endDate) {
    query.scheduledAt = {};
    if (startDate) query.scheduledAt.$gte = new Date(startDate);
    if (endDate) query.scheduledAt.$lte = new Date(endDate);
  }

  const interviews = await Interview.find(query)
    .populate('applicantId', 'firstName lastName email phone avatar')
    .populate('jobId', 'title titleAr sport category')
    .sort({ scheduledAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await Interview.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      interviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * @route   GET /api/v1/publisher/interviews/:id
 * @desc    Get single interview details
 * @access  Private (Publisher/Applicant)
 */
exports.getInterview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const interview = await Interview.findById(id)
    .populate('applicantId', 'firstName lastName email phone avatar')
    .populate('jobId', 'title titleAr sport category description')
    .populate('publisherId', 'firstName lastName companyName email phone')
    .populate('messageThreadId');

  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  // Verify access (publisher or applicant)
  const isPublisher = interview.publisherId._id.toString() === userId.toString();
  const isApplicant = interview.applicantId._id.toString() === userId.toString();

  if (!isPublisher && !isApplicant) {
    throw new AppError('You do not have permission to view this interview', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      interview,
    },
  });
});

/**
 * @route   PATCH /api/v1/publisher/interviews/:id
 * @desc    Update interview details
 * @access  Private (Publisher)
 */
exports.updateInterview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;
  const updateData = req.body;

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  });

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  // Update allowed fields
  const allowedFields = [
    'duration',
    'timezone',
    'location',
    'interviewers',
    'instructionsForApplicant',
    'instructionsForApplicantAr',
    'preparationMaterials',
    'notes',
    'meetingUrl',
    'meetingId',
    'meetingPassword',
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      interview[field] = updateData[field];
    }
  });

  interview.updatedBy = publisherId;
  await interview.save();

  logger.info(`Interview ${id} updated by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Interview updated successfully',
    data: {
      interview,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/interviews/:id/reschedule
 * @desc    Reschedule interview
 * @access  Private (Publisher)
 */
exports.rescheduleInterview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;
  const { newDate, reason } = req.body;

  if (!newDate) {
    throw new AppError('New date is required', 400);
  }

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  });

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  if (interview.status === 'completed' || interview.status === 'cancelled') {
    throw new AppError(`Cannot reschedule ${interview.status} interview`, 400);
  }

  // Reschedule
  interview.reschedule(new Date(newDate), publisherId, reason);
  await interview.save();

  // Send rescheduling notification
  await notificationService.sendInterviewRescheduled(interview);

  logger.info(`Interview ${id} rescheduled by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Interview rescheduled successfully',
    data: {
      interview,
    },
  });
});

/**
 * @route   DELETE /api/v1/publisher/interviews/:id/cancel
 * @desc    Cancel interview
 * @access  Private (Publisher)
 */
exports.cancelInterview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;
  const { reason } = req.body;

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  });

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  if (interview.status === 'completed') {
    throw new AppError('Cannot cancel completed interview', 400);
  }

  if (interview.status === 'cancelled') {
    throw new AppError('Interview is already cancelled', 400);
  }

  // Cancel
  interview.cancel(publisherId, reason);
  await interview.save();

  // Send cancellation notification
  await notificationService.sendInterviewCancelled(interview);

  // TRIGGER AUTOMATION
  const automationIntegration = require('../../job-publisher/integrations/automationIntegration');
  automationIntegration.onInterviewCancelled(interview, reason).catch(err => {
    logger.error(`Failed to trigger automation for interview cancel ${id}`, err);
  });

  logger.info(`Interview ${id} cancelled by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Interview cancelled successfully',
    data: {
      interview,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/interviews/:id/complete
 * @desc    Mark interview as completed
 * @access  Private (Publisher)
 */
exports.completeInterview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  });

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  if (interview.status === 'cancelled') {
    throw new AppError('Cannot complete cancelled interview', 400);
  }

  interview.complete();
  await interview.save();

  logger.info(`Interview ${id} marked as completed by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Interview marked as completed',
    data: {
      interview,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/interviews/:id/feedback
 * @desc    Submit interview feedback
 * @access  Private (Publisher/Interviewer)
 */
exports.submitFeedback = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const feedbackData = req.body;

  const interview = await Interview.findById(id);

  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  // Verify user is publisher or interviewer
  const isPublisher = interview.publisherId.toString() === userId.toString();
  const isInterviewer = interview.interviewers.some(
    i => i.userId && i.userId.toString() === userId.toString()
  );

  if (!isPublisher && !isInterviewer) {
    throw new AppError('You do not have permission to submit feedback', 403);
  }

  interview.addFeedback(feedbackData, userId);
  await interview.save();

  // TRIGGER AUTOMATION
  const automationIntegration = require('../../job-publisher/integrations/automationIntegration');
  automationIntegration.onFeedbackSubmitted(interview, feedbackData).catch(err => {
    logger.error(`Failed to trigger automation for feedback ${id}`, err);
  });

  logger.info(`Feedback submitted for interview ${id} by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: {
      feedback: interview.feedback,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/interviews/:id/reminders
 * @desc    Get interview reminders
 * @access  Private (Publisher)
 */
exports.getReminders = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  });

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      reminders: interview.reminders,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/interviews/:id/reminders/send
 * @desc    Send interview reminder manually
 * @access  Private (Publisher)
 */
exports.sendReminder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;

  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  }).populate('applicantId jobId');

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  // Send reminder
  await notificationService.sendInterviewReminder(interview);

  logger.info(`Manual reminder sent for interview ${id} by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Reminder sent successfully',
  });
});

/**
 * @route   GET /api/v1/publisher/interviews/token/:token
 * @desc    Join interview by token (Public - for applicants)
 * @access  Public (with valid token)
 */
exports.joinInterviewByToken = catchAsync(async (req, res) => {
  const { token } = req.params;

  const interview = await Interview.findByToken(token);

  if (!interview) {
    throw new AppError('Invalid or expired interview link', 404);
  }

  // Check if interview is still valid
  if (interview.status === 'cancelled') {
    throw new AppError('This interview has been cancelled', 400);
  }

  // Check if interview time has passed significantly
  const now = new Date();
  const interviewEnd = new Date(interview.scheduledAt.getTime() + interview.duration * 60000);

  if (now > interviewEnd) {
    throw new AppError('This interview has ended', 400);
  }

  // Record join time if applicant
  if (req.user && req.user._id.toString() === interview.applicantId._id.toString()) {
    if (!interview.applicantJoinedAt) {
      interview.applicantJoinedAt = new Date();
      await interview.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      interview,
    },
  });
});

/**
 * @route   GET /api/v1/publisher/interviews/statistics
 * @desc    Get interview statistics
 * @access  Private (Publisher)
 */
exports.getStatistics = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { startDate, endDate } = req.query;

  const stats = await Interview.getStatistics(publisherId, { startDate, endDate });

  // Get upcoming interviews
  const upcomingResult = await Interview.getUpcomingInterviews(publisherId, { limit: 5 });

  res.status(200).json({
    success: true,
    data: {
      statistics: stats,
      upcomingInterviews: upcomingResult.interviews,
    },
  });
});

/**
 * @route   POST /api/v1/publisher/interviews/:id/notify
 * @desc    Send notification to applicant (email, SMS, WhatsApp)
 * @access  Private (Publisher)
 */
exports.sendNotificationToApplicant = catchAsync(async (req, res) => {
  const { id } = req.params;
  const publisherId = req.user._id;
  const { notificationType, channels, customMessage, customMessageAr, language = 'ar' } = req.body;

  // Validate request
  if (!notificationType) {
    throw new AppError('Notification type is required', 400);
  }
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    throw new AppError('At least one delivery channel is required', 400);
  }

  // Validate channels
  const validChannels = ['email', 'sms', 'whatsapp'];
  const invalidChannels = channels.filter(c => !validChannels.includes(c));
  if (invalidChannels.length > 0) {
    throw new AppError(`Invalid channels: ${invalidChannels.join(', ')}`, 400);
  }

  // Find interview
  const interview = await Interview.findOne({
    _id: id,
    publisherId,
  }).populate('applicantId', 'firstName lastName email phone')
    .populate('jobId', 'title titleAr');

  if (!interview) {
    throw new AppError('Interview not found or you do not have permission', 404);
  }

  // Get applicant data
  const applicant = interview.applicantId;
  const job = interview.jobId;

  if (!applicant) {
    throw new AppError('Applicant not found', 404);
  }

  // Prepare notification content based on type
  const notificationTemplates = {
    acceptance: {
      title: 'Congratulations! You have been accepted',
      titleAr: 'تهانينا! تم قبولك',
      message: `We are pleased to inform you that you have been accepted for the position of ${job.title}.`,
      messageAr: `يسعدنا إبلاغك بأنه تم قبولك لوظيفة ${job.titleAr || job.title}.`
    },
    rejection: {
      title: 'Application Status Update',
      titleAr: 'تحديث حالة الطلب',
      message: `Thank you for your interest in the ${job.title} position. Unfortunately, we have decided to move forward with other candidates.`,
      messageAr: `شكراً لاهتمامك بوظيفة ${job.titleAr || job.title}. للأسف، قررنا المضي قدماً مع مرشحين آخرين.`
    },
    shortlist: {
      title: 'You have been shortlisted!',
      titleAr: 'تم إضافتك للقائمة المختصرة!',
      message: `Great news! You have been shortlisted for the ${job.title} position. We will contact you soon with next steps.`,
      messageAr: `أخبار سارة! تمت إضافتك للقائمة المختصرة لوظيفة ${job.titleAr || job.title}. سنتواصل معك قريباً بالخطوات التالية.`
    },
    interview_reminder: {
      title: 'Interview Reminder',
      titleAr: 'تذكير بالمقابلة',
      message: `This is a reminder for your upcoming interview for the ${job.title} position on ${new Date(interview.scheduledAt).toLocaleDateString('en-US')}.`,
      messageAr: `هذا تذكير بمقابلتك القادمة لوظيفة ${job.titleAr || job.title} في ${new Date(interview.scheduledAt).toLocaleDateString('ar-SA')}.`
    },
    custom: {
      title: 'Message from ' + (req.user.companyName || 'Employer'),
      titleAr: 'رسالة من ' + (req.user.companyName || 'صاحب العمل'),
      message: customMessage || '',
      messageAr: customMessageAr || customMessage || ''
    }
  };

  const template = notificationTemplates[notificationType];
  if (!template) {
    throw new AppError('Invalid notification type', 400);
  }

  // If custom type but no message provided
  if (notificationType === 'custom' && !customMessage) {
    throw new AppError('Custom message is required for custom notification type', 400);
  }

  // Delivery results
  const deliveryResults = {};

  // Get services
  const emailService = require('../../../utils/email');
  const authenticaService = require('../../../services/authenticaService');

  // Send via Email
  if (channels.includes('email')) {
    try {
      if (!applicant.email) {
        deliveryResults.email = { success: false, error: 'No email address available' };
      } else {
        const emailResult = await emailService.sendNotificationEmail({
          toEmail: applicant.email,
          toName: `${applicant.firstName} ${applicant.lastName}`,
          title: template.title,
          titleAr: template.titleAr,
          message: template.message,
          messageAr: template.messageAr
        });
        deliveryResults.email = { success: emailResult, messageId: Date.now().toString() };
      }
    } catch (emailError) {
      logger.error('Email notification failed:', emailError);
      deliveryResults.email = { success: false, error: emailError.message };
    }
  }

  // Send via SMS
  if (channels.includes('sms')) {
    try {
      if (!applicant.phone) {
        deliveryResults.sms = { success: false, error: 'No phone number available' };
      } else if (!authenticaService.isConfigured()) {
        deliveryResults.sms = { success: false, error: 'SMS service not configured' };
      } else {
        // Format phone for international
        let phone = applicant.phone;
        if (!phone.startsWith('+')) {
          phone = '+966' + phone.replace(/^0/, '');
        }

        // Use short message for SMS (max 160 chars)
        const smsMessage = language === 'ar' ? template.titleAr : template.title;
        const smsResult = await authenticaService.sendOTP(phone, 'sms', {
          templateId: 1
        });
        deliveryResults.sms = { success: smsResult.success, data: smsResult.data };
      }
    } catch (smsError) {
      logger.error('SMS notification failed:', smsError);
      deliveryResults.sms = { success: false, error: smsError.message };
    }
  }

  // Send via WhatsApp
  if (channels.includes('whatsapp')) {
    try {
      if (!applicant.phone) {
        deliveryResults.whatsapp = { success: false, error: 'No phone number available' };
      } else if (!authenticaService.isConfigured()) {
        deliveryResults.whatsapp = { success: false, error: 'WhatsApp service not configured' };
      } else {
        // Format phone for international
        let phone = applicant.phone;
        if (!phone.startsWith('+')) {
          phone = '+966' + phone.replace(/^0/, '');
        }

        const whatsappResult = await authenticaService.sendOTP(phone, 'whatsapp', {
          templateId: 8
        });
        deliveryResults.whatsapp = { success: whatsappResult.success, data: whatsappResult.data };
      }
    } catch (whatsappError) {
      logger.error('WhatsApp notification failed:', whatsappError);
      deliveryResults.whatsapp = { success: false, error: whatsappError.message };
    }
  }

  // Create in-app notification
  try {
    const Notification = require('../../notifications/models/Notification');
    await Notification.createNotification(
      applicant._id,
      'application_status_change',
      template.titleAr,
      template.messageAr,
      { entityType: 'interview', entityId: interview._id },
      { jobTitle: job.titleAr || job.title },
      'high'
    );
    deliveryResults.inApp = { success: true };
  } catch (notifError) {
    logger.error('In-app notification failed:', notifError);
    deliveryResults.inApp = { success: false, error: notifError.message };
  }

  // Check if any channel succeeded
  const anySuccess = Object.values(deliveryResults).some(r => r.success);

  logger.info(`Notification sent to applicant ${applicant._id} for interview ${id}`, {
    notificationType,
    channels,
    results: deliveryResults
  });

  res.status(anySuccess ? 200 : 500).json({
    success: anySuccess,
    message: anySuccess ? 'Notification sent successfully' : 'Failed to send notification',
    messageAr: anySuccess ? 'تم إرسال الإشعار بنجاح' : 'فشل في إرسال الإشعار',
    data: {
      deliveryResults,
      applicant: {
        name: `${applicant.firstName} ${applicant.lastName}`,
        email: applicant.email,
        phone: applicant.phone
      }
    }
  });
});

module.exports = exports;
