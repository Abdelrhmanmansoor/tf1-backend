const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const JobPublisherProfile = require('../models/JobPublisherProfile');
const ApplicationConversation = require('../../messaging/models/Conversation');
const ApplicationMessage = require('../../messaging/models/Message');
const Notification = require('../../notifications/models/Notification');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const logger = require('../../../utils/logger');
const { afterApplicationUpdate } = require('../integrations/automationIntegration');

/**
 * @route   PUT /api/v1/job-publisher/applications/:applicationId/status
 * @desc    Update application status with optional message
 * @access  Private (job-publisher)
 */
exports.updateApplicationStatus = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { applicationId } = req.params;
  const { status, message } = req.body;

  const validStatuses = ['new', 'under_review', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
      messageAr: 'الحالة غير صحيحة'
    });
  }

  const application = await JobApplication.findById(applicationId);
  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
      messageAr: 'الطلب غير موجود'
    });
  }

  const job = await Job.findById(application.jobId);
  if (job.publishedBy.toString() !== publisherId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  const oldStatus = application.status;
  application.status = status;
  await application.save();

  // Trigger automation after status update
  try {
    const automationIntegration = require('../integrations/automationIntegration');
    await automationIntegration.afterApplicationUpdate(application, oldStatus);
    logger.info(`✅ Automation triggered for application ${applicationId} status change`);
  } catch (automationError) {
    logger.error('Error triggering automation:', automationError);
    // Don't block the response if automation fails
  }

  // If status is 'interviewed', automatically create/get conversation
  let conversation = null;
  if (status === 'interviewed') {
    conversation = await ApplicationConversation.findOne({ applicationId });
    if (!conversation) {
      conversation = await ApplicationConversation.createConversation(
        applicationId,
        application.jobId,
        publisherId,
        application.applicantId,
        `مقابلة - ${job.title}`
      );
    }
  }

  // Send notification to applicant
  try {
    const notificationTitle = {
      'new': 'تم استقبال طلبك',
      'under_review': 'جاري مراجعة طلبك',
      'interviewed': 'تم اختيارك للمقابلة',
      'offered': 'تم تقديم عرض وظيفي لك',
      'accepted': 'تم قبول عرضك',
      'rejected': 'لم يتم قبول طلبك',
      'withdrawn': 'تم سحب طلبك',
      'hired': 'تم توظيفك بنجاح'
    };

    await Notification.createNotification(
      application.applicantId,
      `application_${status}`,
      notificationTitle[status] || 'تحديث حالة الطلب',
      message || `تم تحديث حالة طلبك إلى: ${status}`,
      {
        entityType: 'application',
        entityId: applicationId
      },
      {
        jobTitle: job.title,
        companyName: job.companyName,
        applicationStatus: status,
        messagePreview: (message || '').substring(0, 100)
      },
      status === 'offered' || status === 'hired' ? 'high' : 'normal'
    );

    logger.info(`✅ Status notification sent to applicant for application ${applicationId}`);
  } catch (notifError) {
    logger.error('Error sending status notification:', notifError);
  }

  // If message is provided, send it in the conversation
  if (message && message.trim()) {
    try {
      let conv = conversation;
      if (!conv) {
        conv = await ApplicationConversation.findOne({ applicationId });
        if (!conv) {
          conv = await ApplicationConversation.createConversation(
            applicationId,
            application.jobId,
            publisherId,
            application.applicantId,
            `مراسلات - ${job.title}`
          );
        }
      }

      const msg = new ApplicationMessage({
        conversationId: conv._id,
        senderId: publisherId,
        content: message.trim()
      });

      await msg.save();
      await conv.updateLastMessage(message.trim(), publisherId);
      await conv.incrementUnread(application.applicantId);

      logger.info(`✅ Message sent in conversation ${conv._id}`);
    } catch (msgError) {
      logger.error('Error sending message:', msgError);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    messageAr: 'تم تحديث حالة الطلب بنجاح',
    application,
    conversationId: conversation?._id
  });
});

/**
 * @route   GET /api/v1/job-publisher/applications
 * @desc    Get all applications for publisher's jobs
 * @access  Private (job-publisher)
 */
exports.getApplications = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { status, jobId, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  // Get all jobs published by this user
  const jobs = await Job.find({ publishedBy: publisherId, isDeleted: false }).select('_id');
  const jobIds = jobs.map(j => j._id);

  const query = { jobId: { $in: jobIds }, isDeleted: false };

  if (status) {
    query.status = status;
  }

  if (jobId) {
    query.jobId = jobId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .populate('jobId', 'title sport category status')
      .populate('applicantId', 'firstName lastName email phone avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    JobApplication.countDocuments(query)
  ]);

  // Group by status
  const grouped = {
    new: applications.filter(a => a.status === 'new').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    interviewed: applications.filter(a => a.status === 'interviewed').length,
    offered: applications.filter(a => a.status === 'offered').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    withdrawn: applications.filter(a => a.status === 'withdrawn').length,
    hired: applications.filter(a => a.status === 'hired').length
  };

  res.status(200).json({
    success: true,
    data: {
      applications,
      statistics: {
        totalApplications: total,
        ...grouped
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @route   GET /api/v1/job-publisher/jobs/:jobId/applications
 * @desc    Get applications for a specific job
 * @access  Private (job-publisher)
 */
exports.getJobApplications = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { jobId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const job = await Job.findById(jobId);

  if (!job || job.publishedBy.toString() !== publisherId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  const query = { jobId, isDeleted: false };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .populate('applicantId', 'firstName lastName email phone avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    JobApplication.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    job: {
      id: job._id,
      title: job.title,
      status: job.status
    },
    applications,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @route   GET /api/v1/job-publisher/dashboard/stats
 * @desc    Get detailed dashboard statistics
 * @access  Private (job-publisher)
 */
exports.getDashboardStats = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  // Get all jobs
  const jobs = await Job.find({ publishedBy: publisherId, isDeleted: false });
  const jobIds = jobs.map(j => j._id);

  // Jobs statistics
  const jobsStats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    draft: jobs.filter(j => j.status === 'draft').length,
    closed: jobs.filter(j => j.status === 'closed').length
  };

  // Applications statistics
  const applications = await JobApplication.find({
    jobId: { $in: jobIds },
    isDeleted: false
  });

  const applicationsStats = {
    total: applications.length,
    new: applications.filter(a => a.status === 'new').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    interviewed: applications.filter(a => a.status === 'interviewed').length,
    offered: applications.filter(a => a.status === 'offered').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    withdrawn: applications.filter(a => a.status === 'withdrawn').length,
    hired: applications.filter(a => a.status === 'hired').length
  };

  // Get profile info
  const profile = await JobPublisherProfile.findOne({ userId: publisherId });

  res.status(200).json({
    success: true,
    statistics: {
      jobs: jobsStats,
      applications: applicationsStats,
      profile: profile ? {
        companyName: profile.companyName,
        companyLogo: profile.companyLogo,
        profileComplete: profile.isProfileComplete,
        subscriptionStatus: profile.subscriptionStatus,
        ratings: profile.ratings
      } : null
    }
  });
});

/**
 * @route   GET /api/v1/job-publisher/applications/:applicationId
 * @desc    Get single application details
 * @access  Private (job-publisher)
 */
exports.getApplicationDetails = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { applicationId } = req.params;

  const application = await JobApplication.findById(applicationId)
    .populate('jobId')
    .populate('applicantId', 'firstName lastName email phone avatar');

  if (!application) {
    return res.status(404).json({
      success: false,
      message: 'Application not found',
      messageAr: 'الطلب غير موجود'
    });
  }

  const job = application.jobId;
  if (job.publishedBy.toString() !== publisherId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      messageAr: 'تم رفض الوصول'
    });
  }

  // Get conversation if exists
  const conversation = await ApplicationConversation.findOne({ applicationId });

  res.status(200).json({
    success: true,
    application,
    conversation: conversation ? {
      id: conversation._id,
      status: conversation.status,
      lastApplicationMessageAt: conversation.lastApplicationMessageAt
    } : null
  });
});

module.exports = exports;
