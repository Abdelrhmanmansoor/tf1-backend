const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure logos directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const logosDir = path.join(uploadsDir, 'logos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Multer configuration for memory storage (للمعالجة بـ Sharp)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.'
      ),
      false
    );
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
});

// Logo upload middleware
const uploadLogo = upload.single('logo');

// Process and save logo image
const processLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided',
        messageAr: 'لم يتم تحميل ملف الشعار',
        code: 'NO_FILE',
      });
    }

    const timestamp = Date.now();
    const userId = req.user?.id || req.user?._id || 'unknown';

    // Generate unique filename
    const filename = `logo-${userId}-${timestamp}-${uuidv4()}.webp`;
    const filepath = path.join(logosDir, filename);

    console.log(`📤 Processing logo upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Process image with Sharp (optimize and convert to WebP)
    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'contain', // Maintain aspect ratio
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toFile(filepath);

    // Generate URL for the uploaded logo
    const apiBaseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${apiBaseUrl}/uploads/logos/${filename}`;

    // Attach processed file info to request
    req.processedFile = {
      filename,
      filepath,
      url: logoUrl,
      localPath: filepath,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: 'image/webp'
    };

    console.log(`✅ Logo processed successfully: ${filename}`);
    next();
  } catch (error) {
    console.error('❌ Logo processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process logo image',
      messageAr: 'فشلت معالجة الشعار',
      error: error.message,
      code: 'PROCESSING_ERROR',
    });
  }
};

// Cleanup old logo file
const cleanupOldLogo = async (oldLogoUrl) => {
  try {
    if (!oldLogoUrl) return;

    // Extract filename from URL
    let filename = null;

    if (oldLogoUrl.startsWith('http://') || oldLogoUrl.startsWith('https://')) {
      // Full URL - extract filename
      const urlParts = oldLogoUrl.split('/');
      filename = urlParts[urlParts.length - 1];
    } else if (oldLogoUrl.startsWith('/uploads/logos/')) {
      // Relative path
      filename = path.basename(oldLogoUrl);
    } else {
      return; // Unknown format
    }

    // Security: Validate filename to prevent path traversal
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      console.warn('⚠️ Suspicious filename detected in cleanup:', filename);
      return;
    }

    const filepath = path.join(logosDir, filename);

    // Security: Ensure the resolved path is within logosDir
    if (!filepath.startsWith(logosDir)) {
      console.warn('⚠️ Path traversal attempt detected:', filepath);
      return;
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`🗑️ Cleaned up old logo: ${filename}`);
    }
  } catch (error) {
    console.error('Error cleaning up old logo:', error);
  }
};

// Error handling middleware for upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
        messageAr: 'الملف كبير جداً. الحد الأقصى 5 ميجابايت.',
        code: 'FILE_TOO_LARGE',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.',
        messageAr: 'ملفات كثيرة. ملف واحد فقط مسموح.',
        code: 'TOO_MANY_FILES',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Upload error: ' + error.message,
      messageAr: 'خطأ في التحميل: ' + error.message,
      code: 'UPLOAD_ERROR',
    });
  }

  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      messageAr: 'نوع الملف غير صحيح. يُسمح فقط بصور JPEG, PNG, WebP, SVG.',
      code: 'INVALID_FILE_TYPE',
    });
  }

  next(error);
};

// Serve logos middleware (if needed)
const serveLogo = (req, res, next) => {
  const filename = req.params.filename;

  // Security: Validate filename
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid filename',
      code: 'INVALID_FILENAME'
    });
  }

  const filepath = path.join(logosDir, filename);

  // Security: Ensure path is within logosDir
  if (!filepath.startsWith(logosDir)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      success: false,
      message: 'Logo not found',
      code: 'LOGO_NOT_FOUND',
    });
  }

  // Set cache headers (1 year for logos)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${filename}"`);

  // Determine MIME type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.sendFile(filepath);
};

module.exports = {
  uploadLogo,
  processLogo,
  cleanupOldLogo,
  handleUploadError,
  serveLogo,
};
