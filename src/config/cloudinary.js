const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Utility function to upload image to Cloudinary
const uploadToCloudinary = async (buffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'image',
        folder: 'sportx-platform', // Organize uploads in a folder
        quality: 'auto', // Automatic quality optimization
        fetch_format: 'auto', // Automatic format optimization
        ...options,
      };

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        })
        .end(buffer);
    });
  } catch (error) {
    console.error('Upload to Cloudinary failed:', error);
    throw error;
  }
};

// Utility function to delete image from Cloudinary
const deleteFromCloudinary = async publicId => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Delete from Cloudinary failed:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
const extractPublicId = cloudinaryUrl => {
  if (!cloudinaryUrl) return null;

  try {
    // Extract public ID from URL like: https://res.cloudinary.com/dsh8xyg9m/image/upload/v1234567890/sportx-platform/avatar_abc123.jpg
    const parts = cloudinaryUrl.split('/');
    const uploadIndex = parts.indexOf('upload');

    if (uploadIndex === -1) return null;

    // Get everything after version number (v1234567890)
    const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');

    // Remove file extension
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');

    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Utility function for avatar uploads with specific transformations
const uploadAvatar = async (buffer, userId, userRole) => {
  try {
    const options = {
      folder: `sportx-platform/avatars/${userRole}`,
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face', // Focus on face if detected
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      // Generate multiple sizes for responsive images
      eager: [
        { width: 150, height: 150, crop: 'fill', gravity: 'face' }, // Thumbnail
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Medium
        { width: 600, height: 600, crop: 'fill', gravity: 'face' }, // Large
      ],
      eager_async: true, // Generate transformations asynchronously
      tags: ['avatar', userRole, 'profile'], // Add tags for organization
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
      mediumUrl: result.eager?.[1]?.secure_url || result.secure_url,
      largeUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
};

// Utility function for club logos with specific transformations
const uploadClubLogo = async (buffer, userId) => {
  try {
    const options = {
      folder: 'sportx-platform/logos/clubs',
      public_id: `logo_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 500,
          height: 500,
          crop: 'fit', // Maintain aspect ratio
          background: 'white', // Add white background if needed
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      eager: [
        { width: 100, height: 100, crop: 'fit' }, // Small
        { width: 200, height: 200, crop: 'fit' }, // Medium
        { width: 400, height: 400, crop: 'fit' }, // Large
      ],
      eager_async: true,
      tags: ['logo', 'club', 'branding'],
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      smallUrl: result.eager?.[0]?.secure_url || result.secure_url,
      mediumUrl: result.eager?.[1]?.secure_url || result.secure_url,
      largeUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Club logo upload failed:', error);
    throw error;
  }
};

// Utility function for club banners with specific transformations
const uploadClubBanner = async (buffer, userId) => {
  try {
    const options = {
      folder: 'sportx-platform/banners/clubs',
      public_id: `banner_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 1920,
          height: 600,
          crop: 'fill', // Fill the banner area
          gravity: 'center', // Center the image
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      eager: [
        { width: 640, height: 200, crop: 'fill', gravity: 'center' }, // Mobile
        { width: 1024, height: 320, crop: 'fill', gravity: 'center' }, // Tablet
        { width: 1920, height: 600, crop: 'fill', gravity: 'center' }, // Desktop
      ],
      eager_async: true,
      tags: ['banner', 'club', 'cover'],
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      mobileUrl: result.eager?.[0]?.secure_url || result.secure_url,
      tabletUrl: result.eager?.[1]?.secure_url || result.secure_url,
      desktopUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Club banner upload failed:', error);
    throw error;
  }
};

// Utility function for specialist avatar with specific transformations
const uploadSpecialistAvatar = async (buffer, userId) => {
  try {
    const options = {
      folder: 'sportx-platform/avatars/specialists',
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face', // Focus on face if detected
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      eager: [
        { width: 150, height: 150, crop: 'fill', gravity: 'face' }, // Thumbnail
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Medium
        { width: 600, height: 600, crop: 'fill', gravity: 'face' }, // Large
      ],
      eager_async: true,
      tags: ['avatar', 'specialist', 'profile'],
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
      mediumUrl: result.eager?.[1]?.secure_url || result.secure_url,
      largeUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Specialist avatar upload failed:', error);
    throw error;
  }
};

// Utility function for specialist banner with specific transformations
const uploadSpecialistBanner = async (buffer, userId) => {
  try {
    const options = {
      folder: 'sportx-platform/banners/specialists',
      public_id: `banner_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 1920,
          height: 600,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      eager: [
        { width: 640, height: 200, crop: 'fill', gravity: 'center' }, // Mobile
        { width: 1024, height: 320, crop: 'fill', gravity: 'center' }, // Tablet
        { width: 1920, height: 600, crop: 'fill', gravity: 'center' }, // Desktop
      ],
      eager_async: true,
      tags: ['banner', 'specialist', 'cover'],
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      mobileUrl: result.eager?.[0]?.secure_url || result.secure_url,
      tabletUrl: result.eager?.[1]?.secure_url || result.secure_url,
      desktopUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Specialist banner upload failed:', error);
    throw error;
  }
};

// Utility function for portfolio images
const uploadPortfolioImage = async (
  buffer,
  userId,
  userRole,
  imageType = 'general'
) => {
  try {
    const options = {
      folder: `sportx-platform/portfolio/${userRole}/${userId}`,
      public_id: `${imageType}_${Date.now()}`,
      transformation: [
        {
          width: 1200,
          height: 800,
          crop: 'limit', // Don't upscale
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
      eager: [
        { width: 300, height: 200, crop: 'fill' }, // Thumbnail
        { width: 600, height: 400, crop: 'fill' }, // Medium
        { width: 1200, height: 800, crop: 'limit' }, // Large
      ],
      eager_async: true,
      tags: ['portfolio', userRole, imageType],
    };

    const result = await uploadToCloudinary(buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
      mediumUrl: result.eager?.[1]?.secure_url || result.secure_url,
      largeUrl: result.eager?.[2]?.secure_url || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      type: imageType,
    };
  } catch (error) {
    console.error('Portfolio image upload failed:', error);
    throw error;
  }
};

// Cleanup old images when user updates their avatar/logo
const cleanupOldImage = async oldImageUrl => {
  if (!oldImageUrl) return;

  try {
    const publicId = extractPublicId(oldImageUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId);
      console.log(`Successfully deleted old image: ${publicId}`);
    }
  } catch (error) {
    console.error('Failed to cleanup old image:', error);
    // Don't throw error - image cleanup failure shouldn't block the upload
  }
};

// Get optimized image URL with transformations
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  if (!publicId) return null;

  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto',
  };

  const finalTransformations = {
    ...defaultTransformations,
    ...transformations,
  };

  return cloudinary.url(publicId, finalTransformations);
};

// Validate image file
const validateImageFile = file => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      'Invalid file type. Only JPEG, PNG, GIF, and WebP files are allowed.'
    );
  }

  if (file.size > maxFileSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  return true;
};

// Upload document (PDF, DOC, DOCX) to Cloudinary
const uploadDocument = async (
  buffer,
  userId,
  documentType = 'resume',
  originalFilename = ''
) => {
  try {
    return new Promise((resolve, reject) => {
      const options = {
        resource_type: 'raw', // 'raw' for non-image/video files
        folder: `sportx-platform/documents/${documentType}`,
        public_id: `${documentType}_${userId}_${Date.now()}`,
        tags: [documentType, 'application', 'document'],
      };

      cloudinary.uploader
        .upload_stream(options, (error, result) => {
          if (error) {
            console.error('Cloudinary document upload error:', error);
            reject(error);
          } else {
            // Extract original file extension
            const fileExtension = originalFilename
              ? originalFilename.split('.').pop()
              : result.format;

            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              originalFormat: fileExtension,
              bytes: result.bytes,
              resourceType: result.resource_type,
              originalFilename:
                originalFilename ||
                `${documentType}_${userId}.${fileExtension}`,
            });
          }
        })
        .end(buffer);
    });
  } catch (error) {
    console.error('Document upload to Cloudinary failed:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
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
