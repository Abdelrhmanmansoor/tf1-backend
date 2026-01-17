const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../middleware/auth');
const rateLimit = require('express-rate-limit');
const profileController = require('../controllers/jobPublisherProfileController');
const {
  companyLogoUploadService,
  profileImageUploadService,
  documentUploadService
} = require('../../../services/secureFileUpload');

// Rate limiter for file uploads (5 uploads per hour per user)
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
    messageAr: 'محاولات تحميل كثيرة جداً. يرجى المحاولة لاحقاً.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create secure upload middlewares
const logoUpload = companyLogoUploadService.createImageUploadMiddleware();
const photoUpload = profileImageUploadService.createImageUploadMiddleware({ maxFiles: 5 });
const documentUpload = documentUploadService.createDocumentUploadMiddleware();

// Protected routes (require authentication and job-publisher role)
router.use(authenticate);
router.use(authorize('job-publisher', 'club'));

// Create profile
router.post('/create', profileController.createProfile);

// Get profile
router.get('/', profileController.getProfile);

// Update profile
router.put('/', profileController.updateProfile);

// Upload company logo (secure, rate-limited)
router.post('/upload-logo',
  uploadRateLimiter,
  logoUpload.single('logo'),
  profileController.uploadLogo
);

// Upload work environment photos (secure, rate-limited)
router.post('/upload-work-photo',
  uploadRateLimiter,
  photoUpload.array('photos', 5),
  profileController.uploadWorkPhoto
);

// Upload documents (secure, rate-limited)
router.post('/upload-document',
  uploadRateLimiter,
  documentUpload.single('document'),
  profileController.uploadDocument
);

// Add award/certification
router.post('/add-award', profileController.addAward);

// Add employee testimonial
router.post('/add-testimonial', profileController.addTestimonial);

// Verify national address
router.post('/verify-national-address', profileController.verifyNationalAddress);

// Get statistics
router.get('/statistics', profileController.getStatistics);

// Mark profile as complete
router.put('/mark-complete', profileController.markProfileComplete);

// Public routes
router.get('/public/:publisherId', profileController.getPublicProfile);

module.exports = router;
