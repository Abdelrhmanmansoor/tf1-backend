const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/jobPublisherProfileController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'));
    }
  }
});

// Protected routes (require authentication and job-publisher role)
router.use(authenticate);
router.use(authorize('job-publisher', 'club'));

// Create profile
router.post('/create', profileController.createProfile);

// Get profile
router.get('/', profileController.getProfile);

// Update profile
router.put('/', profileController.updateProfile);

// Upload company logo
router.post('/upload-logo', upload.single('logo'), profileController.uploadLogo);

// Upload work environment photos
router.post('/upload-work-photo', upload.single('photo'), profileController.uploadWorkPhoto);

// Upload documents
router.post('/upload-document', upload.single('document'), profileController.uploadDocument);

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
