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


