const mongoose = require('mongoose');

/**
 * SavedJob Model
 * Allows applicants to bookmark/save jobs for later application
 */
const savedJobSchema = new mongoose.Schema(
  {
    // User who saved the job
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Job that was saved
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },

    // Optional note from user
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Tags for organization
    tags: [{
      type: String,
      trim: true,
    }],

    // Reminder settings
    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },
      date: Date,
      sent: {
        type: Boolean,
        default: false,
      },
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Metadata
    savedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true }); // Prevent duplicate saves
savedJobSchema.index({ userId: 1, isDeleted: 1, savedAt: -1 });
savedJobSchema.index({ userId: 1, isDeleted: 1, priority: -1 });

// Statics

/**
 * Get saved jobs for a user
 * @param {ObjectId} userId
 * @param {Object} options - { page, limit, priority, tags }
 * @returns {Promise}
 */
savedJobSchema.statics.getUserSavedJobs = async function (userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    priority,
    tags,
    sortBy = 'savedAt',
    order = 'desc',
  } = options;

  const query = {
    userId,
    isDeleted: false,
  };

  if (priority) {
    query.priority = priority;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  const skip = (page - 1) * limit;
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  const [savedJobs, total] = await Promise.all([
    this.find(query)
      .populate({
        path: 'jobId',
        select: 'title titleAr sport category jobType status applicationDeadline createdAt',
        populate: {
          path: 'clubId',
          select: 'firstName lastName clubName logo',
        },
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    savedJobs,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
  };
};

/**
 * Check if job is saved by user
 * @param {ObjectId} userId
 * @param {ObjectId} jobId
 * @returns {Promise<Boolean>}
 */
savedJobSchema.statics.isSaved = async function (userId, jobId) {
  const count = await this.countDocuments({
    userId,
    jobId,
    isDeleted: false,
  });
  return count > 0;
};

/**
 * Get saved jobs count for user
 * @param {ObjectId} userId
 * @returns {Promise<Number>}
 */
savedJobSchema.statics.getCount = async function (userId) {
  return this.countDocuments({
    userId,
    isDeleted: false,
  });
};

/**
 * Get all tags used by user
 * @param {ObjectId} userId
 * @returns {Promise<Array>}
 */
savedJobSchema.statics.getUserTags = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result.map(item => ({
    tag: item._id,
    count: item.count,
  }));
};

// Methods

/**
 * Soft delete saved job
 */
savedJobSchema.methods.remove = function () {
  this.isDeleted = true;
  return this.save();
};

/**
 * Set reminder
 * @param {Date} date
 */
savedJobSchema.methods.setReminder = function (date) {
  this.reminder.enabled = true;
  this.reminder.date = date;
  this.reminder.sent = false;
  return this.save();
};

/**
 * Mark reminder as sent
 */
savedJobSchema.methods.markReminderSent = function () {
  this.reminder.sent = true;
  return this.save();
};

module.exports = mongoose.model('SavedJob', savedJobSchema);
