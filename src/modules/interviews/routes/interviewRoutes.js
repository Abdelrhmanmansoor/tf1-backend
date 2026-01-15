const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { authenticate, authorize } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const { requireFeature, checkUsageLimit, incrementUsage } = require('../../../middleware/subscriptionCheck');
const { body, param, query } = require('express-validator');

// Validation rules
const scheduleInterviewValidation = [
  body('applicationId').isMongoId().withMessage('Valid application ID is required'),
  body('type').isIn(['online', 'onsite']).withMessage('Type must be online or onsite'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('timezone').optional().isString(),
  body('interviewers').optional().isArray(),
  body('location').optional().isObject(),
  body('meetingPlatform').optional().isIn(['internal', 'zoom', 'google-meet', 'teams', 'other']),
];

const rescheduleValidation = [
  param('id').isMongoId(),
  body('newDate').isISO8601().withMessage('Valid new date is required'),
  body('reason').optional().isString(),
];

const feedbackValidation = [
  param('id').isMongoId(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('technicalSkills').optional().isInt({ min: 1, max: 5 }),
  body('communication').optional().isInt({ min: 1, max: 5 }),
  body('cultureFit').optional().isInt({ min: 1, max: 5 }),
  body('recommendation').optional().isIn(['strong-hire', 'hire', 'maybe', 'no-hire']),
  body('detailedFeedback').optional().isString(),
];

// All routes require authentication
router.use(authenticate);

// Schedule interview (Publisher only)
router.post(
  '/',
  authorize('job-publisher', 'club'),
  requireFeature('interviewAutomation'), // Check subscription
  checkUsageLimit('interviewsPerMonth'), // Check usage limit
  scheduleInterviewValidation,
  validateRequest,
  interviewController.scheduleInterview,
  incrementUsage('interviews') // Increment usage counter
);

// Get interviews (Publisher only)
router.get(
  '/',
  authorize('job-publisher', 'club'),
  interviewController.getInterviews
);

// Get interview statistics (Publisher only)
router.get(
  '/statistics',
  authorize('job-publisher', 'club'),
  interviewController.getStatistics
);

// Get single interview (Publisher or Applicant)
router.get(
  '/:id',
  param('id').isMongoId(),
  validateRequest,
  interviewController.getInterview
);

// Update interview (Publisher only)
router.patch(
  '/:id',
  authorize('job-publisher', 'club'),
  param('id').isMongoId(),
  validateRequest,
  interviewController.updateInterview
);

// Reschedule interview (Publisher only)
router.post(
  '/:id/reschedule',
  authorize('job-publisher', 'club'),
  rescheduleValidation,
  validateRequest,
  interviewController.rescheduleInterview
);

// Cancel interview (Publisher only)
router.delete(
  '/:id/cancel',
  authorize('job-publisher', 'club'),
  param('id').isMongoId(),
  validateRequest,
  interviewController.cancelInterview
);

// Complete interview (Publisher only)
router.post(
  '/:id/complete',
  authorize('job-publisher', 'club'),
  param('id').isMongoId(),
  validateRequest,
  interviewController.completeInterview
);

// Submit feedback (Publisher or Interviewer)
router.post(
  '/:id/feedback',
  feedbackValidation,
  validateRequest,
  interviewController.submitFeedback
);

// Get reminders (Publisher only)
router.get(
  '/:id/reminders',
  authorize('job-publisher', 'club'),
  param('id').isMongoId(),
  validateRequest,
  interviewController.getReminders
);

// Send reminder manually (Publisher only)
router.post(
  '/:id/reminders/send',
  authorize('job-publisher', 'club'),
  param('id').isMongoId(),
  validateRequest,
  interviewController.sendReminder
);

// Public route: Join interview by token
router.get(
  '/token/:token',
  param('token').isString().isLength({ min: 32, max: 32 }),
  validateRequest,
  interviewController.joinInterviewByToken
);

module.exports = router;
