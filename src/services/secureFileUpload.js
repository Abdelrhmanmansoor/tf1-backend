const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

let fileTypeFromBuffer;
const detectFileTypeFromBuffer = async (buffer) => {
  if (!fileTypeFromBuffer) {
    try {
      const mod = await import('file-type');
      fileTypeFromBuffer = mod.fileTypeFromBuffer || mod.fromBuffer;
    } catch (e) {
      void e;
      fileTypeFromBuffer = null;
    }
  }

  if (!fileTypeFromBuffer) return null;
  return fileTypeFromBuffer(buffer);
};

/**
 * SecureFileUploadService
 *
 * Provides secure file upload functionality with multiple security layers:
 * - Magic bytes validation (true file type detection)
 * - Image sanitization using Sharp
 * - Configurable file size limits
 * - Secure filename generation
 * - Cloud storage abstraction (Cloudinary/S3 ready)
 * - Virus scanning integration placeholder
 *
 * @class SecureFileUploadService
 */
class SecureFileUploadService {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 2 * 1024 * 1024; // 2MB default
    this.allowedImageTypes = options.allowedImageTypes || ['image/jpeg', 'image/png', 'image/webp'];
    this.allowedDocumentTypes = options.allowedDocumentTypes || ['application/pdf'];
    this.uploadDir = options.uploadDir || path.join(__dirname, '../../uploads');
    this.cloudinaryEnabled = options.cloudinaryEnabled || false;
    this.s3Enabled = options.s3Enabled || false;
    this.virusScanEnabled = options.virusScanEnabled || false;
  }

  /**
   * Validate file using magic bytes (true file type detection)
   * This prevents MIME type spoofing attacks
   *
   * @param {Buffer} buffer - File buffer
   * @param {Array<string>} allowedTypes - Allowed MIME types
   * @returns {Promise<Object>} File type information
   */
  async validateFileType(buffer, allowedTypes) {
    try {
      const fileTypeResult = await detectFileTypeFromBuffer(buffer);

      if (!fileTypeResult) {
        throw new AppError('Unable to determine file type', 400);
      }

      if (!allowedTypes.includes(fileTypeResult.mime)) {
        throw new AppError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          400
        );
      }

      logger.info(`File type validated: ${fileTypeResult.mime}`);
      return fileTypeResult;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('File type validation error:', error);
      throw new AppError('File validation failed', 400);
    }
  }

  /**
   * Sanitize image using Sharp
   * Removes EXIF data and re-encodes the image
   *
   * @param {Buffer} buffer - Image buffer
   * @param {string} format - Output format (jpeg, png, webp)
   * @returns {Promise<Buffer>} Sanitized image buffer
   */
  async sanitizeImage(buffer, format = 'jpeg') {
    try {
      const sanitized = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }) // Max dimensions
        .toFormat(format, { quality: 85 })
        .toBuffer();

      logger.info('Image sanitized successfully');
      return sanitized;
    } catch (error) {
      logger.error('Image sanitization error:', error);
      throw new AppError('Image processing failed', 400);
    }
  }

  /**
   * Generate secure filename
   * Uses cryptographic random string + timestamp
   *
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {string} Secure filename
   */
  generateSecureFilename(originalName, mimeType) {
    const randomString = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const extension = this.getExtensionFromMime(mimeType);

    return `${timestamp}_${randomString}${extension}`;
  }

  /**
   * Get file extension from MIME type
   *
   * @param {string} mimeType - MIME type
   * @returns {string} File extension with dot
   */
  getExtensionFromMime(mimeType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf'
    };
    return extensions[mimeType] || '';
  }

  /**
   * Scan file for viruses (placeholder for ClamAV integration)
   *
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<boolean>} True if clean, throws if infected
   */
  async scanForViruses(buffer) {
    if (!this.virusScanEnabled) {
      logger.info('Virus scanning disabled');
      return true;
    }

    // TODO: Integrate with ClamAV or similar
    // Example: const clamav = require('clamav.js');
    // const result = await clamav.scanBuffer(buffer);
    // if (result.isInfected) throw new AppError('File infected', 400);

    logger.info('Virus scan passed (placeholder)');
    return true;
  }

  /**
   * Upload to Cloudinary
   *
   * @param {Buffer} buffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadToCloudinary(buffer, options = {}) {
    if (!this.cloudinaryEnabled) {
      throw new AppError('Cloudinary not configured', 500);
    }

    // TODO: Integrate with Cloudinary
    // const cloudinary = require('cloudinary').v2;
    // return new Promise((resolve, reject) => {
    //   cloudinary.uploader.upload_stream(options, (error, result) => {
    //     if (error) reject(error);
    //     else resolve(result);
    //   }).end(buffer);
    // });

    logger.info('Cloudinary upload (placeholder)');
    return {
      url: '/placeholder/cloudinary-url',
      publicId: 'placeholder-id'
    };
  }

  /**
   * Upload to AWS S3
   *
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<Object>} Upload result
   */
  async uploadToS3(buffer, filename, mimeType) {
    if (!this.s3Enabled) {
      throw new AppError('S3 not configured', 500);
    }

    // TODO: Integrate with AWS S3
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3();
    // const params = {
    //   Bucket: process.env.S3_BUCKET,
    //   Key: filename,
    //   Body: buffer,
    //   ContentType: mimeType,
    //   ACL: 'public-read'
    // };
    // const result = await s3.upload(params).promise();
    // return { url: result.Location, key: result.Key };

    logger.info('S3 upload (placeholder)');
    return {
      url: '/placeholder/s3-url',
      key: filename
    };
  }

  /**
   * Save file locally
   *
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Filename
   * @returns {Promise<string>} File path
   */
  async saveLocally(buffer, filename) {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      const filePath = path.join(this.uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      logger.info(`File saved locally: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Local file save error:', error);
      throw new AppError('Failed to save file', 500);
    }
  }

  /**
   * Process and upload image
   * Main entry point for image uploads
   *
   * @param {Object} file - Multer file object
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Upload result
   */
  async processAndUploadImage(file, options = {}) {
    try {
      logger.info(`Processing image upload: ${file.originalname}`);

      // Step 1: Validate file size
      if (file.size > this.maxFileSize) {
        throw new AppError(
          `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`,
          400
        );
      }

      // Step 2: Validate file type using magic bytes
      const fileType = await this.validateFileType(file.buffer, this.allowedImageTypes);

      // Step 3: Scan for viruses
      await this.scanForViruses(file.buffer);

      // Step 4: Sanitize image
      const sanitizedBuffer = await this.sanitizeImage(file.buffer, options.format || 'jpeg');

      // Step 5: Generate secure filename
      const secureFilename = this.generateSecureFilename(file.originalname, fileType.mime);

      // Step 6: Upload based on configuration
      let uploadResult;
      if (this.cloudinaryEnabled) {
        uploadResult = await this.uploadToCloudinary(sanitizedBuffer, options);
      } else if (this.s3Enabled) {
        uploadResult = await this.uploadToS3(sanitizedBuffer, secureFilename, fileType.mime);
      } else {
        const localPath = await this.saveLocally(sanitizedBuffer, secureFilename);
        uploadResult = { url: `/uploads/${secureFilename}`, path: localPath };
      }

      logger.info(`Image upload completed: ${uploadResult.url}`);
      return {
        success: true,
        filename: secureFilename,
        originalName: file.originalname,
        mimeType: fileType.mime,
        size: sanitizedBuffer.length,
        ...uploadResult
      };
    } catch (error) {
      logger.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Process and upload document (PDF)
   *
   * @param {Object} file - Multer file object
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Upload result
   */
  async processAndUploadDocument(file, options = {}) {
    try {
      logger.info(`Processing document upload: ${file.originalname}`);

      // Step 1: Validate file size (5MB for documents)
      const maxDocSize = options.maxSize || 5 * 1024 * 1024;
      if (file.size > maxDocSize) {
        throw new AppError(
          `Document too large. Maximum size: ${maxDocSize / 1024 / 1024}MB`,
          400
        );
      }

      // Step 2: Validate file type using magic bytes
      const fileType = await this.validateFileType(file.buffer, this.allowedDocumentTypes);

      // Step 3: Scan for viruses
      await this.scanForViruses(file.buffer);

      // Step 4: Generate secure filename
      const secureFilename = this.generateSecureFilename(file.originalname, fileType.mime);

      // Step 5: Upload based on configuration
      let uploadResult;
      if (this.cloudinaryEnabled) {
        uploadResult = await this.uploadToCloudinary(file.buffer, { resource_type: 'raw', ...options });
      } else if (this.s3Enabled) {
        uploadResult = await this.uploadToS3(file.buffer, secureFilename, fileType.mime);
      } else {
        const localPath = await this.saveLocally(file.buffer, secureFilename);
        uploadResult = { url: `/uploads/${secureFilename}`, path: localPath };
      }

      logger.info(`Document upload completed: ${uploadResult.url}`);
      return {
        success: true,
        filename: secureFilename,
        originalName: file.originalname,
        mimeType: fileType.mime,
        size: file.size,
        ...uploadResult
      };
    } catch (error) {
      logger.error('Document upload error:', error);
      throw error;
    }
  }

  /**
   * Create Multer middleware for images
   *
   * @param {Object} options - Multer options
   * @returns {Object} Multer middleware
   */
  createImageUploadMiddleware(options = {}) {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.maxFileSize,
        files: options.maxFiles || 1
      },
      fileFilter: (req, file, cb) => {
        // Basic MIME check (will be validated with magic bytes later)
        if (!this.allowedImageTypes.some(type => file.mimetype.startsWith('image/'))) {
          return cb(new AppError('Only image files are allowed', 400), false);
        }
        cb(null, true);
      }
    });
  }

  /**
   * Create Multer middleware for documents
   *
   * @param {Object} options - Multer options
   * @returns {Object} Multer middleware
   */
  createDocumentUploadMiddleware(options = {}) {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: options.maxSize || 5 * 1024 * 1024,
        files: options.maxFiles || 1
      },
      fileFilter: (req, file, cb) => {
        // Basic MIME check (will be validated with magic bytes later)
        if (!this.allowedDocumentTypes.includes(file.mimetype)) {
          return cb(new AppError('Only PDF documents are allowed', 400), false);
        }
        cb(null, true);
      }
    });
  }
}

/**
 * Create pre-configured instances for common use cases
 */

// Profile image upload (2MB, JPEG/PNG/WebP)
const profileImageUploadService = new SecureFileUploadService({
  maxFileSize: 2 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  cloudinaryEnabled: process.env.CLOUDINARY_ENABLED === 'true',
  s3Enabled: process.env.S3_ENABLED === 'true',
  virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true'
});

// Company logo upload (1MB, JPEG/PNG)
const companyLogoUploadService = new SecureFileUploadService({
  maxFileSize: 1 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png'],
  cloudinaryEnabled: process.env.CLOUDINARY_ENABLED === 'true',
  s3Enabled: process.env.S3_ENABLED === 'true',
  virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true'
});

// Document upload (5MB, PDF only)
const documentUploadService = new SecureFileUploadService({
  maxFileSize: 5 * 1024 * 1024,
  allowedDocumentTypes: ['application/pdf'],
  cloudinaryEnabled: process.env.CLOUDINARY_ENABLED === 'true',
  s3Enabled: process.env.S3_ENABLED === 'true',
  virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true'
});

module.exports = {
  SecureFileUploadService,
  profileImageUploadService,
  companyLogoUploadService,
  documentUploadService
};
