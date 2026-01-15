const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');
const { authenticate } = require('../middleware/auth');
const {
  uploadResumeLocal,
  handleLocalUploadError,
} = require('../middleware/localFileUpload');

// ==================== JOB EVENTS (TICKER & LIVE) ====================

/**
 * @route   GET /api/v1/jobs/events/ticker
 * @desc    Get live jobs ticker
 * @access  Public
 */
router.get('/events/ticker', jobsController.getJobsTicker);

/**
 * @route   GET /api/v1/jobs/events
 * @desc    Get job events with filters
 * @access  Public
 */
router.get('/events', jobsController.getJobEvents);

// ==================== LIST ALL JOBS (PUBLIC) ====================

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all active jobs with filters
 * @access  Public
 */
router.get('/', jobsController.getJobs);

// ==================== JOB APPLICATIONS (REQUIRES AUTH) - MUST BE BEFORE /:id ====================

/**
 * @route   GET /api/v1/jobs/applications/me
 * @route   GET /api/v1/applications/my-applications
 * @desc    Get my job applications
 * @access  Private
 */
router.get('/applications/me', authenticate, jobsController.getMyApplications);
router.get('/my-applications', authenticate, jobsController.getMyApplications);

/**
 * @route   GET /api/v1/jobs/my-jobs
 * @desc    Get jobs created by authenticated user (job-publisher or club)
 * @access  Private
 */
router.get('/my-jobs', authenticate, jobsController.getMyJobs);

/**
 * @route   PUT /api/v1/jobs/applications/:applicationId/withdraw
 * @desc    Withdraw application
 * @access  Private
 */
router.put(
  '/applications/:applicationId/withdraw',
  authenticate,
  jobsController.withdrawApplication
);

// ==================== JOB BROWSING (PUBLIC/AUTH) ====================

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job details by ID
 * @access  Public
 */
router.get('/:id', jobsController.getJobById);

/**
 * @route   POST /api/v1/jobs/:id/create-event
 * @desc    Create job event when posted/updated
 * @access  Private (club)
 */
router.post(
  '/:id/create-event',
  authenticate,
  jobsController.createJobEvent
);

/**
 * @route   POST /api/v1/jobs/:id/apply
 * @desc    Apply to a job (LinkedIn-style easy apply)
 * @access  Private (player, coach, specialist)
 */
router.post(
  '/:id/apply',
  authenticate,
  jobsController.checkExistingApplication,
  uploadResumeLocal,
  handleLocalUploadError,
  jobsController.applyToJob
);

/**
 * @route   GET /api/v1/jobs/:jobId/applications
 * @desc    Get applications for a specific job (club access only)
 * @access  Private (club)
 */
router.get(
  '/:jobId/applications',
  authenticate,
  jobsController.getJobApplications
);

/**
 * @route   GET /api/v1/jobs/applications/:applicationId/download/:attachmentIndex
 * @desc    Download application attachment (resume, CV, etc.)
 * @access  Private (club or applicant)
 */
router.get(
  '/applications/:applicationId/download/:attachmentIndex',
  authenticate,
  jobsController.downloadAttachment
);

/**
 * @route   PUT /api/v1/jobs/applications/:applicationId/status
 * @desc    Update application status (club only)
 * @access  Private (club)
 */
router.put(
  '/applications/:applicationId/status',
  authenticate,
  jobsController.updateApplicationStatus
);

/**
 * @route   POST /api/v1/jobs/applications/:applicationId/message
 * @desc    Send message to applicant
 * @access  Private (club)
 */
router.post(
  '/applications/:applicationId/message',
  authenticate,
  jobsController.sendMessageToApplicant
);

module.exports = router;
