const Media = require('../models/Media');
const BlockedUser = require('../models/BlockedUser');
const Report = require('../models/Report');
const User = require('../modules/shared/models/User');
const multer = require('multer');
const path = require('path');

// ==================== FILE UPLOAD & MEDIA MANAGEMENT ====================

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
  };

  const allAllowed = Object.values(allowedTypes).flat();

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// @desc    Upload image
// @route   POST /api/v1/global/upload/image
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // In production, upload to Cloudinary/S3
    // For now, save file info to database
    const media = await Media.create({
      userId: req.user._id,
      fileType: 'image',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      publicId: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caption: req.body.caption,
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    res.status(201).json({
      success: true,
      data: {
        url: media.fileUrl,
        publicId: media.publicId,
        mediaId: media._id
      }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// @desc    Upload video
// @route   POST /api/v1/global/upload/video
// @access  Private
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const media = await Media.create({
      userId: req.user._id,
      fileType: 'video',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      publicId: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caption: req.body.caption,
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    res.status(201).json({
      success: true,
      data: {
        url: media.fileUrl,
        publicId: media.publicId,
        mediaId: media._id
      }
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: error.message
    });
  }
};

// @desc    Upload document
// @route   POST /api/v1/global/upload/document
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const media = await Media.create({
      userId: req.user._id,
      fileType: 'document',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      publicId: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    res.status(201).json({
      success: true,
      data: {
        url: media.fileUrl,
        publicId: media.publicId,
        fileName: media.originalName,
        mediaId: media._id
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
      error: error.message
    });
  }
};

// @desc    Get user's media library
// @route   GET /api/v1/global/media
// @access  Private
exports.getMediaLibrary = async (req, res) => {
  try {
    const { page, limit, fileType, sortBy, sortOrder } = req.query;

    const result = await Media.getUserMedia(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      fileType,
      sortBy,
      sortOrder
    });

    res.status(200).json({
      success: true,
      count: result.media.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      hasMore: result.hasMore,
      data: result.media
    });

  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching media library',
      error: error.message
    });
  }
};

// @desc    Get storage usage
// @route   GET /api/v1/global/media/storage
// @access  Private
exports.getStorageUsage = async (req, res) => {
  try {
    const usage = await Media.getUserStorageUsage(req.user._id);

    res.status(200).json({
      success: true,
      data: usage
    });

  } catch (error) {
    console.error('Error fetching storage usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching storage usage',
      error: error.message
    });
  }
};

// @desc    Delete media file
// @route   DELETE /api/v1/global/media/:id
// @access  Private
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    await media.softDelete();

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting media',
      error: error.message
    });
  }
};

// ==================== LOCATION & GEOCODING ====================

// @desc    Geocode address to coordinates
// @route   POST /api/v1/global/location/geocode
// @access  Public
exports.geocodeAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    // In production, use Google Maps API or similar
    // Mock response for now
    res.status(200).json({
      success: true,
      data: {
        lat: 30.0444,
        lng: 31.2357,
        formatted: address
      }
    });

  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({
      success: false,
      message: 'Error geocoding address',
      error: error.message
    });
  }
};

// @desc    Reverse geocode coordinates to address
// @route   POST /api/v1/global/location/reverse-geocode
// @access  Public
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // In production, use Google Maps API or similar
    // Mock response for now
    res.status(200).json({
      success: true,
      data: {
        city: 'Cairo',
        country: 'Egypt',
        formatted: 'Cairo, Egypt'
      }
    });

  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverse geocoding',
      error: error.message
    });
  }
};

// ==================== LANGUAGE & LOCALIZATION ====================

// @desc    Update user language preference
// @route   PUT /api/v1/global/language
// @access  Private
exports.updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;

    if (!['en', 'ar'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Must be "en" or "ar"'
      });
    }

    req.user.language = language;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Language preference updated',
      data: {
        language: req.user.language
      }
    });

  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating language',
      error: error.message
    });
  }
};

// ==================== BLOCKING & REPORTING ====================

// @desc    Block a user
// @route   POST /api/v1/global/block/:userId
// @access  Private
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await BlockedUser.blockUser(req.user._id, userId, reason);

    res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking user',
      error: error.message
    });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/v1/global/block/:userId
// @access  Private
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await BlockedUser.unblockUser(req.user._id, userId);

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });

  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking user',
      error: error.message
    });
  }
};

// @desc    Get blocked users
// @route   GET /api/v1/global/blocked
// @access  Private
exports.getBlockedUsers = async (req, res) => {
  try {
    const blockedUsers = await BlockedUser.getBlockedUsers(req.user._id);

    res.status(200).json({
      success: true,
      count: blockedUsers.length,
      data: blockedUsers
    });

  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blocked users',
      error: error.message
    });
  }
};

// @desc    Report content
// @route   POST /api/v1/global/report
// @access  Private
exports.reportContent = async (req, res) => {
  try {
    const {
      reportType,
      reportedEntityId,
      reportedEntityModel,
      reason,
      details
    } = req.body;

    if (!reportType || !reportedEntityId || !reportedEntityModel || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if already reported
    const alreadyReported = await Report.hasUserReported(
      req.user._id,
      reportedEntityId,
      reportType
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this content'
      });
    }

    // Determine priority based on reason
    let priority = 'medium';
    if (['violence', 'hate_speech', 'harassment'].includes(reason)) {
      priority = 'high';
    } else if (reason === 'scam') {
      priority = 'critical';
    }

    await Report.create({
      reporterId: req.user._id,
      reportType,
      reportedEntityId,
      reportedEntityModel,
      reason,
      details,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.'
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
};

// ==================== ANALYTICS ====================

// @desc    Get profile views
// @route   GET /api/v1/global/analytics/profile-views
// @access  Private
exports.getProfileViews = async (req, res) => {
  try {
    // Mock data - in production, implement actual analytics
    res.status(200).json({
      success: true,
      data: {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        trend: 'stable'
      }
    });

  } catch (error) {
    console.error('Error fetching profile views:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile views',
      error: error.message
    });
  }
};

// @desc    Get search appearances
// @route   GET /api/v1/global/analytics/search-appearances
// @access  Private
exports.getSearchAppearances = async (req, res) => {
  try {
    // Mock data - in production, implement actual analytics
    res.status(200).json({
      success: true,
      data: {
        total: 0,
        thisWeek: 0,
        thisMonth: 0
      }
    });

  } catch (error) {
    console.error('Error fetching search appearances:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching search appearances',
      error: error.message
    });
  }
};

// ==================== UNIVERSAL PROFILE ====================

// @desc    Get any user's profile by ID (auto-detects role)
// @route   GET /api/v1/global/profile/:id
// @access  Private
exports.getUniversalProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Import profile models
    const PlayerProfile = require('../modules/player/models/PlayerProfile');
    const CoachProfile = require('../modules/coach/models/CoachProfile');
    const SpecialistProfile = require('../modules/specialist/models/SpecialistProfile');
    const ClubProfile = require('../modules/club/models/ClubProfile');

    // Try to find the profile in each collection
    // Note: Not specifying select fields in populate to ensure all User fields are included (including null values like avatar)
    const [playerProfile, coachProfile, specialistProfile, clubProfile] = await Promise.all([
      PlayerProfile.findById(id).populate('userId'),
      CoachProfile.findById(id).populate('userId'),
      SpecialistProfile.findById(id).populate('userId'),
      ClubProfile.findById(id).populate('userId')
    ]);

    // Determine which profile was found and return it
    if (playerProfile) {
      return res.json({
        success: true,
        role: 'player',
        profile: playerProfile
      });
    }

    if (coachProfile) {
      return res.json({
        success: true,
        role: 'coach',
        profile: coachProfile
      });
    }

    if (specialistProfile) {
      return res.json({
        success: true,
        role: 'specialist',
        profile: specialistProfile
      });
    }

    if (clubProfile) {
      return res.json({
        success: true,
        role: 'club',
        profile: clubProfile
      });
    }

    // Profile not found in any collection
    return res.status(404).json({
      success: false,
      message: 'Profile not found'
    });

  } catch (error) {
    console.error('Error fetching universal profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};
