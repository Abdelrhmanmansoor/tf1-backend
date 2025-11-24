const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');
const { authenticate, authorize } = require('../../../middleware/auth');
const {
  uploadLogo,
  processLogo,
  uploadBanner,
  processBanner,
  uploadPortfolio,
  processPortfolioImages,
  handleUploadError
} = require('../../../middleware/cloudinaryUpload');

// All routes require authentication
router.use(authenticate);

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Create club profile
router.post('/profile', authorize('club'), clubController.createProfile);

// Get my club profile
router.get('/profile/me', authorize('club'), clubController.getMyProfile);

// Get club profile by ID
router.get('/profile/:id', clubController.getProfileById);

// Update club profile
router.put('/profile', authorize('club'), clubController.updateProfile);

// Delete club profile
router.delete('/profile', authorize('club'), clubController.deleteProfile);

// ============================================
// SEARCH & DISCOVERY
// ============================================

// Search clubs
router.get('/search', clubController.searchClubs);

// Get nearby clubs
router.get('/nearby', clubController.getNearbyClubs);

// ============================================
// MEMBER MANAGEMENT
// ============================================

// Get all club members
router.get('/members', authorize('club'), clubController.getMembers);

// Get pending membership requests
router.get('/members/pending', authorize('club'), clubController.getPendingRequests);

// Approve membership request
router.post('/members/:memberId/approve', authorize('club'), clubController.approveMembership);

// Reject membership request
router.post('/members/:memberId/reject', authorize('club'), clubController.rejectMembership);

// Update member role and permissions
router.put('/members/:memberId/role', authorize('club'), clubController.updateMemberRole);

// Remove member
router.delete('/members/:memberId', authorize('club'), clubController.removeMember);

// Get member statistics
router.get('/members/statistics', authorize('club'), clubController.getMemberStatistics);

// ============================================
// JOB POSTING & RECRUITMENT
// ============================================

// Create job posting
router.post('/jobs', authorize('club'), clubController.createJob);

// Get club's job postings
router.get('/jobs', authorize('club'), clubController.getJobs);

// Get single job posting by ID
router.get('/jobs/:jobId', clubController.getJobById);

// Update job posting
router.put('/jobs/:jobId', authorize('club'), clubController.updateJob);

// Close job posting
router.post('/jobs/:jobId/close', authorize('club'), clubController.closeJob);

// Extend job deadline
router.put('/jobs/:jobId/extend', authorize('club'), clubController.extendJobDeadline);

// Get job applications
router.get('/applications', authorize('club'), clubController.getJobApplications);

// Get single application by ID
router.get('/applications/:applicationId', clubController.getApplicationById);

// Review application (move to under review)
router.post('/applications/:applicationId/review', authorize('club'), clubController.reviewApplication);

// Schedule interview
router.post('/applications/:applicationId/interview', authorize('club'), clubController.scheduleInterview);

// Make job offer
router.post('/applications/:applicationId/offer', authorize('club'), clubController.makeOffer);

// Hire applicant
router.post('/applications/:applicationId/hire', authorize('club'), clubController.hireApplicant);

// Reject application
router.post('/applications/:applicationId/reject', authorize('club'), clubController.rejectApplication);

// ============================================
// TEAM MANAGEMENT
// ============================================

// Create team
router.post('/teams', authorize('club'), clubController.createTeam);

// Get club teams
router.get('/teams', authorize('club'), clubController.getTeams);

// Get team by ID
router.get('/teams/:teamId', authorize('club'), clubController.getTeamById);

// Update team
router.put('/teams/:teamId', authorize('club'), clubController.updateTeam);

// Add player to team
router.post('/teams/:teamId/players', authorize('club'), clubController.addPlayerToTeam);

// Remove player from team
router.delete('/teams/:teamId/players/:userId', authorize('club'), clubController.removePlayerFromTeam);

// Add coach to team
router.post('/teams/:teamId/coaches', authorize('club'), clubController.addCoachToTeam);

// Update training schedule
router.put('/teams/:teamId/schedule', authorize('club'), clubController.updateTrainingSchedule);

// ============================================
// EVENT MANAGEMENT
// ============================================

// Create event
router.post('/events', authorize('club'), clubController.createEvent);

// Get club events
router.get('/events', authorize('club'), clubController.getEvents);

// Get upcoming events
router.get('/events/upcoming', authorize('club'), clubController.getUpcomingEvents);

// Update event
router.put('/events/:eventId', authorize('club'), clubController.updateEvent);

// Cancel event
router.post('/events/:eventId/cancel', authorize('club'), clubController.cancelEvent);

// Mark attendance
router.post('/events/:eventId/attendance', authorize('club'), clubController.markAttendance);

// ============================================
// FACILITY & BOOKING MANAGEMENT
// ============================================

// Create facility booking
router.post('/bookings', authorize('club'), clubController.createBooking);

// Get club bookings
router.get('/bookings', authorize('club'), clubController.getBookings);

// Get facility schedule
router.get('/facilities/schedule', authorize('club'), clubController.getFacilitySchedule);

// Get available slots
router.get('/facilities/available-slots', authorize('club'), clubController.getAvailableSlots);

// Approve booking
router.post('/bookings/:bookingId/approve', authorize('club'), clubController.approveBooking);

// Reject booking
router.post('/bookings/:bookingId/reject', authorize('club'), clubController.rejectBooking);

// Cancel booking
router.post('/bookings/:bookingId/cancel', authorize('club'), clubController.cancelBooking);

// Get facility utilization
router.get('/facilities/utilization', authorize('club'), clubController.getFacilityUtilization);

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

// Get club dashboard statistics
router.get('/dashboard/stats', authorize('club'), clubController.getDashboardStats);

// ============================================
// MEDIA GALLERY
// ============================================

// Add facility photo
router.post('/facilities/photos', authorize('club'), clubController.addFacilityPhoto);

// Remove facility photo
router.delete('/facilities/photos/:photoId', authorize('club'), clubController.removeFacilityPhoto);

// Add facility video
router.post('/facilities/videos', authorize('club'), clubController.addFacilityVideo);

// Remove facility video
router.delete('/facilities/videos/:videoId', authorize('club'), clubController.removeFacilityVideo);

// ============================================
// IMAGE UPLOADS (CLOUDINARY)
// ============================================

// Upload club logo
router.post('/upload/logo',
  authorize('club'),
  uploadLogo,
  processLogo,
  handleUploadError,
  clubController.uploadLogo
);

// Upload club banner
router.post('/upload/banner',
  authorize('club'),
  uploadBanner,
  processBanner,
  handleUploadError,
  clubController.uploadBanner
);

// Upload gallery images (up to 5 at once)
router.post('/upload/gallery',
  authorize('club'),
  uploadPortfolio,
  processPortfolioImages,
  handleUploadError,
  clubController.uploadGalleryImages
);

// ============================================
// SETTINGS
// ============================================

// Update privacy settings
router.put('/settings/privacy', authorize('club'), clubController.updatePrivacySettings);

// Update notification settings
router.put('/settings/notifications', authorize('club'), clubController.updateNotificationSettings);

module.exports = router;
