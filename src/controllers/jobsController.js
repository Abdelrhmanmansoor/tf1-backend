const Job = require('../modules/club/models/Job');
const JobApplication = require('../modules/club/models/JobApplication');
const User = require('../modules/shared/models/User');
const { uploadDocument } = require('../config/cloudinary');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ==================== JOB BROWSING ====================

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all active jobs with filters
 * @access  Public
 */
exports.getJobs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      region,
      city,
      sport,
      jobType,
      category
    } = req.query;

    const query = { 
      isDeleted: false,
      status: 'active'
    };

    if (region) query['requirements.location.region'] = region;
    if (city) query['requirements.location.city'] = city;
    if (sport) query.sport = sport;
    if (jobType) query.jobType = jobType;
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('clubId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments(query)
    ]);

    const ClubProfile = require('../modules/club/models/ClubProfile');

    const formattedJobs = await Promise.all(jobs.map(async (job) => {
      const clubProfile = await ClubProfile.findOne({ userId: job.clubId?._id });
      return {
        _id: job._id,
        title: job.title,
        description: job.description?.substring(0, 150) + '...',
        jobType: job.jobType,
        sport: job.sport || 'عامة',
        location: clubProfile?.location?.city || 'غير محدد',
        salaryRange: job.requirements?.salary,
        postedAt: job.createdAt,
        club: {
          name: clubProfile?.clubName || 'نادي',
          logo: clubProfile?.logo
        }
      };
    }));

    res.status(200).json({
      success: true,
      jobs: formattedJobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الوظائف',
      error: error.message
    });
  }
};

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
      status: 'active',
    })
      .populate('clubId', 'firstName lastName email')
      .populate('postedBy', 'fullName');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND',
      });
    }

    if (!job.clubId) {
      return res.status(404).json({
        success: false,
        message: 'Job club not found',
        code: 'CLUB_NOT_FOUND',
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
      job: response,
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job details',
      error: error.message,
      code: 'FETCH_JOB_ERROR',
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
      isDeleted: false,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied to this job',
        code: 'ALREADY_APPLIED',
      });
    }

    next();
  } catch (error) {
    console.error('Check existing application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application status',
      error: error.message,
      code: 'CHECK_APPLICATION_ERROR',
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
      status: 'active',
    }).populate('clubId', 'firstName lastName email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND',
      });
    }

    if (!job.clubId) {
      return res.status(404).json({
        success: false,
        message: 'Job club not found',
        code: 'CLUB_NOT_FOUND',
      });
    }

    // 2. Check if deadline has passed
    if (job.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed',
        code: 'DEADLINE_PASSED',
      });
    }

    // 4. Handle resume upload if provided (LOCAL STORAGE)
    let resumeAttachment = null;
    if (req.file) {
      try {
        const fileUrl = `/uploads/resumes/${req.file.filename}`;
        const fileExt = path.extname(req.file.originalname).toLowerCase();

        resumeAttachment = {
          type: 'resume',
          name: req.file.originalname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          format: fileExt.replace('.', ''),
          url: fileUrl,
          localPath: req.file.path,
          size: req.file.size,
          uploadedAt: new Date(),
        };

        console.log(
          `📄 Resume uploaded locally: ${req.file.originalname} (${req.file.size} bytes) -> ${fileUrl}`
        );
      } catch (uploadError) {
        console.error('Resume upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload resume',
          error: uploadError.message,
          code: 'RESUME_UPLOAD_FAILED',
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
      source: 'direct',
    });

    await application.save();

    // 6. Update job application statistics
    await job.updateApplicationStats();

    // 7. Send notification to club (works with or without MongoDB)
    try {
      const { saveNotification } = require('../middleware/notificationHandler');
      const User = require('../modules/shared/models/User');
      const applicant = await User.findById(applicantId).select(
        'firstName lastName email'
      );
      const applicantName = applicant
        ? `${applicant.firstName} ${applicant.lastName}`
        : 'Applicant';

      const ClubProfile = require('../modules/club/models/ClubProfile');
      const clubProfile = await ClubProfile.findOne({ userId: job.clubId._id });
      const clubName = clubProfile?.clubName || 'Club';

      // Save notification (MongoDB if connected, memory if not)
      const { notification, source } = await saveNotification({
        userId: job.clubId._id,
        userRole: 'club',
        type: 'new_application',
        title: 'New Job Application',
        titleAr: 'طلب توظيف جديد',
        message: `${applicantName} applied for ${job.title}. Review their application now.`,
        messageAr: `${applicantName} تقدم لوظيفة ${job.titleAr || job.title}. راجع طلبه الآن.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id,
        },
        actionUrl: `/club/applications/${application._id}`,
        priority: 'normal',
      });

      console.log(
        `📢 Notification saved to ${source} for club ${job.clubId._id}`
      );

      // Send real-time via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(job.clubId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'job_application',
          notificationType: 'job_application',
          applicationId: application._id,
          jobId: job._id,
          jobTitle: job.title,
          jobTitleAr: job.titleAr,
          applicantName,
          clubName,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: job.clubId._id,
          status: 'new',
          priority: 'normal',
          createdAt: notification.createdAt,
          isRead: false,
          storedIn: source,
        });
        console.log(`🔔 Real-time notification sent to club ${job.clubId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification to club:', notificationError);
    }

    // 8. Send notification to applicant (confirmation)
    try {
      const { saveNotification } = require('../middleware/notificationHandler');
      const job_title = job.title || 'الوظيفة';
      const club_name = (await require('../modules/club/models/ClubProfile').findOne({ userId: job.clubId._id }))?.clubName || 'النادي';

      const { notification: applicantNotification, source: applicantSource } = await saveNotification({
        userId: applicantId,
        userRole: req.user.role,
        type: 'job_application',
        title: 'Application Submitted',
        titleAr: 'تم إرسال طلبك',
        message: `Your application for ${job_title} has been submitted successfully. The club will review it soon.`,
        messageAr: `تم إرسال طلبك لوظيفة ${job.titleAr || job_title} بنجاح. سيتم مراجعته قريباً من قبل ${club_name}.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id,
        },
        actionUrl: `/jobs/${job._id}/application/${application._id}`,
        priority: 'normal',
      });

      console.log(`📢 Application confirmation sent to applicant ${applicantId}`);

      // Send real-time via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(applicantId.toString()).emit('new_notification', {
          _id: applicantNotification._id,
          type: 'job_application',
          notificationType: 'application_submitted',
          applicationId: application._id,
          jobId: job._id,
          jobTitle: job.title,
          jobTitleAr: job.titleAr,
          clubName: club_name,
          title: applicantNotification.title,
          titleAr: applicantNotification.titleAr,
          message: applicantNotification.message,
          messageAr: applicantNotification.messageAr,
          actionUrl: applicantNotification.actionUrl,
          userId: applicantId,
          status: 'new',
          priority: 'normal',
          isRead: false,
          createdAt: applicantNotification.createdAt,
          storedIn: applicantSource,
        });
        console.log(`🔔 Real-time confirmation sent to applicant ${applicantId}`);
      }
    } catch (applicantNotificationError) {
      console.error('Error sending notification to applicant:', applicantNotificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        jobId: application.jobId,
        status: application.status,
        appliedAt: application.createdAt,
      },
    });
  } catch (error) {
    console.error('Apply to job error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        code: 'VALIDATION_ERROR',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message,
      code: 'APPLICATION_ERROR',
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
      isDeleted: false,
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
          deadline: app.jobId?.applicationDeadline,
        },
        club: {
          _id: app.clubId?._id,
          name: clubProfile?.clubName || 'Club',
          logo: clubProfile?.logo,
          location: clubProfile?.location?.city,
        },
        applicationDetails: {
          status: app.status,
          appliedAt: app.createdAt,
          coverLetter: app.coverLetter,
          videoUrl: app.videoUrl,
          // Attachments with proper formatting
          attachments:
            app.attachments?.map(att => ({
              type: att.type,
              name: att.name,
              url: att.url,
              uploadedAt: att.uploadedAt,
              downloadLink: att.url,
            })) || [],
          responses: app.questionnaireResponses || [],
        },
        assessment: {
          interview: app.interview,
          offer: app.offer,
          review: app.review,
          statusHistory: app.statusHistory,
        },
      };
    });

    res.status(200).json({
      success: true,
      total: formattedApplications.length,
      applications: formattedApplications,
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message,
      code: 'FETCH_APPLICATIONS_ERROR',
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
      isDeleted: false,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have access',
        code: 'JOB_NOT_FOUND',
      });
    }

    // Get status filter if provided
    const { status } = req.query;
    const query = { jobId, isDeleted: false };
    if (status) query.status = status;

    const applications = await JobApplication.find(query)
      .populate(
        'applicantId',
        'firstName lastName email phoneNumber profilePicture roles'
      )
      .populate('review.reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    // Get full applicant profiles
    const PlayerProfile = require('../modules/player/models/PlayerProfile');
    const CoachProfile = require('../modules/coach/models/CoachProfile');
    const SpecialistProfile = require('../modules/specialist/models/SpecialistProfile');

    const applicantIds = applications
      .map(app => app.applicantId?._id)
      .filter(Boolean);
    const playerProfiles = await PlayerProfile.find({
      userId: { $in: applicantIds },
    });
    const coachProfiles = await CoachProfile.find({
      userId: { $in: applicantIds },
    });
    const specialistProfiles = await SpecialistProfile.find({
      userId: { $in: applicantIds },
    });

    const profileMap = {};
    [...playerProfiles, ...coachProfiles, ...specialistProfiles].forEach(
      profile => {
        profileMap[profile.userId.toString()] = profile;
      }
    );

    // Format response with all applicant details
    const formattedApplications = applications.map(app => {
      const profile = profileMap[app.applicantId?._id?.toString()];
      const user = app.applicantId;

      return {
        _id: app._id,
        applicant: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          fullName: `${user?.firstName} ${user?.lastName}`,
          email: user?.email,
          phone: user?.phoneNumber,
          profilePicture: user?.profilePicture,
          role: user?.roles?.[0],
          // Profile-specific details
          sport: app.applicantSnapshot?.sport || profile?.sport,
          position: app.applicantSnapshot?.position || profile?.position,
          specialization: profile?.specialization,
          experienceYears:
            app.applicantSnapshot?.experienceYears ||
            profile?.yearsOfExperience,
          rating: app.applicantSnapshot?.rating || profile?.rating,
          bio: profile?.bio || profile?.about,
          location: profile?.location || app.applicantSnapshot?.location,
        },
        applicationDetails: {
          status: app.status,
          appliedAt: app.createdAt,
          coverLetter: app.coverLetter,
          videoUrl: app.videoUrl,
          // Attachments with proper formatting
          attachments:
            app.attachments?.map(att => ({
              type: att.type,
              name: att.name,
              url: att.url,
              uploadedAt: att.uploadedAt,
              downloadLink: att.url, // Direct download link
            })) || [],
          // Questionnaire responses
          responses: app.questionnaireResponses || [],
        },
        assessment: {
          review: app.review,
          interview: app.interview,
          offer: app.offer,
          statusHistory: app.statusHistory,
        },
      };
    });

    res.status(200).json({
      success: true,
      total: formattedApplications.length,
      applications: formattedApplications,
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job applications',
      error: error.message,
      code: 'FETCH_APPLICATIONS_ERROR',
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
      isDeleted: false,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND',
      });
    }

    // Check if can withdraw (only if status is 'new' or 'under_review')
    if (!['new', 'under_review'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application at this stage',
        code: 'CANNOT_WITHDRAW',
      });
    }

    await application.withdraw(reason || 'Withdrawn by applicant');

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing application',
      error: error.message,
      code: 'WITHDRAW_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/jobs/applications/:applicationId/download/:attachmentIndex
 * @desc    Download application attachment with proper headers
 * @access  Private (club or applicant)
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { applicationId, attachmentIndex } = req.params;
    const userId = req.user._id;

    // Find application
    const application = await JobApplication.findOne({
      _id: applicationId,
      isDeleted: false,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND',
      });
    }

    // Check authorization: either club owner or the applicant
    const isClub = application.clubId.toString() === userId.toString();
    const isApplicant = application.applicantId.toString() === userId.toString();

    if (!isClub && !isApplicant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this attachment',
        code: 'UNAUTHORIZED',
      });
    }

    // Get attachment
    const attachment = application.attachments[parseInt(attachmentIndex)];
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
        code: 'ATTACHMENT_NOT_FOUND',
      });
    }

    const filename = attachment.originalName || attachment.name || 'document';
    const mimeType = attachment.mimeType || 'application/octet-stream';

    // Check if file is stored locally
    if (attachment.localPath && fs.existsSync(attachment.localPath)) {
      // LOCAL FILE - Direct file download
      console.log(`📥 Downloading local file: ${filename} from ${attachment.localPath}`);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      const fileStream = fs.createReadStream(attachment.localPath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming local file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading file',
            code: 'DOWNLOAD_ERROR',
          });
        }
      });
    } else if (attachment.url) {
      // CLOUDINARY/REMOTE FILE - Download from URL
      console.log(`📥 Downloading remote file: ${filename} from ${attachment.url}`);
      
      const protocolModule = attachment.url.startsWith('https') ? https : http;
      
      protocolModule.get(attachment.url, (fileStream) => {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
          console.error('Error streaming remote file:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error downloading file',
              code: 'DOWNLOAD_ERROR',
            });
          }
        });
      }).on('error', (error) => {
        console.error('Error fetching remote file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error fetching file',
            code: 'FETCH_ERROR',
          });
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading attachment',
      error: error.message,
      code: 'DOWNLOAD_ERROR',
    });
  }
};
