const express = require('express');
const router = express.Router();
const jobPublisherController = require('../controllers/jobPublisherController');
const applicationController = require('../controllers/applicationController');
const profileRoutes = require('./profileRoutes');
const { authenticate } = require('../../../middleware/auth');
const { authenticatedRateLimiter } = require('../../../middleware/rateLimiter');
const subscriptionCheck = require('../../../middleware/subscriptionCheck');
const {
  validateJob,
  validateJobUpdate,
  validateApplicationStatus,
  validateJobFilters,
  validateApplicationFilters
} = require('../../../validators/jobPublisherValidation');

// All routes require authentication and job-publisher role
router.use(authenticate);
router.use(authenticatedRateLimiter);

// Middleware to ensure user is job-publisher
// Middleware to ensure user is job-publisher OR club
const requireJobPublisher = (req, res, next) => {
  if (req.user.role !== 'job-publisher' && req.user.role !== 'club') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Job publisher or Club role required.',
      code: 'INSUFFICIENT_ROLE'
    });
  }
  next();
};

router.use(requireJobPublisher);

// Profile routes
router.use('/profile', profileRoutes);

/**
 * @route   GET /api/v1/job-publisher/dashboard
 * @desc    Get job publisher dashboard data
 * @access  Private (job-publisher)
 */
router.get('/dashboard', jobPublisherController.getDashboard);

/**
 * @route   GET /api/v1/job-publisher/dashboard/stats
 * @desc    Get detailed dashboard statistics
 * @access  Private (job-publisher)
 */
router.get('/dashboard/stats', applicationController.getDashboardStats);

/**
 * @route   GET /api/v1/job-publisher/jobs
 * @desc    Get all jobs published by user
 * @access  Private (job-publisher)
 */
router.get('/jobs',
  validateJobFilters,
  jobPublisherController.getMyJobs
);

/**
 * @route   POST /api/v1/job-publisher/jobs
 * @desc    Create a new job posting
 * @access  Private (job-publisher)
 * @subscription Required - Enforces tier limits on job count
 */
router.post('/jobs',
  validateJob,
  subscriptionCheck.checkUsageLimit('ActiveJobs'), // Check max active jobs limit
  jobPublisherController.createJob
);

/**
 * @route   PUT /api/v1/job-publisher/jobs/:jobId
 * @desc    Update a job posting
 * @access  Private (job-publisher)
 */
router.put('/jobs/:jobId',
  validateJobUpdate,
  jobPublisherController.updateJob
);

/**
 * @route   DELETE /api/v1/job-publisher/jobs/:jobId
 * @desc    Delete a job posting
 * @access  Private (job-publisher)
 */
router.delete('/jobs/:jobId', jobPublisherController.deleteJob);

/**
 * @route   GET /api/v1/job-publisher/jobs/:jobId/applications
 * @desc    Get applications for a specific job
 * @access  Private (job-publisher)
 */
router.get('/jobs/:jobId/applications', applicationController.getJobApplications);

/**
 * @route   GET /api/v1/job-publisher/applications
 * @desc    Get all applications for all publisher's jobs
 * @access  Private (job-publisher)
 */
router.get('/applications',
  validateApplicationFilters,
  applicationController.getApplications
);

/**
 * @route   GET /api/v1/job-publisher/applications/:applicationId
 * @desc    Get single application details
 * @access  Private (job-publisher)
 */
router.get('/applications/:applicationId', applicationController.getApplicationDetails);

/**
 * @route   PUT /api/v1/job-publisher/applications/:applicationId/status
 * @desc    Update application status with optional message
 * @access  Private (job-publisher)
 * @subscription Required - Enforces tier limits on application actions
 */
router.put('/applications/:applicationId/status',
  validateApplicationStatus,
  subscriptionCheck.checkUsageLimit('Applications'),
  subscriptionCheck.incrementUsage('applications'),
  applicationController.updateApplicationStatus
);

module.exports = router;

