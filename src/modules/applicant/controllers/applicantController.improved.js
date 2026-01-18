const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const User = require('../../shared/models/User');
const mongoose = require('mongoose');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const redis = require('../../../config/redis'); // سنحتاج إنشاء هذا الملف

/**
 * @route   GET /api/v1/applicant/dashboard
 * @desc    Get applicant dashboard data (IMPROVED with caching)
 * @access  Private (applicant)
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
  const includeRecommendations =
    !['0', 'false'].includes(String(req.query.includeRecommendations));

  // ✅ التحقق من Cache أولاً
  const cacheKey = `dashboard:applicant:${applicantId}${includeRecommendations ? ':recommendations' : ''}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info(`Dashboard cache hit for applicant ${applicantId}`);
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true
      });
    }
  } catch (cacheError) {
    logger.warn('Redis cache error:', cacheError.message);
    // المتابعة بدون cache
  }

  const applicantObjectId = new mongoose.Types.ObjectId(applicantId);

  // ✅ استعلام واحد محسّن باستخدام Aggregation
  const dashboardData = await JobApplication.aggregate([
    {
      $match: { applicantId: applicantObjectId, isDeleted: false }
    },
    {
      $facet: {
        // الإحصائيات
        stats: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        // آخر 10 طلبات
        recentApplications: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'job'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'clubId',
              foreignField: '_id',
              as: 'club'
            }
          },
          {
            $unwind: { path: '$job', preserveNullAndEmptyArrays: true }
          },
          {
            $unwind: { path: '$club', preserveNullAndEmptyArrays: true }
          },
          {
            $project: {
              _id: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              'job._id': 1,
              'job.title': 1,
              'job.titleAr': 1,
              'job.sport': 1,
              'job.category': 1,
              'job.status': 1,
              'job.applicationDeadline': 1,
              'club._id': 1,
              'club.firstName': 1,
              'club.lastName': 1,
              'club.clubName': 1,
              'club.logo': 1
            }
          }
        ],
        // معرفات الوظائف المُتقدم عليها
        appliedJobIds: [
          { $group: { _id: null, jobIds: { $addToSet: '$jobId' } } }
        ]
      }
    }
  ]);

  // ✅ معالجة النتائج
  const [data] = dashboardData;

  const stats = {
    totalApplications: 0,
    pending: 0,
    underReview: 0,
    interviewed: 0,
    offered: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    hired: 0,
  };

  for (const bucket of data.stats) {
    stats.totalApplications += bucket.count;
    switch (bucket._id) {
      case 'new':
        stats.pending = bucket.count;
        break;
      case 'under_review':
        stats.underReview = bucket.count;
        break;
      case 'interviewed':
        stats.interviewed = bucket.count;
        break;
      case 'offered':
        stats.offered = bucket.count;
        break;
      case 'accepted':
        stats.accepted = bucket.count;
        break;
      case 'rejected':
        stats.rejected = bucket.count;
        break;
      case 'withdrawn':
        stats.withdrawn = bucket.count;
        break;
      case 'hired':
        stats.hired = bucket.count;
        break;
      default:
        break;
    }
  }

  // ✅ التوصيات (lazy loading - endpoint منفصل)
  let recommendedJobs = [];
  if (includeRecommendations) {
    const appliedJobIds = data.appliedJobIds[0]?.jobIds || [];

    // ✅ استعلام واحد محسّن
    recommendedJobs = await Job.aggregate([
      {
        $match: {
          _id: { $nin: appliedJobIds },
          isDeleted: false,
          status: 'active',
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'clubId',
          foreignField: '_id',
          as: 'club'
        }
      },
      {
        $unwind: { path: '$club', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          titleAr: 1,
          description: 1,
          sport: 1,
          category: 1,
          jobType: 1,
          applicationDeadline: 1,
          createdAt: 1,
          'club._id': 1,
          'club.firstName': 1,
          'club.lastName': 1,
          'club.clubName': 1,
          'club.logo': 1
        }
      }
    ]);
  }

  const responseData = {
    stats,
    recentApplications: data.recentApplications,
    recommendedJobs
  };

  // ✅ حفظ في Cache لمدة 5 دقائق
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(responseData));
    logger.info(`Dashboard data cached for applicant ${applicantId}`);
  } catch (cacheError) {
    logger.warn('Failed to cache dashboard data:', cacheError.message);
  }

  res.status(200).json({
    success: true,
    data: responseData,
    cached: false
  });
});

/**
 * @route   GET /api/v1/applicant/recommendations
 * @desc    Get recommended jobs for applicant (IMPROVED)
 * @access  Private (applicant)
 */
exports.getRecommendedJobs = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
  const { limit = 5 } = req.query;

  // ✅ Cache
  const cacheKey = `recommendations:applicant:${applicantId}:${limit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: { recommendedJobs: JSON.parse(cached) },
        cached: true
      });
    }
  } catch (err) {
    logger.warn('Redis error:', err.message);
  }

  // ✅ استعلام محسّن واحد
  const recommendedJobs = await Job.aggregate([
    {
      $match: {
        _id: {
          $nin: await JobApplication.distinct('jobId', {
            applicantId,
            isDeleted: false
          })
        },
        isDeleted: false,
        status: 'active',
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'users',
        localField: 'clubId',
        foreignField: '_id',
        as: 'club'
      }
    },
    { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        title: 1,
        titleAr: 1,
        description: 1,
        sport: 1,
        category: 1,
        jobType: 1,
        applicationDeadline: 1,
        createdAt: 1,
        'club._id': 1,
        'club.firstName': 1,
        'club.lastName': 1,
        'club.clubName': 1,
        'club.logo': 1
      }
    }
  ]);

  // ✅ Cache لمدة 10 دقائق
  try {
    await redis.setex(cacheKey, 600, JSON.stringify(recommendedJobs));
  } catch (err) {
    logger.warn('Failed to cache recommendations:', err.message);
  }

  res.status(200).json({
    success: true,
    data: { recommendedJobs },
    cached: false
  });
});

/**
 * @route   GET /api/v1/applicant/applications
 * @desc    Get all applicant's job applications (IMPROVED)
 * @access  Private (applicant)
 */
exports.getMyApplications = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
  const { status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

  // ✅ Validation
  const maxLimit = 100;
  const parsedLimit = Math.min(parseInt(limit), maxLimit);
  const parsedPage = Math.max(parseInt(page), 1);

  const query = { applicantId, isDeleted: false };
  if (status) {
    query.status = status;
  }

  const skip = (parsedPage - 1) * parsedLimit;

  // ✅ Sorting options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // ✅ استعلام محسّن باستخدام aggregation
  const [applicationsData] = await JobApplication.aggregate([
    { $match: query },
    {
      $facet: {
        applications: [
          { $sort: sortOptions },
          { $skip: skip },
          { $limit: parsedLimit },
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'job'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'clubId',
              foreignField: '_id',
              as: 'club'
            }
          },
          { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              coverLetter: 1,
              'job._id': 1,
              'job.title': 1,
              'job.titleAr': 1,
              'job.sport': 1,
              'job.category': 1,
              'job.status': 1,
              'job.applicationDeadline': 1,
              'club._id': 1,
              'club.firstName': 1,
              'club.lastName': 1,
              'club.clubName': 1
            }
          }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  const total = applicationsData.total[0]?.count || 0;

  res.status(200).json({
    success: true,
    data: {
      applications: applicationsData.applications,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
        limit: parsedLimit
      }
    }
  });
});

/**
 * @route   GET /api/v1/applicant/applications/:applicationId
 * @desc    Get specific application details
 * @access  Private (applicant)
 */
exports.getApplicationDetails = catchAsync(async (req, res) => {
  const { applicationId } = req.params;
  const applicantId = req.user._id;

  const application = await JobApplication.findOne({
    _id: applicationId,
    applicantId,
    isDeleted: false
  })
    .populate('jobId')
    .populate('clubId', 'firstName lastName email clubName logo')
    .lean();

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  res.status(200).json({
    success: true,
    data: application
  });
});

/**
 * @route   PUT /api/v1/applicant/applications/:applicationId/withdraw
 * @desc    Withdraw a job application
 * @access  Private (applicant)
 */
exports.withdrawApplication = catchAsync(async (req, res) => {
  const { applicationId } = req.params;
  const applicantId = req.user._id;
  const { reason } = req.body;

  const application = await JobApplication.findOne({
    _id: applicationId,
    applicantId,
    isDeleted: false
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (application.status === 'withdrawn') {
    throw new AppError('Application already withdrawn', 400);
  }

  if (['hired', 'accepted'].includes(application.status)) {
    throw new AppError('Cannot withdraw accepted or hired application', 400);
  }

  await application.withdraw(reason || 'Withdrawn by applicant');

  // ✅ Invalidate cache
  try {
    const cacheKeys = [
      `dashboard:applicant:${applicantId}`,
      `dashboard:applicant:${applicantId}:recommendations`
    ];
    await Promise.all(cacheKeys.map(key => redis.del(key)));
    logger.info(`Cache invalidated for applicant ${applicantId} after withdrawal`);
  } catch (err) {
    logger.warn('Failed to invalidate cache:', err.message);
  }

  logger.info(`Application ${applicationId} withdrawn by applicant ${applicantId}`);

  res.status(200).json({
    success: true,
    message: 'Application withdrawn successfully',
    data: application
  });
});

/**
 * @route   GET /api/v1/applicant/jobs
 * @desc    Get available jobs for applicant (IMPROVED with better filtering)
 * @access  Private (applicant)
 */
exports.getAvailableJobs = catchAsync(async (req, res) => {
  const applicantId = req.user._id;
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
    search // ✅ إضافة البحث النصي
  } = req.query;

  // ✅ Validation
  const maxLimit = 100;
  const parsedLimit = Math.min(parseInt(limit), maxLimit);
  const parsedPage = Math.max(parseInt(page), 1);

  // ✅ Get applied job IDs (with cache)
  const cacheKeyApplied = `applied_jobs:${applicantId}`;
  let appliedJobIds = [];

  try {
    const cached = await redis.get(cacheKeyApplied);
    if (cached) {
      appliedJobIds = JSON.parse(cached);
    } else {
      appliedJobIds = await JobApplication.distinct('jobId', {
        applicantId,
        isDeleted: false
      });
      await redis.setex(cacheKeyApplied, 300, JSON.stringify(appliedJobIds));
    }
  } catch (err) {
    logger.warn('Redis error:', err.message);
    appliedJobIds = await JobApplication.distinct('jobId', {
      applicantId,
      isDeleted: false
    });
  }

  const query = {
    _id: { $nin: appliedJobIds },
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

  // ✅ استعلام محسّن
  const [jobsData] = await Job.aggregate([
    { $match: query },
    {
      $facet: {
        jobs: [
          { $sort: sortOptions },
          { $skip: skip },
          { $limit: parsedLimit },
          {
            $lookup: {
              from: 'users',
              localField: 'clubId',
              foreignField: '_id',
              as: 'club'
            }
          },
          { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              title: 1,
              titleAr: 1,
              description: 1,
              sport: 1,
              category: 1,
              jobType: 1,
              applicationDeadline: 1,
              createdAt: 1,
              'requirements.location': 1,
              'requirements.salary': 1,
              'club._id': 1,
              'club.firstName': 1,
              'club.lastName': 1,
              'club.clubName': 1,
              'club.logo': 1
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
    data: {
      jobs: jobsData.jobs,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
        limit: parsedLimit
      }
    }
  });
});

module.exports = exports;
