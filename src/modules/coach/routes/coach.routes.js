const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');
const { authenticate, authorize } = require('../../../middleware/auth');
const multer = require('multer');

// Multer configuration for image uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// ==================== PROFILE MANAGEMENT ====================
router.post('/profile', authorize('coach'), coachController.createProfile);
router.get('/profile/me', authorize('coach'), coachController.getMyProfile);
router.get('/profile/:id', coachController.getProfileById);
router.put('/profile', authorize('coach'), coachController.updateProfile);
router.delete('/profile', authorize('coach'), coachController.deleteProfile);

// ==================== SEARCH & DISCOVERY ====================
router.get('/search', coachController.searchCoaches);
router.get('/nearby', coachController.getNearbyCoaches);

// ==================== AVAILABILITY MANAGEMENT ====================
router.get('/availability', authorize('coach'), coachController.getAvailability);
router.put('/availability/schedule', authorize('coach'), coachController.updateWeeklySchedule);
router.post('/availability/block-date', authorize('coach'), coachController.blockDate);
router.post('/availability/unblock-date', authorize('coach'), coachController.unblockDate);
router.get('/availability/slots/:date', coachController.getAvailableSlots);
router.put('/availability/settings', authorize('coach'), coachController.updateBookingSettings);
router.put('/availability/cancellation-policy', authorize('coach'), coachController.updateCancellationPolicy);

// ==================== DASHBOARD & STATISTICS ====================
router.get('/dashboard/stats', authorize('coach'), coachController.getDashboardStats);

// ==================== STUDENTS MANAGEMENT ====================
router.post('/students', authorize('coach'), coachController.addStudent);
router.get('/students', authorize('coach'), coachController.getStudentsList);
router.get('/students/:studentId', authorize('coach'), coachController.getSingleStudent);

// ==================== SESSIONS MANAGEMENT ====================
router.get('/sessions', authorize('coach'), coachController.getSessionsList);
router.get('/sessions/:sessionId', authorize('coach'), coachController.getSingleSession);
router.patch('/sessions/:sessionId/status', authorize('coach'), coachController.updateSessionStatus);

// ==================== MEDIA GALLERY ====================
router.post('/photos', authorize('coach'), upload.single('photo'), coachController.addPhoto);
router.delete('/photos/:photoId', authorize('coach'), coachController.removePhoto);
router.post('/videos', authorize('coach'), coachController.addVideo);
router.delete('/videos/:videoId', authorize('coach'), coachController.removeVideo);

// ==================== IMAGE UPLOADS ====================
router.post('/profile/avatar', authorize('coach'), upload.single('avatar'), coachController.uploadProfileAvatar);
router.post('/profile/banner', authorize('coach'), upload.single('banner'), coachController.uploadProfileBanner);

// ==================== PRIVACY SETTINGS ====================
router.put('/privacy', authorize('coach'), coachController.updatePrivacySettings);

module.exports = router;
