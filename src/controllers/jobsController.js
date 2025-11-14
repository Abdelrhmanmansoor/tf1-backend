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
      .populate('clubId', 'clubName logo location email phoneNumber')
      .populate('postedBy', 'fullName');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND'
      });
    }

    // Increment view count if user is authenticated
    if (req.user) {
      await job.incrementViews(req.user._id);
    } else {
      job.views += 1;
      await job.save();
    }

    // Format response for frontend
    const response = {
      _id: job._id,
      title: job.title,
      description: job.description,
      jobType: job.jobType,
      category: job.category,
      sport: job.sport,
      position: job.position,
      location: job.clubId?.location || 'N/A',
      salaryRange: job.requirements?.salary || null,
      deadline: job.applicationDeadline,
      postedAt: job.createdAt,
      applicationCount: job.applicationStats?.totalApplications || 0,
      club: {
        _id: job.clubId?._id,
        name: job.clubId?.clubName || 'Unknown Club',
        logo: job.clubId?.logo,
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
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND'
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

    // 3. Check if already applied
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
      clubId: job.clubId,
      applicantId,
      coverLetter: coverLetter || '',
      attachments: resumeAttachment ? [resumeAttachment] : [],
      status: 'new',
      source: 'direct'
    });

    await application.save();

    // 6. Update job application statistics
    await job.updateApplicationStats();

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
      .populate('clubId', 'clubName logo location')
      .sort({ createdAt: -1 });

    // Format response
    const formattedApplications = applications.map(app => ({
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
        name: app.clubId?.clubName,
        logo: app.clubId?.logo,
        location: app.clubId?.location
      },
      status: app.status,
      appliedAt: app.createdAt,
      coverLetter: app.coverLetter,
      attachments: app.attachments,
      interview: app.interview,
      offer: app.offer
    }));

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
