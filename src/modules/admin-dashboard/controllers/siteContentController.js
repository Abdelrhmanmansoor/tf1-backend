/**
 * Site Content Management Controller
 * Allows real control over header, footer, and site texts
 */

const { logAdminAction } = require('../middleware/adminAuth');
const mongoose = require('mongoose');

// Site Content Schema
const siteContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['header', 'footer', 'text', 'banner', 'notification'],
    required: true,
    index: true,
  },
  key: {
    type: String,
    required: true,
    index: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Can be string, object, or array
    required: true,
  },
  language: {
    type: String,
    default: 'ar',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Create model if it doesn't exist
let SiteContent;
try {
  SiteContent = mongoose.model('SiteContent');
} catch (e) {
  SiteContent = mongoose.model('SiteContent', siteContentSchema);
}

// ==================== GET SITE CONTENT ====================

exports.getSiteContent = async (req, res) => {
  try {
    const { type, key, language } = req.query;
    const filters = { isActive: true };

    if (type) filters.type = type;
    if (key) filters.key = key;
    if (language) filters.language = language;

    const content = await SiteContent.find(filters).sort({ createdAt: -1 }).lean();

    await logAdminAction(
      req,
      'VIEW_SITE_CONTENT',
      'SITE_CONTENT',
      null,
      'SUCCESS',
      null,
      'Site content accessed'
    );

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('Error fetching site content:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site content',
      error: error.message,
    });
  }
};

// ==================== UPDATE SITE CONTENT ====================

exports.updateSiteContent = async (req, res) => {
  try {
    const { type, key, content, language = 'ar', metadata } = req.body;

    if (!type || !key || !content) {
      return res.status(400).json({
        success: false,
        message: 'Type, key, and content are required',
      });
    }

    // Find existing content
    let siteContent = await SiteContent.findOne({ type, key, language });

    const oldContent = siteContent ? { ...siteContent.toObject() } : null;

    if (siteContent) {
      // Update existing
      siteContent.content = content;
      siteContent.isActive = true;
      if (metadata) siteContent.metadata = metadata;
      await siteContent.save();
    } else {
      // Create new
      siteContent = new SiteContent({
        type,
        key,
        content,
        language,
        metadata,
        isActive: true,
      });
      await siteContent.save();
    }

    await logAdminAction(
      req,
      'UPDATE_SITE_CONTENT',
      'SITE_CONTENT',
      siteContent._id,
      'SUCCESS',
      {
        before: oldContent,
        after: siteContent.toObject(),
      },
      `Updated site content: ${type}/${key}`
    );

    res.json({
      success: true,
      data: siteContent,
      message: 'Site content updated successfully',
    });
  } catch (error) {
    console.error('Error updating site content:', error);

    await logAdminAction(
      req,
      'UPDATE_SITE_CONTENT',
      'SITE_CONTENT',
      null,
      'FAILED',
      null,
      'Failed to update site content',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error updating site content',
      error: error.message,
    });
  }
};

// ==================== DELETE SITE CONTENT ====================

exports.deleteSiteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const siteContent = await SiteContent.findById(id);

    if (!siteContent) {
      return res.status(404).json({
        success: false,
        message: 'Site content not found',
      });
    }

    const oldContent = { ...siteContent.toObject() };
    await siteContent.deleteOne();

    await logAdminAction(
      req,
      'DELETE_SITE_CONTENT',
      'SITE_CONTENT',
      id,
      'SUCCESS',
      {
        before: oldContent,
        after: null,
      },
      `Deleted site content: ${siteContent.type}/${siteContent.key}`
    );

    res.json({
      success: true,
      message: 'Site content deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting site content:', error);

    await logAdminAction(
      req,
      'DELETE_SITE_CONTENT',
      'SITE_CONTENT',
      req.params.id,
      'FAILED',
      null,
      'Failed to delete site content',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error deleting site content',
      error: error.message,
    });
  }
};

// ==================== BULK UPDATE ====================

exports.bulkUpdateSiteContent = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { type, key, content, language }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
      });
    }

    const results = [];

    for (const update of updates) {
      const { type, key, content, language = 'ar', metadata } = update;

      if (!type || !key || !content) {
        results.push({
          type,
          key,
          success: false,
          error: 'Missing required fields',
        });
        continue;
      }

      try {
        let siteContent = await SiteContent.findOne({ type, key, language });

        if (siteContent) {
          siteContent.content = content;
          if (metadata) siteContent.metadata = metadata;
          await siteContent.save();
        } else {
          siteContent = new SiteContent({
            type,
            key,
            content,
            language,
            metadata,
            isActive: true,
          });
          await siteContent.save();
        }

        results.push({
          type,
          key,
          success: true,
          id: siteContent._id,
        });
      } catch (error) {
        results.push({
          type,
          key,
          success: false,
          error: error.message,
        });
      }
    }

    await logAdminAction(
      req,
      'BULK_UPDATE_SITE_CONTENT',
      'SITE_CONTENT',
      null,
      'SUCCESS',
      null,
      `Bulk updated ${results.filter((r) => r.success).length} items`
    );

    res.json({
      success: true,
      data: results,
      message: `Updated ${results.filter((r) => r.success).length} items`,
    });
  } catch (error) {
    console.error('Error bulk updating site content:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating site content',
      error: error.message,
    });
  }
};

module.exports = {
  getSiteContent: exports.getSiteContent,
  updateSiteContent: exports.updateSiteContent,
  deleteSiteContent: exports.deleteSiteContent,
  bulkUpdateSiteContent: exports.bulkUpdateSiteContent,
};

