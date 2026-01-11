const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const { authenticate } = require('../../../middleware/auth');
const { checkPermission } = require('../../../middleware/rbac');
const { PERMISSIONS } = require('../../../config/roles');
const { authenticatedRateLimiter } = require('../../../middleware/rateLimiter');

// All routes require authentication and applicant role
router.use(authenticate);
router.use(authenticatedRateLimiter);

// Middleware to ensure user is applicant
const requireApplicant = (req, res, next) => {
  if (req.user.role !== 'applicant') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Applicant role required.',
      code: 'INSUFFICIENT_ROLE'
    });
  }
  next();
};

router.use(requireApplicant);

/**
 * @route   GET /api/v1/applicant/dashboard
 * @desc    Get applicant dashboard data
 * @access  Private (applicant)
 */
router.get('/dashboard', applicantController.getDashboard);

/**
 * @route   GET /api/v1/applicant/applications
 * @desc    Get all applicant's job applications
 * @access  Private (applicant)
 */
router.get('/applications', applicantController.getMyApplications);

/**
 * @route   GET /api/v1/applicant/applications/:applicationId
 * @desc    Get specific application details
 * @access  Private (applicant)
 */
router.get('/applications/:applicationId', applicantController.getApplicationDetails);

/**
 * @route   PUT /api/v1/applicant/applications/:applicationId/withdraw
 * @desc    Withdraw a job application
 * @access  Private (applicant)
 */
router.put('/applications/:applicationId/withdraw', applicantController.withdrawApplication);

/**
 * @route   GET /api/v1/applicant/jobs
 * @desc    Get available jobs for applicant
 * @access  Private (applicant)
 */
router.get('/jobs', applicantController.getAvailableJobs);

module.exports = router;

