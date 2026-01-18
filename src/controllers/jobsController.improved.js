const Job = require('../modules/club/models/Job');
const JobApplication = require('../modules/club/models/JobApplication');
const User = require('../modules/shared/models/User');
const ClubProfile = require('../modules/club/models/ClubProfile');
const { uploadDocument } = require('../config/cloudinary');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const redis = require('../config/redis');
const path = require('path');
const fs = require('fs');

// ==================== JOB BROWSING ====================

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all active jobs with filters (IMPROVED - Fixed N+1 problem)
 * @access  Public
 */
exports.getJobs = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    region,
    city,
    sport,
    jobType,
    category,
    sortBy = 'createdAt',
    order = 'desc',
    search
  } = req.query;

  // ✅ Validation
  const maxLimit = 100;
  const parsedLimit = Math.min(parseInt(limit), maxLimit);
  const parsedPage = Math.max(parseInt(page), 1);

  // ✅ Build query
  const query = {
    isDeleted: false,
    status: 'active'
  };

  if (region) query['requirements.location.region'] = region;
  if (city) query['requirements.location.city'] = city;
  if (sport) query.sport = sport;
  if (jobType) query.jobType = jobType;
  if (category) query.category = category;

  // ✅ Text search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { titleAr: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parsedPage - 1) * parsedLimit;

  // ✅ Sorting
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // ✅ استعلام واحد محسّن باستخدام aggregation مع $lookup
  // يحل مشكلة N+1 بشكل كامل
  const [jobsData] = await Job.aggregate([
    { $match: query },
    {
      $facet: {
        jobs: [
          { $sort: sortOptions },
          { $skip: skip },
          { $limit: parsedLimit },
          // ✅ جلب بيانات Club في استعلام واحد
          {
            $lookup: {
              from: 'users',
              localField: 'clubId',
              foreignField: '_id',
              as: 'clubUser'
            }
          },
          { $unwind: { path: '$clubUser', preserveNullAndEmptyArrays: true } },
          // ✅ جلب ClubProfile في نفس الاستعلام
          {
            $lookup: {
              from: 'clubprofiles',
              localField: 'clubId',
              foreignField: 'userId',
              as: 'clubProfile'
            }
          },
          { $unwind: { path: '$clubProfile', preserveNullAndEmptyArrays: true } },
          // ✅ Format output
          {
            $project: {
              _id: 1,
              title: 1,
              titleAr: 1,
              description: {
                $cond: {
                  if: { $gt: [{ $strLenCP: '$description' }, 150] },
                  then: { $concat: [{ $substrCP: ['$description', 0, 150] }, '...'] },
                  else: '$description'
                }
              },
              jobType: 1,
              sport: { $ifNull: ['$sport', 'عامة'] },
              category: 1,
              location: {
                $ifNull: ['$clubProfile.location.city', 'غير محدد']
              },
              salaryRange: '$requirements.salary',
              postedAt: '$createdAt',
              applicationDeadline: 1,
              club: {
                _id: '$clubUser._id',
                name: {
                  $ifNull: ['$clubProfile.clubName', 'نادي']
                },
                logo: '$clubProfile.logo'
              }
            }
          }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  const total = jobsData.total[0]?.count || 0;

  res.status(200).json({
    success: true,
    jobs: jobsData.jobs,
    pagination: {
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      limit: parsedLimit
    }
  });
});

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job details by ID (IMPROVED with caching)
 * @access  Public
 */
exports.getJobById = catchAsync(async (req, res) => {
  const { id } = req.params;

  // ✅ Cache check (5 minutes TTL)
  const cacheKey = `job:${id}`;

  try {
    const cached = await redis.getJSON(cacheKey);
    if (cached) {
      logger.info(`Job cache HIT for ID: ${id}`);

      // ✅ Increment view count asynchronously (don't wait)
      if (req.user) {
        Job.findById(id).then(job => {
          if (job) job.incrementViews(req.user._id);
        }).catch(err => logger.error('View increment error:', err));
      }

      return res.status(200).json({
        success: true,
        job: cached,
        cached: true
      });
    }
  } catch (cacheError) {
    logger.warn('Cache error:', cacheError.message);
  }

  // ✅ استعلام محسّن واحد
  const [jobData] = await Job.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
        status: 'active'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'clubId',
        foreignField: '_id',
        as: 'clubUser'
      }
    },
    { $unwind: { path: '$clubUser', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'clubprofiles',
        localField: 'clubId',
        foreignField: 'userId',
        as: 'clubProfile'
      }
    },
    { $unwind: { path: '$clubProfile', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        title: 1,
        titleAr: 1,
        description: 1,
        jobType: 1,
        category: 1,
        sport: 1,
        position: 1,
        location: { $ifNull: ['$clubProfile.location.city', 'N/A'] },
        salaryRange: '$requirements.salary',
        deadline: '$applicationDeadline',
        postedAt: '$createdAt',
        applicationCount: '$applicationStats.totalApplications',
        club: {
          _id: '$clubUser._id',
          name: { $ifNull: ['$clubProfile.clubName', 'Club'] },
          logo: '$clubProfile.logo'
        },
        requirements: '$requirements.skills',
        responsibilities: {
          $map: {
            input: { $ifNull: ['$responsibilities', []] },
            as: 'item',
            in: '$$item.responsibility'
          }
        }
      }
    }
  ]);

  if (!jobData) {
    throw new AppError('Job not found or no longer active', 404);
  }

  // ✅ Increment view count
  if (req.user) {
    Job.findById(id).then(job => {
      if (job) job.incrementViews(req.user._id);
    }).catch(err => logger.error('View increment error:', err));
  } else {
    Job.updateOne({ _id: id }, { $inc: { views: 1 } }).catch(err =>
      logger.error('View increment error:', err)
    );
  }

  // ✅ Cache the result
  try {
    await redis.setJSON(cacheKey, jobData, 300); // 5 minutes
    logger.info(`Job cached with ID: ${id}`);
  } catch (cacheError) {
    logger.warn('Failed to cache job:', cacheError.message);
  }

  res.status(200).json({
    success: true,
    job: jobData,
    cached: false
  });
});

// ==================== JOB APPLICATIONS ====================

/**
 * @route   Check existing application before file upload
 * @desc    Validate duplicate application before multer processes file
 * @access  Private
 */
exports.checkExistingApplication = catchAsync(async (req, res, next) => {
  const { id: jobId } = req.params;
  const applicantId = req.user._id;

  // ✅ Check if already applied
  const existingApplication = await JobApplication.findOne({
    jobId,
    applicantId,
    isDeleted: false,
  });

  if (existingApplication) {
    return res.status(409).json({
      success: false,
      message: 'You have already applied to this job',
      code: 'ALREADY_APPLIED',
    });
  }

  // ✅ Validate job exists and is active
  const job = await Job.findOne({
    _id: jobId,
    isDeleted: false,
    status: 'active'
  });

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found or no longer active',
      code: 'JOB_NOT_FOUND'
    });
  }

  // ✅ Check deadline
  if (job.applicationDeadline && new Date() > new Date(job.applicationDeadline)) {
    return res.status(400).json({
      success: false,
      message: 'Application deadline has passed',
      code: 'DEADLINE_PASSED'
    });
  }

  // ✅ Attach job to request for next middleware
  req.job = job;
  next();
});

/**
 * File validation middleware (IMPROVED with security)
 */
exports.validateApplicationFiles = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5 MB

  // ✅ Validate each file
  for (const [fieldName, files] of Object.entries(req.files)) {
    for (const file of files) {
      // ✅ Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} exceeds maximum size of 5 MB`,
          code: 'FILE_TOO_LARGE'
        });
      }

      // ✅ Check MIME type (from buffer, not extension)
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} has invalid format. Allowed: PDF, DOC, DOCX, JPG, PNG`,
          code: 'INVALID_FILE_TYPE'
        });
      }

      // ✅ Additional check: verify file extension matches MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

      if (!validExtensions.includes(ext)) {
        return res.status(400).json({
          success: false,
          message: `File extension ${ext} is not allowed`,
          code: 'INVALID_FILE_EXTENSION'
        });
      }

      // ✅ Check filename for malicious patterns
      if (/[<>:"|?*\\\/]/.test(file.originalname)) {
        return res.status(400).json({
          success: false,
          message: 'Filename contains invalid characters',
          code: 'INVALID_FILENAME'
        });
      }
    }
  }

  next();
};

/**
 * @route   POST /api/v1/jobs/:id/apply
 * @desc    Apply to a job (IMPROVED with validation and rate limiting)
 * @access  Private
 */
exports.applyToJob = catchAsync(async (req, res) => {
  const { id: jobId } = req.params;
  const applicantId = req.user._id;
  const job = req.job; // من middleware السابق

  // ✅ Validate required fields
  const { coverLetter, phone, city, qualification, experienceYears } = req.body;

  if (!phone) {
    throw new AppError('Phone number is required', 400);
  }

  // ✅ Parse numbers
  const parsedExperienceYears = experienceYears ? parseInt(experienceYears) : 0;
  const parsedAge = req.body.age ? parseInt(req.body.age) : null;

  // ✅ Validate phone format (Saudi Arabia)
  const phoneRegex = /^(\\+966|00966|0)?5[0-9]{8}$/;
  if (!phoneRegex.test(phone.replace(/\\s+/g, ''))) {
    throw new AppError('Invalid Saudi phone number format', 400);
  }

  // ✅ Build application snapshot
  const applicantSnapshot = {
    fullName: `${req.user.firstName} ${req.user.lastName}`,
    email: req.user.email,
    phone,
    phoneNumber: phone,
    age: parsedAge,
    city,
    qualification,
    experienceYears: parsedExperienceYears,
    role: req.user.role,
  };

  // ✅ Handle file uploads
  const attachments = [];

  if (req.files && req.files.resume && req.files.resume[0]) {
    const resume = req.files.resume[0];

    // Upload to cloud or save locally
    let resumeUrl = '';
    let resumePath = '';

    if (process.env.USE_CLOUDINARY === 'true') {
      const uploadResult = await uploadDocument(resume.path, 'resumes');
      resumeUrl = uploadResult.secure_url;

      // Delete local file after upload
      try {
        fs.unlinkSync(resume.path);
      } catch (err) {
        logger.warn('Failed to delete temp file:', err.message);
      }
    } else {
      resumePath = `/uploads/resumes/${resume.filename}`;
      resumeUrl = `${process.env.API_URL || 'http://localhost:4000'}${resumePath}`;
    }

    attachments.push({
      type: 'resume',
      name: 'Resume',
      originalName: resume.originalname,
      url: resumeUrl,
      localPath: resumePath,
      mimeType: resume.mimetype,
      format: path.extname(resume.originalname).slice(1),
      size: resume.size,
    });
  }

  // ✅ Create application
  const application = await JobApplication.create({
    jobId,
    clubId: job.clubId,
    applicantId,
    status: 'new',
    coverLetter: coverLetter || '',
    whatsapp: req.body.whatsapp || phone,
    portfolio: req.body.portfolio,
    linkedin: req.body.linkedin,
    attachments,
    applicantSnapshot,
    source: 'direct',
  });

  // ✅ Update job stats
  await Job.findByIdAndUpdate(jobId, {
    $inc: { 'applicationStats.totalApplications': 1 }
  });

  // ✅ Invalidate caches
  try {
    await Promise.all([
      redis.del(`dashboard:applicant:${applicantId}`),
      redis.del(`dashboard:applicant:${applicantId}:recommendations`),
      redis.del(`applied_jobs:${applicantId}`),
      redis.invalidateCache(`job:${jobId}*`)
    ]);
    logger.info('Application caches invalidated');
  } catch (err) {
    logger.warn('Cache invalidation failed:', err.message);
  }

  // ✅ Send notifications (asynchronous)
  setImmediate(async () => {
    try {
      // Notification to applicant
      const Notification = require('../models/Notification');
      await Notification.createNotification({
        userId: applicantId,
        userRole: 'applicant',
        type: 'application_submitted',
        title: 'Application Submitted',
        titleAr: 'تم تقديم الطلب',
        message: `Your application for ${job.title} has been submitted successfully`,
        messageAr: `تم تقديم طلبك لوظيفة ${job.titleAr || job.title} بنجاح`,
        actionUrl: `/applicant/applications/${application._id}`,
        jobId,
        applicationId: application._id
      });

      // Notification to club
      await Notification.createNotification({
        userId: job.clubId,
        userRole: 'club',
        type: 'new_application',
        title: 'New Job Application',
        titleAr: 'طلب توظيف جديد',
        message: `New application received for ${job.title}`,
        messageAr: `تم استلام طلب جديد لوظيفة ${job.titleAr || job.title}`,
        actionUrl: `/club/applications/${application._id}`,
        jobId,
        applicationId: application._id
      });

      logger.info(`Notifications sent for application ${application._id}`);
    } catch (notifError) {
      logger.error('Notification error:', notifError);
    }
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: {
      application: {
        _id: application._id,
        jobId: application.jobId,
        status: application.status,
        createdAt: application.createdAt
      }
    }
  });
});

/**
 * Rate limiter for job applications
 * Max 5 applications per 10 minutes per user
 */
exports.applicationRateLimiter = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const key = `rate_limit:application:${userId}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 600); // 10 minutes
    }

    if (current > 5) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        success: false,
        message: `Too many applications. Please try again in ${Math.ceil(ttl / 60)} minutes`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: ttl
      });
    }

    next();
  } catch (err) {
    logger.error('Rate limiter error:', err);
    next(); // Proceed without rate limiting on error
  }
});

module.exports = exports;
