const multer = require('multer');
const {
  uploadAvatar: uploadAvatarToCloudinary,
  uploadClubLogo,
  uploadClubBanner,
  uploadPortfolioImage,
  cleanupOldImage,
  validateImageFile,
} = require('../config/cloudinary');

// Multer configuration for memory storage (required for Cloudinary)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  try {
    validateImageFile(file);
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// File filter for documents (PDF, DOC, DOCX)
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDF, DOC, and DOCX files are allowed for resumes.'
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

// Avatar upload middleware
const uploadAvatar = upload.single('avatar');

// Logo upload middleware
const uploadLogo = upload.single('logo');

// Banner upload middleware
const uploadBanner = upload.single('banner');

// Document upload configuration (for resumes, CVs)
const documentUpload = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
    files: 1,
  },
});

// Resume upload middleware
const uploadResume = documentUpload.single('resume');

// Process and upload avatar to Cloudinary
const processAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    // Upload to Cloudinary based on user role
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    let result;

    if (userRole === 'club') {
      // Upload as club logo
      result = await uploadClubLogo(req.file.buffer, userId);
    } else {
      // Upload as user avatar
      result = await uploadAvatarToCloudinary(
        req.file.buffer,
        userId,
        userRole
      );
    }

    // Attach processed file info to request
    req.processedFile = {
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl || result.smallUrl,
      mediumUrl: result.mediumUrl,
      largeUrl: result.largeUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };

    next();
  } catch (error) {
    console.error('Avatar upload to Cloudinary error:', error);

    // Handle specific Cloudinary errors
    if (error.error && error.error.message) {
      return res.status(400).json({
        success: false,
        message: `Upload failed: ${error.error.message}`,
        code: 'CLOUDINARY_ERROR',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar image',
      code: 'UPLOAD_ERROR',
    });
  }
};

// Process and upload logo to Cloudinary
const processLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided',
        code: 'NO_FILE',
      });
    }

    const userId = req.user.id || req.user._id;
    const result = await uploadClubLogo(req.file.buffer, userId);

    req.processedFile = {
      url: result.url,
      publicId: result.publicId,
      smallUrl: result.smallUrl,
      mediumUrl: result.mediumUrl,
      largeUrl: result.largeUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };

    next();
  } catch (error) {
    console.error('Logo upload to Cloudinary error:', error);

    if (error.error && error.error.message) {
      return res.status(400).json({
        success: false,
        message: `Upload failed: ${error.error.message}`,
        code: 'CLOUDINARY_ERROR',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload logo image',
      code: 'UPLOAD_ERROR',
    });
  }
};

// Process and upload banner to Cloudinary
const processBanner = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No banner file provided',
        code: 'NO_FILE',
      });
    }

    const userId = req.user.id || req.user._id;
    const result = await uploadClubBanner(req.file.buffer, userId);

    req.processedFile = {
      url: result.url,
      publicId: result.publicId,
      mobileUrl: result.mobileUrl,
      tabletUrl: result.tabletUrl,
      desktopUrl: result.desktopUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };

    next();
  } catch (error) {
    console.error('Banner upload to Cloudinary error:', error);

    if (error.error && error.error.message) {
      return res.status(400).json({
        success: false,
        message: `Upload failed: ${error.error.message}`,
        code: 'CLOUDINARY_ERROR',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload banner image',
      code: 'UPLOAD_ERROR',
    });
  }
};

// Portfolio image upload middleware
const uploadPortfolio = upload.array('images', 5); // Allow up to 5 images

// Process and upload portfolio images to Cloudinary
const processPortfolioImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
        code: 'NO_FILES',
      });
    }

    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;
    const imageType = req.body.imageType || 'portfolio';

    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const result = await uploadPortfolioImage(
          file.buffer,
          userId,
          userRole,
          `${imageType}_${index}`
        );
        return {
          url: result.url,
          publicId: result.publicId,
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
          largeUrl: result.largeUrl,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          type: result.type,
        };
      } catch (error) {
        console.error(`Failed to upload image ${index}:`, error);
        throw error;
      }
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Attach processed files info to request
    req.processedFiles = uploadedImages;

    next();
  } catch (error) {
    console.error('Portfolio images upload to Cloudinary error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to upload portfolio images',
      code: 'UPLOAD_ERROR',
    });
  }
};

// Cleanup old avatar/logo from Cloudinary
const cleanupOldAvatar = async oldImageUrl => {
  try {
    if (oldImageUrl) {
      await cleanupOldImage(oldImageUrl);
      console.log(`🗑️ Cleaned up old image from Cloudinary: ${oldImageUrl}`);
    }
  } catch (error) {
    console.error('Error cleaning up old image from Cloudinary:', error);
    // Don't throw error - cleanup failure shouldn't block the upload
  }
};

// Error handling middleware for upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.',
        code: 'TOO_MANY_FILES',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Upload error: ' + error.message,
      code: 'UPLOAD_ERROR',
    });
  }

  if (
    error.message.includes('Invalid file type') ||
    error.message.includes('File size too large')
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE',
    });
  }

  next(error);
};

// Middleware to validate image upload request
const validateImageUpload = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  next();
};

// Middleware for handling multiple upload types
const handleImageUpload = (uploadType = 'avatar') => {
  return (req, res, next) => {
    req.uploadType = uploadType;
    next();
  };
};

// Cover image upload middleware (for blog articles)
const uploadCoverImage = upload.single('coverImage');

// Process and upload cover image to Cloudinary
const processCoverImage = async (req, res, next) => {
  try {
    if (!req.file) {
      // Cover image is optional
      return next();
    }

    const userId = req.user.id || req.user._id;
    const result = await uploadPortfolioImage(req.file.buffer, userId, 'blog', 'cover');

    req.processedFile = {
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl,
      mediumUrl: result.mediumUrl,
      largeUrl: result.largeUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };

    next();
  } catch (error) {
    console.error('Cover image upload error:', error);
    next(error);
  }
};

module.exports = {
  uploadAvatar,
  processAvatar,
  uploadLogo,
  processLogo,
  uploadBanner,
  processBanner,
  uploadPortfolio,
  processPortfolioImages,
  uploadResume,
  uploadCoverImage,
  processCoverImage,
  cleanupOldAvatar,
  handleUploadError,
  validateImageUpload,
  handleImageUpload,
};
