const express = require('express');
const router = express.Router();
const specialistController = require('../controllers/specialistController');
const { authenticate, authorize } = require('../../../middleware/auth');
const { uploadAvatar, uploadBanner } = require('../../../middleware/cloudinaryUpload');

// ===================================
// PROFILE MANAGEMENT
// ===================================

/**
 * @route   POST /api/specialist/profile
 * @desc    Create specialist profile
 * @access  Private (Specialist)
 */
router.post('/profile', authenticate, authorize('specialist'), specialistController.createProfile);

/**
 * @route   GET /api/specialist/profile/me
 * @desc    Get my specialist profile
 * @access  Private (Specialist)
 */
router.get('/profile/me', authenticate, authorize('specialist'), specialistController.getMyProfile);

/**
 * @route   GET /api/specialist/profile/:id
 * @desc    Get specialist profile by ID
 * @access  Public
 */
router.get('/profile/:id', specialistController.getProfileById);

/**
 * @route   PUT /api/specialist/profile
 * @desc    Update specialist profile
 * @access  Private (Specialist)
 */
router.put('/profile', authenticate, authorize('specialist'), specialistController.updateProfile);

/**
 * @route   DELETE /api/specialist/profile
 * @desc    Delete specialist profile
 * @access  Private (Specialist)
 */
router.delete('/profile', authenticate, authorize('specialist'), specialistController.deleteProfile);

// ===================================
// SEARCH & DISCOVERY
// ===================================

/**
 * @route   GET /api/specialist/search
 * @desc    Search specialists with filters
 * @access  Public
 * @query   specialization, location, rating, availability, sport, etc.
 */
router.get('/search', specialistController.searchSpecialists);

/**
 * @route   GET /api/specialist/nearby
 * @desc    Get nearby specialists (geolocation)
 * @access  Public
 * @query   lat, lng, maxDistance, specialization
 */
router.get('/nearby', specialistController.getNearbySpecialists);

// ===================================
// AVAILABILITY MANAGEMENT
// ===================================

/**
 * @route   GET /api/specialist/availability
 * @desc    Get my availability settings
 * @access  Private (Specialist)
 */
router.get('/availability', authenticate, authorize('specialist'), specialistController.getMyAvailability);

/**
 * @route   GET /api/specialist/availability/:specialistId/slots
 * @desc    Get available time slots for a specialist
 * @access  Public
 * @query   date, duration
 */
router.get('/availability/:specialistId/slots', specialistController.getAvailableSlots);

/**
 * @route   PUT /api/specialist/availability/weekly
 * @desc    Update weekly schedule
 * @access  Private (Specialist)
 */
router.put('/availability/weekly', authenticate, authorize('specialist'), specialistController.updateWeeklySchedule);

/**
 * @route   POST /api/specialist/availability/block-date
 * @desc    Block a specific date
 * @access  Private (Specialist)
 */
router.post('/availability/block-date', authenticate, authorize('specialist'), specialistController.blockDate);

/**
 * @route   DELETE /api/specialist/availability/block-date
 * @desc    Unblock a specific date
 * @access  Private (Specialist)
 */
router.delete('/availability/block-date', authenticate, authorize('specialist'), specialistController.unblockDate);

/**
 * @route   POST /api/specialist/availability/block-period
 * @desc    Block a period of time (vacation)
 * @access  Private (Specialist)
 */
router.post('/availability/block-period', authenticate, authorize('specialist'), specialistController.blockPeriod);

// ===================================
// CONSULTATION REQUESTS
// ===================================

/**
 * @route   GET /api/specialist/requests
 * @desc    Get consultation requests
 * @access  Private (Specialist)
 * @query   status, page, limit
 */
router.get('/requests', authenticate, authorize('specialist'), specialistController.getConsultationRequests);

/**
 * @route   PUT /api/specialist/requests/:requestId/accept
 * @desc    Accept a consultation request
 * @access  Private (Specialist)
 */
router.put('/requests/:requestId/accept', authenticate, authorize('specialist'), specialistController.acceptRequest);

/**
 * @route   PUT /api/specialist/requests/:requestId/reject
 * @desc    Reject a consultation request
 * @access  Private (Specialist)
 */
router.put('/requests/:requestId/reject', authenticate, authorize('specialist'), specialistController.rejectRequest);

/**
 * @route   PUT /api/specialist/requests/:requestId/confirm
 * @desc    Confirm booking and create session
 * @access  Private (Specialist)
 */
router.put('/requests/:requestId/confirm', authenticate, authorize('specialist'), specialistController.confirmBooking);

// ===================================
// SESSION MANAGEMENT
// ===================================

/**
 * @route   GET /api/specialist/sessions
 * @desc    Get all sessions
 * @access  Private (Specialist)
 * @query   status, clientId, dateFrom, dateTo, page, limit
 */
router.get('/sessions', authenticate, authorize('specialist'), specialistController.getSessions);

/**
 * @route   GET /api/specialist/sessions/today
 * @desc    Get today's sessions
 * @access  Private (Specialist)
 */
router.get('/sessions/today', authenticate, authorize('specialist'), specialistController.getTodaySessions);

/**
 * @route   GET /api/specialist/sessions/:sessionId
 * @desc    Get session by ID
 * @access  Private (Specialist or Client)
 */
router.get('/sessions/:sessionId', authenticate, specialistController.getSessionById);

/**
 * @route   POST /api/specialist/sessions
 * @desc    Create a session manually
 * @access  Private (Specialist)
 */
router.post('/sessions', authenticate, authorize('specialist'), specialistController.createSession);

/**
 * @route   PUT /api/specialist/sessions/:sessionId
 * @desc    Update session details
 * @access  Private (Specialist)
 */
router.put('/sessions/:sessionId', authenticate, authorize('specialist'), specialistController.updateSession);

/**
 * @route   PUT /api/specialist/sessions/:sessionId/complete
 * @desc    Complete a session
 * @access  Private (Specialist)
 */
router.put('/sessions/:sessionId/complete', authenticate, authorize('specialist'), specialistController.completeSession);

/**
 * @route   PUT /api/specialist/sessions/:sessionId/cancel
 * @desc    Cancel a session
 * @access  Private (Specialist or Client)
 */
router.put('/sessions/:sessionId/cancel', authenticate, specialistController.cancelSession);

/**
 * @route   PUT /api/specialist/sessions/:sessionId/reschedule
 * @desc    Reschedule a session
 * @access  Private (Specialist)
 */
router.put('/sessions/:sessionId/reschedule', authenticate, authorize('specialist'), specialistController.rescheduleSession);

// ===================================
// CLIENT MANAGEMENT
// ===================================

/**
 * @route   GET /api/specialist/clients
 * @desc    Get all clients
 * @access  Private (Specialist)
 * @query   status, search, page, limit
 */
router.get('/clients', authenticate, authorize('specialist'), specialistController.getClients);

/**
 * @route   GET /api/specialist/clients/:clientId
 * @desc    Get client details with full history
 * @access  Private (Specialist)
 */
router.get('/clients/:clientId', authenticate, authorize('specialist'), specialistController.getClientById);

/**
 * @route   POST /api/specialist/clients/:clientId/notes
 * @desc    Add note to client
 * @access  Private (Specialist)
 */
router.post('/clients/:clientId/notes', authenticate, authorize('specialist'), specialistController.addClientNote);

/**
 * @route   POST /api/specialist/clients/:clientId/measurements
 * @desc    Add measurement to client
 * @access  Private (Specialist)
 */
router.post('/clients/:clientId/measurements', authenticate, authorize('specialist'), specialistController.addClientMeasurement);

/**
 * @route   PUT /api/specialist/clients/:clientId/goals
 * @desc    Update client goals
 * @access  Private (Specialist)
 */
router.put('/clients/:clientId/goals', authenticate, authorize('specialist'), specialistController.updateClientGoals);

/**
 * @route   POST /api/specialist/clients/:clientId/pain-tracking
 * @desc    Add pain tracking entry
 * @access  Private (Specialist)
 */
router.post('/clients/:clientId/pain-tracking', authenticate, authorize('specialist'), specialistController.addPainTracking);

/**
 * @route   POST /api/specialist/clients/:clientId/fitness-metrics
 * @desc    Add fitness metrics
 * @access  Private (Specialist)
 */
router.post('/clients/:clientId/fitness-metrics', authenticate, authorize('specialist'), specialistController.addFitnessMetrics);

// ===================================
// PROGRAM MANAGEMENT
// ===================================

/**
 * @route   GET /api/specialist/programs
 * @desc    Get all programs
 * @access  Private (Specialist)
 * @query   programType, isTemplate, status, category
 */
router.get('/programs', authenticate, authorize('specialist'), specialistController.getPrograms);

/**
 * @route   GET /api/specialist/programs/templates
 * @desc    Get program templates
 * @access  Private (Specialist)
 * @query   programType
 */
router.get('/programs/templates', authenticate, authorize('specialist'), specialistController.getProgramTemplates);

/**
 * @route   GET /api/specialist/programs/:programId
 * @desc    Get program by ID
 * @access  Private (Specialist)
 */
router.get('/programs/:programId', authenticate, authorize('specialist'), specialistController.getProgramById);

/**
 * @route   POST /api/specialist/programs
 * @desc    Create a new program
 * @access  Private (Specialist)
 */
router.post('/programs', authenticate, authorize('specialist'), specialistController.createProgram);

/**
 * @route   PUT /api/specialist/programs/:programId
 * @desc    Update program
 * @access  Private (Specialist)
 */
router.put('/programs/:programId', authenticate, authorize('specialist'), specialistController.updateProgram);

/**
 * @route   DELETE /api/specialist/programs/:programId
 * @desc    Delete program
 * @access  Private (Specialist)
 */
router.delete('/programs/:programId', authenticate, authorize('specialist'), specialistController.deleteProgram);

/**
 * @route   POST /api/specialist/programs/:programId/assign/:clientId
 * @desc    Assign program to client
 * @access  Private (Specialist)
 */
router.post('/programs/:programId/assign/:clientId', authenticate, authorize('specialist'), specialistController.assignProgramToClient);

/**
 * @route   POST /api/specialist/programs/:programId/clone
 * @desc    Clone program as template
 * @access  Private (Specialist)
 */
router.post('/programs/:programId/clone', authenticate, authorize('specialist'), specialistController.cloneProgramAsTemplate);

// ===================================
// DASHBOARD & ANALYTICS
// ===================================

/**
 * @route   GET /api/specialist/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Specialist)
 */
router.get('/dashboard', authenticate, authorize('specialist'), specialistController.getDashboardStats);

/**
 * @route   GET /api/specialist/analytics
 * @desc    Get analytics data
 * @access  Private (Specialist)
 * @query   period (week, month, year)
 */
router.get('/analytics', authenticate, authorize('specialist'), specialistController.getAnalytics);

// ===================================
// MEDIA GALLERY
// ===================================

/**
 * @route   POST /api/specialist/gallery/photos
 * @desc    Add photo to gallery
 * @access  Private (Specialist)
 */
router.post('/gallery/photos', authenticate, authorize('specialist'), specialistController.addPhoto);

/**
 * @route   DELETE /api/specialist/gallery/photos/:photoId
 * @desc    Remove photo from gallery
 * @access  Private (Specialist)
 */
router.delete('/gallery/photos/:photoId', authenticate, authorize('specialist'), specialistController.removePhoto);

/**
 * @route   POST /api/specialist/gallery/videos
 * @desc    Add video to gallery
 * @access  Private (Specialist)
 */
router.post('/gallery/videos', authenticate, authorize('specialist'), specialistController.addVideo);

/**
 * @route   DELETE /api/specialist/gallery/videos/:videoId
 * @desc    Remove video from gallery
 * @access  Private (Specialist)
 */
router.delete('/gallery/videos/:videoId', authenticate, authorize('specialist'), specialistController.removeVideo);

// ===================================
// SETTINGS & PRIVACY
// ===================================

/**
 * @route   PUT /api/specialist/settings/privacy
 * @desc    Update privacy settings
 * @access  Private (Specialist)
 */
router.put('/settings/privacy', authenticate, authorize('specialist'), specialistController.updatePrivacySettings);

/**
 * @route   PUT /api/specialist/settings/notifications
 * @desc    Update notification preferences
 * @access  Private (Specialist)
 */
router.put('/settings/notifications', authenticate, authorize('specialist'), specialistController.updateNotificationSettings);

// ===================================
// IMAGE UPLOADS
// ===================================

/**
 * @route   POST /api/specialist/upload/avatar
 * @desc    Upload specialist avatar image
 * @access  Private (Specialist)
 */
router.post('/upload/avatar', authenticate, authorize('specialist'), uploadAvatar, specialistController.uploadAvatar);

/**
 * @route   POST /api/specialist/upload/banner
 * @desc    Upload specialist banner image
 * @access  Private (Specialist)
 */
router.post('/upload/banner', authenticate, authorize('specialist'), uploadBanner, specialistController.uploadBanner);

/**
 * @route   DELETE /api/specialist/upload/avatar
 * @desc    Delete specialist avatar image
 * @access  Private (Specialist)
 */
router.delete('/upload/avatar', authenticate, authorize('specialist'), specialistController.deleteAvatar);

/**
 * @route   DELETE /api/specialist/upload/banner
 * @desc    Delete specialist banner image
 * @access  Private (Specialist)
 */
router.delete('/upload/banner', authenticate, authorize('specialist'), specialistController.deleteBanner);

module.exports = router;
