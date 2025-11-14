const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');
const { authenticate } = require('../middleware/auth');
const { uploadResume, handleUploadError } = require('../middleware/cloudinaryUpload');

// ==================== JOB BROWSING (PUBLIC/AUTH) ====================

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job details by ID
 * @access  Public
 */
router.get('/:id', jobsController.getJobById);

// ==================== JOB APPLICATIONS (REQUIRES AUTH) ====================

/**
 * @route   POST /api/v1/jobs/:id/apply
 * @desc    Apply to a job (LinkedIn-style easy apply)
 * @access  Private (player, coach, specialist)
 */
router.post('/:id/apply',
  authenticate,
  uploadResume,
  handleUploadError,
  jobsController.applyToJob
);

/**
 * @route   GET /api/v1/jobs/applications/me
 * @desc    Get my job applications
 * @access  Private
 */
router.get('/applications/me', authenticate, jobsController.getMyApplications);

/**
 * @route   GET /api/v1/jobs/:jobId/applications
 * @desc    Get applications for a specific job (club access only)
 * @access  Private (club)
 */
router.get('/:jobId/applications', authenticate, jobsController.getJobApplications);

/**
 * @route   PUT /api/v1/jobs/applications/:applicationId/withdraw
 * @desc    Withdraw application
 * @access  Private
 */
router.put('/applications/:applicationId/withdraw', authenticate, jobsController.withdrawApplication);

module.exports = router;
