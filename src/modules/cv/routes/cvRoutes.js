const express = require('express');
const cvController = require('../controllers/cvController');
const auth = require('../../../middleware/auth');
const { aiRateLimiter, uploadRateLimiter } = require('../../../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../utils/logger');

// Configure multer for CV file uploads
const cvUploadDir = path.join(process.cwd(), 'uploads', 'cv');
if (!fs.existsSync(cvUploadDir)) {
  fs.mkdirSync(cvUploadDir, { recursive: true });
  logger.info('📁 Created CV uploads directory');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cvUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
      .substring(0, 50);
    
    const filename = `cv_${Date.now()}_${uniqueId}_${safeName}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    return cb(new Error('نوع الملف غير مسموح. الملفات المسموحة: PDF, DOC, DOCX'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_CV_FILE_SIZE_MB || 10) * 1024 * 1024, // 10MB default
  },
});

const router = express.Router();

// Public routes (no auth required for guest users)
router.post('/', cvController.createOrUpdateCV);
router.get('/:id', cvController.getCV);
router.get('/:id/pdf', cvController.generatePDF);
router.post('/generate-pdf', cvController.generatePDF);

// Authenticated routes
router.get('/', auth.authenticate, cvController.listCVs);
router.delete('/:id', auth.authenticate, cvController.deleteCV);
router.post('/:id/duplicate', auth.optionalAuth, cvController.duplicateCV);
router.get('/stats/summary', auth.authenticate, cvController.getCVStats);

// File upload/download
router.post(
  '/upload', 
  auth.optionalAuth,
  uploadRateLimiter,
  upload.single('cvFile'),
  cvController.uploadCVFile
);
router.get(
  '/:cvId/download',
  auth.authenticate,
  cvController.downloadCVFile
);

// AI-powered features with rate limiting
router.post('/ai/generate', aiRateLimiter, cvController.aiGenerate);
router.get('/ai/status', cvController.getAIStatus);

module.exports = router;
