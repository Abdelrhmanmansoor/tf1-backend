const Job = require('../modules/club/models/Job');
const JobApplication = require('../modules/club/models/JobApplication');
const User = require('../modules/shared/models/User');
const { uploadDocument } = require('../config/cloudinary');

// ==================== JOB BROWSING ====================

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job details by ID
 * @access  Public
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      _id: id,
      isDeleted: false,
      status: 'active'
    })
      .populate('clubId', 'firstName lastName email')
      .populate('postedBy', 'fullName');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND'
      });
    }

    if (!job.clubId) {
      return res.status(404).json({
        success: false,
        message: 'Job club not found',
        code: 'CLUB_NOT_FOUND'
      });
    }

    // Increment view count if user is authenticated
    if (req.user) {
      await job.incrementViews(req.user._id);
    } else {
      job.views += 1;
      await job.save();
    }

    // Get club profile for club name and logo
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId: job.clubId._id });

    // Format response for frontend
    const response = {
      _id: job._id,
      title: job.title,
      description: job.description,
      jobType: job.jobType,
      category: job.category,
      sport: job.sport,
      position: job.position,
      location: clubProfile?.location?.city || 'N/A',
      salaryRange: job.requirements?.salary || null,
      deadline: job.applicationDeadline,
      postedAt: job.createdAt,
      applicationCount: job.applicationStats?.totalApplications || 0,
      club: {
        _id: job.clubId?._id,
        name: clubProfile?.clubName || 'Club',
        logo: clubProfile?.logo,
      },
      requirements: job.requirements?.skills || [],
      responsibilities: job.responsibilities?.map(r => r.responsibility) || [],
    };

    res.status(200).json({
      success: true,
      job: response
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job details',
      error: error.message,
      code: 'FETCH_JOB_ERROR'
    });
  }
};

// ==================== JOB APPLICATIONS ====================

/**
 * @route   Check existing application before file upload
 * @desc    Validate duplicate application before multer processes file
 * @access  Private
 */
exports.checkExistingApplication = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;
    const applicantId = req.user._id;

    // Check if already applied (before file upload)
    const existingApplication = await JobApplication.findOne({
      jobId,
      applicantId,
      isDeleted: false
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied to this job',
        code: 'ALREADY_APPLIED'
      });
    }

    next();
  } catch (error) {
    console.error('Check existing application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application status',
      error: error.message,
      code: 'CHECK_APPLICATION_ERROR'
    });
  }
};

/**
 * @route   POST /api/v1/jobs/:id/apply
 * @desc    Apply to a job (LinkedIn-style easy apply)
 * @access  Private (player, coach, specialist)
 */
exports.applyToJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const applicantId = req.user._id;
    const { coverLetter } = req.body;

    // 1. Find the job
    const job = await Job.findOne({
      _id: jobId,
      isDeleted: false,
      status: 'active'
    }).populate('clubId', 'firstName lastName email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND'
      });
    }

    if (!job.clubId) {
      return res.status(404).json({
        success: false,
        message: 'Job club not found',
        code: 'CLUB_NOT_FOUND'
      });
    }

    // 2. Check if deadline has passed
    if (job.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed',
        code: 'DEADLINE_PASSED'
      });
    }

    // 4. Handle resume upload if provided
    let resumeAttachment = null;
    if (req.file) {
      try {
        const uploadResult = await uploadDocument(
          req.file.buffer,
          applicantId.toString(),
          'resume'
        );

        resumeAttachment = {
          type: 'resume',
          name: req.file.originalname,
          url: uploadResult.url,
          uploadedAt: new Date()
        };
      } catch (uploadError) {
        console.error('Resume upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload resume',
          error: uploadError.message,
          code: 'RESUME_UPLOAD_FAILED'
        });
      }
    }

    // 5. Create job application
    const application = new JobApplication({
      jobId,
      clubId: job.clubId._id,
      applicantId,
      coverLetter: coverLetter || '',
      attachments: resumeAttachment ? [resumeAttachment] : [],
      status: 'new',
      source: 'direct'
    });

    await application.save();

    // 6. Update job application statistics
    await job.updateApplicationStats();

    // 7. Send notification to club (safe with null-guards)
    try {
      // Get applicant details
      const User = require('../modules/shared/models/User');
      const applicant = await User.findById(applicantId).select('firstName lastName email');
      const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Applicant';

      // Get club profile if available
      const ClubProfile = require('../modules/club/models/ClubProfile');
      const clubProfile = await ClubProfile.findOne({ userId: job.clubId._id });
      const clubName = clubProfile?.clubName || 'Club';

      // Create notification
      const Notification = require('../models/Notification');
      const notification = await Notification.create({
        userId: job.clubId._id,
        userRole: 'club',
        type: 'new_application',
        title: 'New Job Application',
        titleAr: 'طلب توظيف جديد',
        message: `${applicantName} applied for ${job.title}. Review their application now.`,
        messageAr: `${applicantName} تقدم لوظيفة ${job.titleAr || job.title}. راجع طلبه الآن.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/club/applications/${application._id}`,
        priority: 'normal'
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(job.clubId._id.toString()).emit('job:notification', {
          _id: notification._id,
          type: 'new_application',
          applicationId: application._id,
          jobId: job._id,
          jobTitle: job.title,
          jobTitleAr: job.titleAr,
          applicantName,
          clubName,
          message: notification.message,
          messageAr: notification.messageAr,
          userId: job.clubId._id,
          status: 'new',
          priority: 'normal',
          createdAt: notification.createdAt
        });
      }
    } catch (notificationError) {
      console.error('Error sending notification to club:', notificationError);
      // Continue even if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        jobId: application.jobId,
        status: application.status,
        appliedAt: application.createdAt
      }
    });
  } catch (error) {
    console.error('Apply to job error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message,
      code: 'APPLICATION_ERROR'
    });
  }
};

/**
 * @route   GET /api/v1/jobs/applications/me
 * @desc    Get my job applications
 * @access  Private
 */
exports.getMyApplications = async (req, res) => {
  try {
    const applicantId = req.user._id;

    const applications = await JobApplication.find({
      applicantId,
      isDeleted: false
    })
      .populate('jobId', 'title sport category status applicationDeadline')
      .populate('clubId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Get club profiles for all applications
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubIds = applications.map(app => app.clubId?._id).filter(Boolean);
    const clubProfiles = await ClubProfile.find({ userId: { $in: clubIds } });

    // Create a map of userId -> clubProfile
    const clubProfileMap = {};
    clubProfiles.forEach(profile => {
      clubProfileMap[profile.userId.toString()] = profile;
    });

    // Format response with club profiles
    const formattedApplications = applications.map(app => {
      const clubProfile = clubProfileMap[app.clubId?._id?.toString()];
      
      return {
        _id: app._id,
        job: {
          _id: app.jobId?._id,
          title: app.jobId?.title,
          sport: app.jobId?.sport,
          category: app.jobId?.category,
          deadline: app.jobId?.applicationDeadline
        },
        club: {
          _id: app.clubId?._id,
          name: clubProfile?.clubName || 'Club',
          logo: clubProfile?.logo,
          location: clubProfile?.location?.city
        },
        status: app.status,
        appliedAt: app.createdAt,
        coverLetter: app.coverLetter,
        attachments: app.attachments,
        interview: app.interview,
        offer: app.offer
      };
    });

    res.status(200).json({
      success: true,
      total: formattedApplications.length,
      applications: formattedApplications
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message,
      code: 'FETCH_APPLICATIONS_ERROR'
    });
  }
};

/**
 * @route   GET /api/v1/jobs/:jobId/applications
 * @desc    Get applications for a specific job (club only)
 * @access  Private (club)
 */
exports.getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const clubId = req.user._id;

    // Verify job belongs to this club
    const job = await Job.findOne({
      _id: jobId,
      clubId,
      isDeleted: false
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have access',
        code: 'JOB_NOT_FOUND'
      });
    }

    // Get status filter if provided
    const { status } = req.query;
    const query = { jobId, isDeleted: false };
    if (status) query.status = status;

    const applications = await JobApplication.find(query)
      .populate('applicantId', 'fullName email phoneNumber profilePicture roles')
      .populate('review.reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    // Format response with applicant details
    const formattedApplications = applications.map(app => ({
      _id: app._id,
      applicant: {
        _id: app.applicantId?._id,
        name: app.applicantSnapshot?.fullName || app.applicantId?.fullName,
        email: app.applicantSnapshot?.email || app.applicantId?.email,
        phone: app.applicantSnapshot?.phoneNumber || app.applicantId?.phoneNumber,
        profilePicture: app.applicantId?.profilePicture,
        role: app.applicantSnapshot?.role || app.applicantId?.roles?.[0],
        sport: app.applicantSnapshot?.sport,
        position: app.applicantSnapshot?.position,
        experienceYears: app.applicantSnapshot?.experienceYears,
        rating: app.applicantSnapshot?.rating
      },
      status: app.status,
      appliedAt: app.createdAt,
      coverLetter: app.coverLetter,
      attachments: app.attachments,
      review: app.review,
      interview: app.interview,
      statusHistory: app.statusHistory
    }));

    res.status(200).json({
      success: true,
      total: formattedApplications.length,
      applications: formattedApplications
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job applications',
      error: error.message,
      code: 'FETCH_APPLICATIONS_ERROR'
    });
  }
};

/**
 * @route   PUT /api/v1/jobs/applications/:applicationId/withdraw
 * @desc    Withdraw application
 * @access  Private
 */
exports.withdrawApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const applicantId = req.user._id;
    const { reason } = req.body;

    const application = await JobApplication.findOne({
      _id: applicationId,
      applicantId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    // Check if can withdraw (only if status is 'new' or 'under_review')
    if (!['new', 'under_review'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application at this stage',
        code: 'CANNOT_WITHDRAW'
      });
    }

    await application.withdraw(reason || 'Withdrawn by applicant');

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing application',
      error: error.message,
      code: 'WITHDRAW_ERROR'
    });
  }
};
