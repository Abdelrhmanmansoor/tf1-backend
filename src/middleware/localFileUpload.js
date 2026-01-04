const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('📁 Created uploads directory');
}

const resumeDir = path.join(uploadDir, 'resumes');
if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true });
  logger.info('📁 Created resumes directory');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resumeDir);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
      .substring(0, 50);
    
    const filename = `${Date.now()}_${uniqueId}_${safeName}${ext}`;
    logger.debug(`📝 Generating filename: ${filename} from ${file.originalname}`);
    cb(null, filename);
  },
});

/**
 * Enhanced file filter with better validation
 */
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  // Check MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    logger.warn(`❌ Invalid MIME type: ${file.mimetype} for file ${file.originalname}`);
    return cb(
      new Error('نوع الملف غير مسموح. الملفات المسموحة فقط: PDF, DOC, DOCX'),
      false
    );
  }

  // Check file extension
  if (!allowedExtensions.includes(ext)) {
    logger.warn(`❌ Invalid extension: ${ext} for file ${file.originalname}`);
    return cb(
      new Error('امتداد الملف غير مسموح. الامتدادات المسموحة: .pdf, .doc, .docx'),
      false
    );
  }

  // Additional security: Check if filename contains malicious patterns
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    logger.warn(`❌ Suspicious filename detected: ${file.originalname}`);
    return cb(
      new Error('اسم الملف غير صالح'),
      false
    );
  }

  logger.debug(`✅ File validation passed: ${file.originalname}`);
  cb(null, true);
};

const localUpload = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024, // Configurable file size
    files: 1,
  },
});

const uploadResumeLocal = localUpload.single('resume');

/**
 * Enhanced error handling with logging
 */
const handleLocalUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || 10);
      logger.warn(`⚠️ File too large: User=${req.user?._id}`);
      return res.status(400).json({
        success: false,
        message: `حجم الملف كبير جداً. الحد الأقصى ${maxSize}MB`,
        messageEn: `File size too large. Maximum size is ${maxSize}MB`,
        code: 'FILE_TOO_LARGE',
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      logger.warn(`⚠️ Unexpected file field: ${err.field}, User=${req.user?._id}`);
      return res.status(400).json({
        success: false,
        message: 'حقل الملف غير متوقع',
        messageEn: 'Unexpected file field',
        code: 'UNEXPECTED_FIELD',
      });
    }
    
    logger.error(`❌ Multer error: ${err.code}, User=${req.user?._id}`);
    return res.status(400).json({
      success: false,
      message: `خطأ في الرفع: ${err.message}`,
      messageEn: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  } else if (err) {
    logger.error(`❌ Upload failed: ${err.message}, User=${req.user?._id}`);
    return res.status(400).json({
      success: false,
      message: err.message || 'فشل رفع الملف',
      messageEn: err.message || 'File upload failed',
      code: 'UPLOAD_FAILED',
    });
  }
  next();
};

/**
 * Middleware to log successful uploads
 */
const logUploadSuccess = (req, res, next) => {
  if (req.file) {
    logger.logFileUpload(
      req.user?._id,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    );
  }
  next();
};

module.exports = {
  uploadResumeLocal,
  handleLocalUploadError,
  logUploadSuccess,
  resumeDir,
};
