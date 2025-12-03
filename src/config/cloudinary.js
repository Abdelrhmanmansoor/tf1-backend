const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ==================== LOCAL FILE STORAGE SYSTEM (REPLACES CLOUDINARY) ====================

// Create upload directories
const uploadsDir = path.join(process.cwd(), 'uploads');
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadsDir);
ensureDir(path.join(uploadsDir, 'avatars'));
ensureDir(path.join(uploadsDir, 'logos'));
ensureDir(path.join(uploadsDir, 'banners'));
ensureDir(path.join(uploadsDir, 'portfolio'));
ensureDir(path.join(uploadsDir, 'documents'));
ensureDir(path.join(uploadsDir, 'resumes'));

// Generate unique filename
const generateFilename = (originalname, prefix = '') => {
  const ext = path.extname(originalname);
  const safeName = path.basename(originalname, ext)
    .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
    .substring(0, 50);
  return `${prefix}${Date.now()}_${uuidv4()}${ext}`;
};

// ==================== UPLOAD FUNCTIONS (LOCAL STORAGE) ====================

/**
 * Upload image to local storage
 */
const uploadToCloudinary = async (buffer, options = {}) => {
  try {
    const folder = options.folder || 'general';
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = options.public_id 
      ? `${options.public_id}.jpg`
      : generateFilename('image.jpg', 'img_');

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      public_id: filename.replace(/\.[^/.]+$/, ''),
      width: options.width || 800,
      height: options.height || 600,
      format: 'jpg',
      bytes: buffer.length,
      resource_type: 'image',
    };
  } catch (error) {
    console.error('Local upload error:', error);
    throw error;
  }
};

/**
 * Delete file from local storage
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    // Search through all subdirectories to find the file
    const searchInDir = (dir) => {
      if (!fs.existsSync(dir)) return false;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (searchInDir(filePath)) return true;
        } else if (file.includes(publicId) || file.startsWith(publicId)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted: ${filePath}`);
          return true;
        }
      }
      return false;
    };

    searchInDir(uploadsDir);
    return { result: 'ok' };
  } catch (error) {
    console.error('Delete error:', error);
    return { result: 'error' };
  }
};

/**
 * Extract public ID from URL
 */
const extractPublicId = (url) => {
  if (!url) return null;
  try {
    // Extract filename from URL like: /uploads/avatars/img_123456_789.jpg
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.[^/.]+$/, '');
  } catch (error) {
    return null;
  }
};

// ==================== SPECIALIZED UPLOAD FUNCTIONS ====================

/**
 * Upload avatar with specific transformations
 */
const uploadAvatar = async (buffer, userId, userRole) => {
  try {
    const folder = `avatars/${userRole}`;
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('avatar.jpg', `avatar_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      thumbnailUrl: url,
      mediumUrl: url,
      largeUrl: url,
      width: 400,
      height: 400,
      format: 'jpg',
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
};

/**
 * Upload club logo
 */
const uploadClubLogo = async (buffer, userId) => {
  try {
    const folder = 'logos/clubs';
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('logo.jpg', `logo_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      smallUrl: url,
      mediumUrl: url,
      largeUrl: url,
      width: 500,
      height: 500,
      format: 'jpg',
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Club logo upload failed:', error);
    throw error;
  }
};

/**
 * Upload club banner
 */
const uploadClubBanner = async (buffer, userId) => {
  try {
    const folder = 'banners/clubs';
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('banner.jpg', `banner_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      mobileUrl: url,
      tabletUrl: url,
      desktopUrl: url,
      width: 1920,
      height: 600,
      format: 'jpg',
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Club banner upload failed:', error);
    throw error;
  }
};

/**
 * Upload specialist avatar
 */
const uploadSpecialistAvatar = async (buffer, userId) => {
  try {
    const folder = 'avatars/specialists';
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('avatar.jpg', `specialist_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      thumbnailUrl: url,
      mediumUrl: url,
      largeUrl: url,
      width: 400,
      height: 400,
      format: 'jpg',
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Specialist avatar upload failed:', error);
    throw error;
  }
};

/**
 * Upload specialist banner
 */
const uploadSpecialistBanner = async (buffer, userId) => {
  try {
    const folder = 'banners/specialists';
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('banner.jpg', `banner_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      mobileUrl: url,
      tabletUrl: url,
      desktopUrl: url,
      width: 1920,
      height: 600,
      format: 'jpg',
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Specialist banner upload failed:', error);
    throw error;
  }
};

/**
 * Upload portfolio image
 */
const uploadPortfolioImage = async (buffer, userId, userRole, imageType = 'general') => {
  try {
    const folder = `portfolio/${userRole}/${userId}`;
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const filename = generateFilename('image.jpg', `${imageType}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      thumbnailUrl: url,
      mediumUrl: url,
      largeUrl: url,
      width: 1200,
      height: 800,
      format: 'jpg',
      bytes: buffer.length,
      type: imageType,
    };
  } catch (error) {
    console.error('Portfolio image upload failed:', error);
    throw error;
  }
};

/**
 * Upload document (PDF, DOC, DOCX)
 */
const uploadDocument = async (buffer, userId, documentType = 'resume', originalFilename = '') => {
  try {
    const folder = `documents/${documentType}`;
    const uploadDir = path.join(uploadsDir, folder);
    ensureDir(uploadDir);

    const ext = path.extname(originalFilename) || '.pdf';
    const filename = generateFilename(originalFilename || `${documentType}${ext}`, `${documentType}_${userId}_`);
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${folder}/${filename}`;
    
    return {
      url: url,
      secure_url: url,
      publicId: filename.replace(/\.[^/.]+$/, ''),
      format: ext.replace('.', ''),
      originalFormat: ext.replace('.', ''),
      bytes: buffer.length,
      resourceType: 'raw',
      originalFilename: originalFilename || filename,
    };
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};

/**
 * Cleanup old images
 */
const cleanupOldImage = async (oldImageUrl) => {
  if (!oldImageUrl) return;

  try {
    const publicId = extractPublicId(oldImageUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId);
      console.log(`Cleanup: Deleted old image ${publicId}`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

/**
 * Get optimized image URL
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  if (!publicId) return null;
  return `/uploads/${publicId}`;
};

/**
 * Validate image file
 */
const validateImageFile = (file) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP files are allowed.');
  }

  if (file.size > maxFileSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  return true;
};

module.exports = {
  cloudinary: null, // Not using Cloudinary anymore
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  uploadAvatar,
  uploadClubLogo,
  uploadClubBanner,
  uploadSpecialistAvatar,
  uploadSpecialistBanner,
  uploadPortfolioImage,
  uploadDocument,
  cleanupOldImage,
  getOptimizedImageUrl,
  validateImageFile,
};
