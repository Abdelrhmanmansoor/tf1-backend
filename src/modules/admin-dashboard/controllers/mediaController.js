const { logAdminAction } = require('../middleware/adminAuth');
const path = require('path');
const fs = require('fs');

// Get all media/assets
exports.getMedia = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (type && ['image', 'video', 'document', 'audio'].includes(type)) {
      filters.type = type;
    }
    if (search) {
      filters.filename = { $regex: search, $options: 'i' };
    }

    // Assuming you have a Media model
    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const media = await Media.find(filters)
      .select('filename filesize type url createdAt uploadedBy')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await Media.countDocuments(filters);

    await logAdminAction(
      req,
      'VIEW_MEDIA',
      'MEDIA',
      null,
      'SUCCESS',
      null,
      'Media library accessed'
    );

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching media',
      error: error.message,
    });
  }
};

// Upload media file
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const file = req.file;
    const fileType = getFileType(file.mimetype);

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum limit of 50MB',
      });
    }

    // Assuming you have a Media model
    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const newMedia = new Media({
      filename: file.originalname,
      filesize: file.size,
      type: fileType,
      mimeType: file.mimetype,
      url: file.path || `/uploads/${file.filename}`,
      uploadedBy: req.adminId,
      metadata: {
        width: file.width,
        height: file.height,
        duration: file.duration,
      },
    });

    const savedMedia = await newMedia.save();

    await logAdminAction(
      req,
      'UPLOAD_MEDIA',
      'MEDIA',
      savedMedia._id,
      'SUCCESS',
      {
        before: {},
        after: {
          filename: file.originalname,
          size: file.size,
          type: fileType,
        },
      },
      `Uploaded media: ${file.originalname}`
    );

    res.status(201).json({
      success: true,
      data: savedMedia,
      message: 'Media uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading media:', error);

    await logAdminAction(
      req,
      'UPLOAD_MEDIA',
      'MEDIA',
      null,
      'FAILED',
      null,
      'Failed to upload media',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error uploading media',
      error: error.message,
    });
  }
};

// Delete media
exports.deleteMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const media = await Media.findById(mediaId).lean();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found',
      });
    }

    // Delete physical file if exists
    if (media.filePath && fs.existsSync(media.filePath)) {
      fs.unlinkSync(media.filePath);
    }

    await Media.findByIdAndDelete(mediaId);

    await logAdminAction(
      req,
      'DELETE_MEDIA',
      'MEDIA',
      mediaId,
      'SUCCESS',
      {
        before: media,
        after: null,
      },
      `Deleted media: ${media.filename}`
    );

    res.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);

    await logAdminAction(
      req,
      'DELETE_MEDIA',
      'MEDIA',
      req.params.mediaId,
      'FAILED',
      null,
      'Failed to delete media',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error deleting media',
      error: error.message,
    });
  }
};

// Get media details
exports.getMediaDetails = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const media = await Media.findById(mediaId)
      .populate('uploadedBy', 'name email')
      .lean();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found',
      });
    }

    await logAdminAction(
      req,
      'VIEW_MEDIA_DETAILS',
      'MEDIA',
      mediaId,
      'SUCCESS',
      null,
      `Media details viewed: ${media.filename}`
    );

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('Error fetching media details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching media details',
      error: error.message,
    });
  }
};

// Bulk delete media
exports.bulkDeleteMedia = async (req, res) => {
  try {
    const { mediaIds } = req.body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Media IDs array is required',
      });
    }

    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const mediaItems = await Media.find({ _id: { $in: mediaIds } }).lean();

    // Delete physical files
    mediaItems.forEach((item) => {
      if (item.filePath && fs.existsSync(item.filePath)) {
        try {
          fs.unlinkSync(item.filePath);
        } catch (err) {
          console.error(`Error deleting file: ${item.filePath}`, err);
        }
      }
    });

    const result = await Media.deleteMany({ _id: { $in: mediaIds } });

    await logAdminAction(
      req,
      'BULK_ACTION',
      'MEDIA',
      null,
      'SUCCESS',
      { before: { count: mediaIds.length }, after: null },
      `Bulk deleted ${result.deletedCount} media items`,
      null,
      null,
      result.deletedCount
    );

    res.json({
      success: true,
      message: `${result.deletedCount} media items deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error bulk deleting media:', error);

    await logAdminAction(
      req,
      'BULK_ACTION',
      'MEDIA',
      null,
      'FAILED',
      null,
      'Failed to bulk delete media',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error bulk deleting media',
      error: error.message,
    });
  }
};

// Get storage statistics
exports.getStorageStats = async (req, res) => {
  try {
    const Media = require('../models/Media') || null;

    if (!Media) {
      return res.status(501).json({
        success: false,
        message: 'Media model not configured',
      });
    }

    const stats = await Media.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$filesize' },
        },
      },
      {
        $sort: { totalSize: -1 },
      },
    ]);

    const totalStats = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$filesize' },
        },
      },
    ]);

    await logAdminAction(
      req,
      'VIEW_SYSTEM',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'Storage statistics accessed'
    );

    res.json({
      success: true,
      data: {
        byType: stats,
        total: totalStats[0] || { totalFiles: 0, totalSize: 0 },
      },
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching storage statistics',
      error: error.message,
    });
  }
};

// Helper function to determine file type
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('spreadsheet')
  )
    return 'document';
  return 'other';
}

module.exports = {
  getMedia: exports.getMedia,
  uploadMedia: exports.uploadMedia,
  deleteMedia: exports.deleteMedia,
  getMediaDetails: exports.getMediaDetails,
  bulkDeleteMedia: exports.bulkDeleteMedia,
  getStorageStats: exports.getStorageStats,
};
