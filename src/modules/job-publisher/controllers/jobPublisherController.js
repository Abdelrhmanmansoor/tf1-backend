const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const User = require('../../shared/models/User');
const { catchAsync } = require('../../../utils/catchAsync');
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

  application.addStatusHistory(status, publisherId, notes || `Status changed to ${status}`);
  await application.save();

  logger.info(`Application ${applicationId} status updated to ${status} by publisher ${publisherId}`);

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    data: application
  });
});

