const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'audio'],
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
      unique: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    // For images
    dimensions: {
      width: Number,
      height: Number,
    },

    // For videos
    duration: Number,
    thumbnail: String,

    // Metadata
    caption: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    tags: [String],

    // Usage tracking
    usedIn: [
      {
        entityType: {
          type: String,
          enum: ['profile', 'post', 'message', 'review', 'session', 'other'],
        },
        entityId: mongoose.Schema.Types.ObjectId,
      },
    ],

    isPublic: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
mediaSchema.index({ userId: 1, fileType: 1 });
mediaSchema.index({ userId: 1, createdAt: -1 });

// Statics

// Get user's media library
mediaSchema.statics.getUserMedia = async function (userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    fileType,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const query = {
    userId,
    isDeleted: false,
  };

  if (fileType) {
    query.fileType = fileType;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [media, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);

  return {
    media,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

// Get storage usage by user
mediaSchema.statics.getUserStorageUsage = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$fileType',
        totalSize: { $sum: '$fileSize' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    total: 0,
    byType: {},
  };

  result.forEach(item => {
    summary.byType[item._id] = {
      size: item.totalSize,
      count: item.count,
    };
    summary.total += item.totalSize;
  });

  return summary;
};

// Methods

// Soft delete
mediaSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

// Track usage
mediaSchema.methods.trackUsage = function (entityType, entityId) {
  const exists = this.usedIn.some(
    usage =>
      usage.entityType === entityType &&
      usage.entityId.toString() === entityId.toString()
  );

  if (!exists) {
    this.usedIn.push({ entityType, entityId });
    return this.save();
  }

  return this;
};

// Remove usage
mediaSchema.methods.removeUsage = function (entityType, entityId) {
  this.usedIn = this.usedIn.filter(
    usage =>
      !(
        usage.entityType === entityType &&
        usage.entityId.toString() === entityId.toString()
      )
  );
  return this.save();
};

module.exports = mongoose.model('Media', mediaSchema);
