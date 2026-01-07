const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const playerAgeCategoryController = require('../controllers/playerAgeCategoryController');
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

// ========================================
// Profile Management
// ========================================
router.post('/profile', authorize('player'), playerController.createProfile);
router.get('/profile/me', authorize('player'), playerController.getMyProfile);
router.get('/profile/:id', playerController.getProfileById);
router.put('/profile', authorize('player'), playerController.updateProfile);
router.delete('/profile', authorize('player'), playerController.deleteProfile);

// Search & Discovery
router.get('/search', playerController.searchPlayers);
router.get('/nearby', playerController.getNearbyPlayers);

// Dashboard
router.get('/dashboard/stats', authorize('player'), playerController.getDashboardStats);

// Media Gallery
router.post('/photos', authorize('player'), upload.single('photo'), playerController.addPhoto);
router.delete('/photos/:photoId', authorize('player'), playerController.removePhoto);
router.post('/videos', authorize('player'), playerController.addVideo);
router.delete('/videos/:videoId', authorize('player'), playerController.removeVideo);

// Privacy Settings
router.put('/privacy', authorize('player'), playerController.updatePrivacySettings);

// Image Uploads
router.post('/profile/avatar', authorize('player'), upload.single('avatar'), playerController.uploadProfileAvatar);
router.post('/profile/banner', authorize('player'), upload.single('banner'), playerController.uploadProfileBanner);

// ========================================
// Age Category & Team Management
// ========================================

// Age Category Information
router.get('/age-category', authorize('player'), playerAgeCategoryController.getMyAgeCategory);

// Team Members
router.get('/team/members', authorize('player'), playerAgeCategoryController.getTeamMembers);

// Coach Information
router.get('/coach', authorize('player'), playerAgeCategoryController.getMyCoach);

// ========================================
// Matches
// ========================================
router.get('/matches', authorize('player'), playerAgeCategoryController.getAgeCategoryMatches);
router.get('/matches/:id/my-status', authorize('player'), playerAgeCategoryController.getMyMatchStatus);

// ========================================
// Training
// ========================================
router.get('/training-sessions', authorize('player'), playerAgeCategoryController.getTrainingSessions);
router.get('/training-programs', authorize('player'), playerAgeCategoryController.getTrainingPrograms);

// ========================================
// Performance Statistics
// ========================================
router.get('/performance', authorize('player'), playerAgeCategoryController.getPerformanceStats);

// ========================================
// Announcements
// ========================================
router.get('/announcements', authorize('player'), playerAgeCategoryController.getAnnouncements);
router.post('/announcements/:id/mark-read', authorize('player'), playerAgeCategoryController.markAnnouncementRead);
router.post('/announcements/:id/acknowledge', authorize('player'), playerAgeCategoryController.acknowledgeAnnouncement);

module.exports = router;
