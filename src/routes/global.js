const express = require('express');
const router = express.Router();
const globalController = require('../controllers/globalController');
const { authenticate } = require('../middleware/auth');

// ==================== FILE UPLOAD & MEDIA MANAGEMENT ====================

// Upload endpoints (protected)
router.post(
  '/upload/image',
  authenticate,
  globalController.upload.single('file'),
  globalController.uploadImage
);

router.post(
  '/upload/video',
  authenticate,
  globalController.upload.single('file'),
  globalController.uploadVideo
);

router.post(
  '/upload/document',
  authenticate,
  globalController.upload.single('file'),
  globalController.uploadDocument
);

// Media library (protected)
router.get('/media', authenticate, globalController.getMediaLibrary);
router.get('/media/storage', authenticate, globalController.getStorageUsage);
router.delete('/media/:id', authenticate, globalController.deleteMedia);

// ==================== LOCATION & GEOCODING ====================

// Geocoding (public)
router.post('/location/geocode', globalController.geocodeAddress);
router.post('/location/reverse-geocode', globalController.reverseGeocode);

// ==================== LANGUAGE & LOCALIZATION ====================

// Language preference (protected)
router.put('/language', authenticate, globalController.updateLanguage);

// ==================== BLOCKING & REPORTING ====================

// Blocking (protected)
router.post('/block/:userId', authenticate, globalController.blockUser);
router.delete('/block/:userId', authenticate, globalController.unblockUser);
router.get('/blocked', authenticate, globalController.getBlockedUsers);

// Reporting (protected)
router.post('/report', authenticate, globalController.reportContent);

// ==================== ANALYTICS ====================

// Analytics (protected)
router.get(
  '/analytics/profile-views',
  authenticate,
  globalController.getProfileViews
);
router.get(
  '/analytics/search-appearances',
  authenticate,
  globalController.getSearchAppearances
);

// ==================== UNIVERSAL PROFILE ====================

// Universal profile endpoint - auto-detects role (protected)
router.get('/profile/:id', authenticate, globalController.getUniversalProfile);

module.exports = router;
