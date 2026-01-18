const SavedJob = require('../models/SavedJob');
const Job = require('../../club/models/Job');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const redis = require('../../../config/redis');

/**
 * @route   GET /api/v1/applicant/saved-jobs
 * @desc    Get all saved jobs for applicant
 * @access  Private (applicant)
 */
exports.getSavedJobs = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, priority, tags, sortBy, order } = req.query;

  // Parse tags if provided
  const parsedTags = tags ? tags.split(',').map(t => t.trim()) : undefined;

  const result = await SavedJob.getUserSavedJobs(userId, {
    page,
    limit,
    priority,
    tags: parsedTags,
    sortBy,
    order,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @route   POST /api/v1/applicant/saved-jobs/:jobId
 * @desc    Save/bookmark a job
 * @access  Private (applicant)
 */
exports.saveJob = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;
  const { note, tags, priority } = req.body;

  // Validate job exists
  const job = await Job.findOne({
    _id: jobId,
    isDeleted: false,
    status: 'active',
  });

  if (!job) {
    throw new AppError('Job not found or no longer active', 404);
  }

  // Check if already saved
  const existing = await SavedJob.findOne({
    userId,
    jobId,
    isDeleted: false,
  });

  if (existing) {
    throw new AppError('Job already saved', 400);
  }

  // Create saved job
  const savedJob = await SavedJob.create({
    userId,
    jobId,
    note: note || '',
    tags: tags || [],
    priority: priority || 'medium',
  });

  // Populate job details
  await savedJob.populate({
    path: 'jobId',
    select: 'title titleAr sport category jobType applicationDeadline',
    populate: {
      path: 'clubId',
      select: 'firstName lastName clubName logo',
    },
  });

  // Invalidate cache
  try {
    await redis.del(`saved_jobs:count:${userId}`);
  } catch (err) {
    logger.warn('Failed to invalidate cache:', err.message);
  }

  logger.info(`Job ${jobId} saved by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Job saved successfully',
    data: savedJob,
  });
});

/**
 * @route   PUT /api/v1/applicant/saved-jobs/:jobId
 * @desc    Update saved job details
 * @access  Private (applicant)
 */
exports.updateSavedJob = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;
  const { note, tags, priority } = req.body;

  const savedJob = await SavedJob.findOne({
    userId,
    jobId,
    isDeleted: false,
  });

  if (!savedJob) {
    throw new AppError('Saved job not found', 404);
  }

  // Update fields
  if (note !== undefined) savedJob.note = note;
  if (tags !== undefined) savedJob.tags = tags;
  if (priority !== undefined) savedJob.priority = priority;

  await savedJob.save();

  await savedJob.populate({
    path: 'jobId',
    select: 'title titleAr sport category jobType applicationDeadline',
    populate: {
      path: 'clubId',
      select: 'firstName lastName clubName logo',
    },
  });

  logger.info(`Saved job ${jobId} updated by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Saved job updated successfully',
    data: savedJob,
  });
});

/**
 * @route   DELETE /api/v1/applicant/saved-jobs/:jobId
 * @desc    Remove saved/bookmarked job
 * @access  Private (applicant)
 */
exports.unsaveJob = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;

  const savedJob = await SavedJob.findOne({
    userId,
    jobId,
    isDeleted: false,
  });

  if (!savedJob) {
    throw new AppError('Saved job not found', 404);
  }

  // Soft delete
  await savedJob.remove();

  // Invalidate cache
  try {
    await redis.del(`saved_jobs:count:${userId}`);
  } catch (err) {
    logger.warn('Failed to invalidate cache:', err.message);
  }

  logger.info(`Job ${jobId} unsaved by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Job removed from saved jobs',
  });
});

/**
 * @route   GET /api/v1/applicant/saved-jobs/:jobId/status
 * @desc    Check if job is saved
 * @access  Private (applicant)
 */
exports.checkIfSaved = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;

  const isSaved = await SavedJob.isSaved(userId, jobId);

  res.status(200).json({
    success: true,
    data: {
      isSaved,
    },
  });
});

/**
 * @route   GET /api/v1/applicant/saved-jobs/count
 * @desc    Get saved jobs count
 * @access  Private (applicant)
 */
exports.getSavedJobsCount = catchAsync(async (req, res) => {
  const userId = req.user._id;

  // Try cache first
  const cacheKey = `saved_jobs:count:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: {
          count: parseInt(cached),
        },
        cached: true,
      });
    }
  } catch (err) {
    logger.warn('Cache error:', err.message);
  }

  const count = await SavedJob.getCount(userId);

  // Cache for 5 minutes
  try {
    await redis.setex(cacheKey, 300, count.toString());
  } catch (err) {
    logger.warn('Failed to cache count:', err.message);
  }

  res.status(200).json({
    success: true,
    data: {
      count,
    },
    cached: false,
  });
});

/**
 * @route   GET /api/v1/applicant/saved-jobs/tags
 * @desc    Get all tags used by user
 * @access  Private (applicant)
 */
exports.getUserTags = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const tags = await SavedJob.getUserTags(userId);

  res.status(200).json({
    success: true,
    data: {
      tags,
    },
  });
});

/**
 * @route   POST /api/v1/applicant/saved-jobs/:jobId/reminder
 * @desc    Set reminder for saved job
 * @access  Private (applicant)
 */
exports.setReminder = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;
  const { date } = req.body;

  if (!date) {
    throw new AppError('Reminder date is required', 400);
  }

  const reminderDate = new Date(date);

  if (reminderDate < new Date()) {
    throw new AppError('Reminder date must be in the future', 400);
  }

  const savedJob = await SavedJob.findOne({
    userId,
    jobId,
    isDeleted: false,
  });

  if (!savedJob) {
    throw new AppError('Saved job not found', 404);
  }

  await savedJob.setReminder(reminderDate);

  logger.info(`Reminder set for job ${jobId} by user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Reminder set successfully',
    data: savedJob,
  });
});

module.exports = exports;
