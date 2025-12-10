const express = require('express');
const router = express.Router();
const controller = require('../controllers/clubApplicationsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get all club applications
router.get('/', controller.getAllApplications);

// Get applications for specific job
router.get('/job/:jobId', controller.getJobApplications);

// Get single application details
router.get('/:applicationId', controller.getApplicationDetails);

// Application status update endpoints
router.post('/:applicationId/review', controller.reviewApplication);
router.post('/:applicationId/interview', controller.scheduleInterview);
router.post('/:applicationId/offer', controller.makeOffer);
router.post('/:applicationId/hire', controller.hireApplicant);
router.post('/:applicationId/reject', controller.rejectApplication);

// Legacy status update (kept for backward compatibility)
router.put('/:applicationId/status', controller.updateStatus || controller.reviewApplication);

// Add admin notes
router.put('/:applicationId/notes', controller.addNotes);

// Download resume with correct headers
router.get('/:applicationId/resume/download', controller.downloadResume);

// Export to CSV
router.get('/export', controller.exportApplications);

module.exports = router;
