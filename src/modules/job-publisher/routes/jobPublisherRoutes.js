const express = require('express');
const router = express.Router();
const jobPublisherController = require('../controllers/jobPublisherController');
const { authenticate } = require('../../../middleware/auth');

// All routes require authentication and job-publisher role
router.use(authenticate);

// Middleware to ensure user is job-publisher
const requireJobPublisher = (req, res, next) => {
  if (req.user.role !== 'job-publisher') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Job publisher role required.',
      code: 'INSUFFICIENT_ROLE'
    });
  }
  next();
};

router.use(requireJobPublisher);

/**
 * @route   GET /api/v1/job-publisher/dashboard
 * @desc    Get job publisher dashboard data
 * @access  Private (job-publisher)
 */
router.get('/dashboard', jobPublisherController.getDashboard);

/**
 * @route   GET /api/v1/job-publisher/jobs
 * @desc    Get all jobs published by user
 * @access  Private (job-publisher)
 */
router.get('/jobs', jobPublisherController.getMyJobs);

/**
 * @route   POST /api/v1/job-publisher/jobs
 * @desc    Create a new job posting
 * @access  Private (job-publisher)
 */
router.post('/jobs', jobPublisherController.createJob);

/**
 * @route   PUT /api/v1/job-publisher/jobs/:jobId
 * @desc    Update a job posting
 * @access  Private (job-publisher)
 */
router.put('/jobs/:jobId', jobPublisherController.updateJob);

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
router.get('/jobs/:jobId/applications', jobPublisherController.getJobApplications);

/**
 * @route   PUT /api/v1/job-publisher/applications/:applicationId/status
 * @desc    Update application status
 * @access  Private (job-publisher)
 */
router.put('/applications/:applicationId/status', jobPublisherController.updateApplicationStatus);

module.exports = router;

