const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// Avatar upload middleware
const uploadAvatar = upload.single('avatar');

// Process and save avatar image
const processAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    // Generate unique filename
    const filename = `avatar-${req.user.id}-${uuidv4()}.webp`;
    const filepath = path.join(avatarsDir, filename);

    // Process image with Sharp
    await sharp(req.file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .webp({
        quality: 80,
        effort: 4
      })
      .toFile(filepath);

    // Generate URL for the uploaded avatar
    const avatarUrl = `/uploads/avatars/${filename}`;
    
    // Attach processed file info to request
    req.processedFile = {
      filename,
      filepath,
      url: avatarUrl
    };

    next();
  } catch (error) {
    console.error('Avatar processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process avatar image',
      code: 'PROCESSING_ERROR'
    });
  }
};

// Cleanup old avatar file
const cleanupOldAvatar = async (oldAvatarUrl) => {
  try {
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const filename = path.basename(oldAvatarUrl);

      // Security: Validate filename to prevent path traversal
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        console.warn('⚠️ Suspicious filename detected in cleanup:', filename);
        return;
      }

      const filepath = path.join(avatarsDir, filename);

      // Security: Ensure the resolved path is within avatarsDir
      if (!filepath.startsWith(avatarsDir)) {
        console.warn('⚠️ Path traversal attempt detected:', filepath);
        return;
      }

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️ Cleaned up old avatar: ${filename}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old avatar:', error);
  }
};

// Error handling middleware for upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.',
        code: 'TOO_MANY_FILES'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Upload error: ' + error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
};

// Serve static files middleware
const serveAvatars = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join(avatarsDir, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      success: false,
      message: 'Avatar not found',
      code: 'AVATAR_NOT_FOUND'
    });
  }
  
  // Set cache headers
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  res.setHeader('ETag', `"${filename}"`);
  
  res.sendFile(filepath);
};

module.exports = {
  uploadAvatar,
  processAvatar,
  cleanupOldAvatar,
  handleUploadError,
  serveAvatars
};