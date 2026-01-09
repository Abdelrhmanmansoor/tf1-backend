const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/job-publisher/dashboard
 * @desc    Get job publisher dashboard data
 * @access  Private (job-publisher)
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const publisherId = req.user._id;

  // Get publisher's jobs
  const jobs = await Job.find({ 
    publishedBy: publisherId,
    isDeleted: false 
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Get statistics
  const jobIds = jobs.map(job => job._id);
  
  const stats = {
    totalJobs: await Job.countDocuments({ publishedBy: publisherId, isDeleted: false }),
    activeJobs: await Job.countDocuments({ publishedBy: publisherId, status: 'active', isDeleted: false }),
    draftJobs: await Job.countDocuments({ publishedBy: publisherId, status: 'draft', isDeleted: false }),
    closedJobs: await Job.countDocuments({ publishedBy: publisherId, status: 'closed', isDeleted: false }),
    totalApplications: await JobApplication.countDocuments({ 
      jobId: { $in: jobIds },
      isDeleted: false 
    }),
    newApplications: await JobApplication.countDocuments({ 
      jobId: { $in: jobIds },
      status: 'new',
      isDeleted: false 
    }),
    underReviewApplications: await JobApplication.countDocuments({ 
      jobId: { $in: jobIds },
      status: 'under_review',
      isDeleted: false 
    })
  };

  // Get recent applications
  const recentApplications = await JobApplication.find({
    jobId: { $in: jobIds },
    isDeleted: false
  })
    .populate('jobId', 'title sport category')
    .populate('applicantId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      stats,
      recentJobs: jobs,
      recentApplications
    }
  });
});

/**
 * @route   GET /api/v1/job-publisher/jobs
 * @desc    Get all jobs published by user
 * @access  Private (job-publisher)
 */
exports.getMyJobs = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { publishedBy: publisherId, isDeleted: false };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Job.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * @route   POST /api/v1/job-publisher/jobs
 * @desc    Create a new job posting
 * @access  Private (job-publisher)
 */
exports.createJob = catchAsync(async (req, res) => {
  const publisherId = req.user._id;
  const jobData = req.body;

  // Set publisher and postedBy
  jobData.publishedBy = publisherId;
  jobData.postedBy = publisherId;
  
  // If clubId is not provided, set it to publisherId (for job-publisher role)
  if (!jobData.clubId) {
    jobData.clubId = publisherId;
  }

  // Create job
  const job = await Job.create(jobData);

  logger.info(`Job ${job._id} created by publisher ${publisherId}`);

  // Send notification to potential applicants (if job is active)
  if (job.status === 'active') {
    try {
      const { saveNotification } = require('../../../middleware/notificationHandler');
      const User = require('../../shared/models/User');
      
      // Get all applicants who might be interested
      const applicants = await User.find({ role: 'applicant' }).select('_id').limit(100); // Limit to avoid overwhelming
      
      // Create notifications for applicants (in batches)
      const batchSize = 50;
      let notifiedCount = 0;
      for (let i = 0; i < applicants.length; i += batchSize) {
        const batch = applicants.slice(i, i + batchSize);
        await Promise.all(batch.map(async (applicant) => {
          try {
            await saveNotification({
              userId: applicant._id,
              userRole: 'applicant',
              type: 'new_job',
              title: 'New Job Opportunity',
              titleAr: 'فرصة وظيفية جديدة',
              message: `A new job "${job.title}" has been posted. Apply now!`,
              messageAr: `تم نشر وظيفة جديدة "${job.titleAr || job.title}". تقدم الآن!`,
              relatedTo: {
                entityType: 'job',
                entityId: job._id
              },
              actionUrl: `/jobs/${job._id}`,
              priority: 'normal'
            });
            notifiedCount++;
          } catch (err) {
            // Silent fail for individual notifications
            logger.error(`Failed to notify applicant ${applicant._id}:`, err);
          }
        }));
      }
      
      if (notifiedCount > 0) {
        logger.info(`Notifications sent to ${notifiedCount} applicants for new job ${job._id}`);
      }
    } catch (notifError) {
      logger.error('Error sending job notifications:', notifError);
      // Don't fail the request if notification fails
    }
  }

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: job
  });
});

/**
 * @route   PUT /api/v1/job-publisher/jobs/:jobId
 * @desc    Update a job posting
 * @access  Private (job-publisher)
 */
exports.updateJob = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const publisherId = req.user._id;
  const updateData = req.body;

  const job = await Job.findOne({
    _id: jobId,
    publishedBy: publisherId,
    isDeleted: false
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  Object.assign(job, updateData);
  await job.save();

  logger.info(`Job ${jobId} updated by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Job updated successfully',
    data: job
  });
});

/**
 * @route   DELETE /api/v1/job-publisher/jobs/:jobId
 * @desc    Delete a job posting
 * @access  Private (job-publisher)
 */
exports.deleteJob = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const publisherId = req.user._id;

  const job = await Job.findOne({
    _id: jobId,
    publishedBy: publisherId,
    isDeleted: false
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Soft delete
  job.isDeleted = true;
  await job.save();

  logger.info(`Job ${jobId} deleted by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Job deleted successfully'
  });
});

/**
 * @route   GET /api/v1/job-publisher/jobs/:jobId/applications
 * @desc    Get applications for a specific job
 * @access  Private (job-publisher)
 */
exports.getJobApplications = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const publisherId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  // Verify job belongs to publisher
  const job = await Job.findOne({
    _id: jobId,
    publishedBy: publisherId,
    isDeleted: false
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const query = { jobId, isDeleted: false };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .populate('applicantId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    JobApplication.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * @route   PUT /api/v1/job-publisher/applications/:applicationId/status
 * @desc    Update application status
 * @access  Private (job-publisher)
 */
exports.updateApplicationStatus = catchAsync(async (req, res) => {
  const { applicationId } = req.params;
  const publisherId = req.user._id;
  const { status, notes } = req.body;

  const application = await JobApplication.findById(applicationId)
    .populate('jobId');

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  // Verify job belongs to publisher
  if (application.jobId.publishedBy.toString() !== publisherId.toString()) {
    throw new AppError('Access denied. This application does not belong to your jobs.', 403);
  }

  const validStatuses = ['new', 'under_review', 'interviewed', 'offered', 'rejected', 'hired'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const previousStatus = application.status;
  application.status = status;
  application.addStatusHistory(status, publisherId, notes || `Status changed to ${status}`);
  await application.save();

  // Send notification to applicant
  try {
    const { saveNotification } = require('../../../middleware/notificationHandler');
    const User = require('../../shared/models/User');
    const applicant = await User.findById(application.applicantId).select('firstName lastName role');
    const job = application.jobId;

    const statusMessages = {
      'under_review': {
        title: 'Application Under Review',
        titleAr: 'طلبك قيد المراجعة',
        message: `Your application for ${job.title} is now under review.`,
        messageAr: `طلبك لوظيفة ${job.titleAr || job.title} قيد المراجعة الآن.`
      },
      'interviewed': {
        title: 'Interview Scheduled',
        titleAr: 'تم تحديد موعد المقابلة',
        message: `An interview has been scheduled for your application to ${job.title}.`,
        messageAr: `تم تحديد موعد مقابلة لطلبك على وظيفة ${job.titleAr || job.title}.`
      },
      'offered': {
        title: 'Job Offer Received!',
        titleAr: 'تم قبول طلبك!',
        message: `Congratulations! You have received a job offer for ${job.title}.`,
        messageAr: `مبروك! لقد تم قبول طلبك لوظيفة ${job.titleAr || job.title}.`
      },
      'hired': {
        title: 'You are Hired!',
        titleAr: 'تم توظيفك!',
        message: `Congratulations! You have been hired for ${job.title}.`,
        messageAr: `تهانينا! تم توظيفك لوظيفة ${job.titleAr || job.title}.`
      },
      'rejected': {
        title: 'Application Status Update',
        titleAr: 'تحديث حالة الطلب',
        message: `Thank you for your interest in ${job.title}. Unfortunately, we have decided to move forward with other candidates.`,
        messageAr: `شكراً لاهتمامك بوظيفة ${job.titleAr || job.title}. للأسف تم اختيار مرشحين آخرين.`
      }
    };

    // Create conversation if status is interviewed
    if (status === 'interviewed') {
      try {
        const Conversation = require('../../../models/Conversation');
        const conversation = await Conversation.findOrCreateDirectConversation(
          publisherId,
          application.applicantId,
          'club', // Publisher acts as club/employer
          applicant?.role || 'applicant'
        );

        // Send system message in conversation
        const Message = require('../../../models/Message');
        await Message.create({
          conversationId: conversation._id,
          senderId: publisherId,
          content: `Hello ${applicant.firstName}, we would like to schedule an interview for the ${job.title} position.`,
          messageType: 'text',
          readBy: [{ userId: publisherId, readAt: new Date() }]
        });
        
        // Notify about new message via socket
        const io = req.app.get('io');
        if (io) {
          io.to(application.applicantId.toString()).emit('new_message', {
            conversationId: conversation._id,
            // ... message data
          });
        }
        
        logger.info(`Conversation created/retrieved for interview between ${publisherId} and ${application.applicantId}`);
      } catch (chatError) {
        logger.error('Error creating interview conversation:', chatError);
      }
    }

    const notifData = statusMessages[status];
    if (notifData) {
      const { notification, source } = await saveNotification({
        userId: application.applicantId,
        userRole: applicant?.role || 'applicant',
        type: `application_${status}`,
        title: notifData.title,
        titleAr: notifData.titleAr,
        message: notifData.message,
        messageAr: notifData.messageAr,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/dashboard/applicant/applications/${application._id}`,
        priority: status === 'offered' || status === 'hired' ? 'high' : 'normal'
      });

      logger.info(`Notification saved to ${source} for applicant ${application.applicantId}`);

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId.toString()).emit('new_notification', {
          _id: notification._id,
          type: `application_${status}`,
          notificationType: `application_${status}`,
          applicationId: application._id,
          jobId: job._id,
          jobTitle: job.title,
          previousStatus,
          newStatus: status,
          title: notifData.title,
          titleAr: notifData.titleAr,
          message: notifData.message,
          messageAr: notifData.messageAr,
          actionUrl: `/dashboard/applicant/applications/${application._id}`,
          priority: status === 'offered' || status === 'hired' ? 'high' : 'normal',
          isRead: false,
          createdAt: notification.createdAt
        });
        logger.info(`Real-time notification sent to applicant ${application.applicantId}`);
      }
    }
  } catch (notifError) {
    logger.error('Error sending status notification:', notifError);
    // Don't fail the request if notification fails
  }

  logger.info(`Application ${applicationId} status updated to ${status} by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    data: application
  });
});

