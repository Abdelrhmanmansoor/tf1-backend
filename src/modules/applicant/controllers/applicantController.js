const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * @route   GET /api/v1/applicant/dashboard
 * @desc    Get applicant dashboard data
 * @access  Private (applicant)
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const applicantId = req.user._id;

  // Get applicant's applications
  const applications = await JobApplication.find({ applicantId, isDeleted: false })
    .populate('jobId', 'title sport category status applicationDeadline')
    .populate('clubId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Get statistics
  const stats = {
    totalApplications: await JobApplication.countDocuments({ applicantId, isDeleted: false }),
    pending: await JobApplication.countDocuments({ applicantId, status: 'new', isDeleted: false }),
    underReview: await JobApplication.countDocuments({ applicantId, status: 'under_review', isDeleted: false }),
    interviewed: await JobApplication.countDocuments({ applicantId, status: 'interviewed', isDeleted: false }),
    offered: await JobApplication.countDocuments({ applicantId, status: 'offered', isDeleted: false }),
    accepted: await JobApplication.countDocuments({ applicantId, status: 'accepted', isDeleted: false }),
    rejected: await JobApplication.countDocuments({ applicantId, status: 'rejected', isDeleted: false })
  };

  // Get recommended jobs (active jobs not yet applied to)
  const appliedJobIds = await JobApplication.find({ applicantId, isDeleted: false })
    .distinct('jobId');

  const recommendedJobs = await Job.find({
    _id: { $nin: appliedJobIds },
    isDeleted: false,
    status: 'active'
  })
    .populate('clubId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      stats,
      recentApplications: applications,
      recommendedJobs
    }
  });
});

/**
 * @route   GET /api/v1/applicant/applications
 * @desc    Get all applicant's job applications
 * @access  Private (applicant)
 */
exports.getMyApplications = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { applicantId, isDeleted: false };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [applications, total] = await Promise.all([
    JobApplication.find(query)
      .populate('jobId', 'title sport category status applicationDeadline')
      .populate('clubId', 'firstName lastName')
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
 * @route   GET /api/v1/applicant/applications/:applicationId
 * @desc    Get specific application details
 * @access  Private (applicant)
 */
exports.getApplicationDetails = catchAsync(async (req, res) => {
  const { applicationId } = req.params;
  const applicantId = req.user._id;

  const application = await JobApplication.findOne({
    _id: applicationId,
    applicantId,
    isDeleted: false
  })
    .populate('jobId')
    .populate('clubId', 'firstName lastName email')
    .lean();

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  res.status(200).json({
    success: true,
    data: application
  });
});

/**
 * @route   PUT /api/v1/applicant/applications/:applicationId/withdraw
 * @desc    Withdraw a job application
 * @access  Private (applicant)
 */
exports.withdrawApplication = catchAsync(async (req, res) => {
  const { applicationId } = req.params;
  const applicantId = req.user._id;
  const { reason } = req.body;

  const application = await JobApplication.findOne({
    _id: applicationId,
    applicantId,
    isDeleted: false
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (application.status === 'withdrawn') {
    throw new AppError('Application already withdrawn', 400);
  }

  if (['hired', 'accepted'].includes(application.status)) {
    throw new AppError('Cannot withdraw accepted or hired application', 400);
  }

  await application.withdraw(reason || 'Withdrawn by applicant');

  logger.info(`Application ${applicationId} withdrawn by applicant ${applicantId}`);

  res.status(200).json({
    success: true,
    message: 'Application withdrawn successfully',
    data: application
  });
});

/**
 * @route   GET /api/v1/applicant/jobs
 * @desc    Get available jobs for applicant
 * @access  Private (applicant)
 */
exports.getAvailableJobs = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
  const { 
    page = 1, 
    limit = 20,
    region,
    city,
    sport,
    jobType,
    category
  } = req.query;

  // Get jobs user has already applied to
  const appliedJobIds = await JobApplication.find({ applicantId, isDeleted: false })
    .distinct('jobId');

  const query = { 
    _id: { $nin: appliedJobIds },
    isDeleted: false,
    status: 'active'
  };

  if (region) query['requirements.location.region'] = region;
  if (city) query['requirements.location.city'] = city;
  if (sport) query.sport = sport;
  if (jobType) query.jobType = jobType;
  if (category) query.category = category;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('clubId', 'firstName lastName')
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

