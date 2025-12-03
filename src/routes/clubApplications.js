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

// Update application status
router.put('/:applicationId/status', controller.updateStatus);

// Add admin notes
router.put('/:applicationId/notes', controller.addNotes);

// Download resume with correct headers
router.get('/:applicationId/resume/download', controller.downloadResume);

// Export to CSV
router.get('/export', controller.exportApplications);

module.exports = router;
