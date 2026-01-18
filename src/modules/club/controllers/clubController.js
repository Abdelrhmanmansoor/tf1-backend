const ClubProfile = require('../models/ClubProfile');
const ClubMember = require('../models/ClubMember');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Team = require('../models/Team');
const Event = require('../models/Event');
const FacilityBooking = require('../models/FacilityBooking');
const User = require('../../shared/models/User');
const Notification = require('../../../models/Notification');

exports.verifyNationalAddress = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'National address verification is not configured',
    code: 'ADDRESS_VERIFICATION_NOT_CONFIGURED',
  });
};

exports.retryVerification = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'National address verification retry is not configured',
    code: 'ADDRESS_VERIFICATION_RETRY_NOT_CONFIGURED',
  });
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Create club profile
exports.createProfile = async (req, res) => {
  try {
    // Check if profile already exists
    const existingProfile = await ClubProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: 'Club profile already exists for this user',
        code: 'PROFILE_EXISTS'
      });
    }

    const profileData = {
      userId: req.user._id,
      ...req.body
    };

    // Create profile instance for validation
    const profile = new ClubProfile(profileData);

    // Validate before saving
    const validationError = profile.validateSync();
    if (validationError) {
      const errors = Object.values(validationError.errors).map(err => ({
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

    // Save the profile
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Club profile created successfully',
      profile
    });
  } catch (error) {
    console.error('Create club profile error:', error);

    // Handle mongoose validation errors
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

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A profile with this information already exists',
        code: 'DUPLICATE_PROFILE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating club profile',
      error: error.message,
      code: 'PROFILE_CREATE_FAILED'
    });
  }
};

// Get my club profile
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false })
      .populate('teams', 'teamName sport ageCategory level');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching club profile',
      error: error.message
    });
  }
};

// Get club profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await ClubProfile.findById(req.params.id)
      .populate('userId', 'fullName email phoneNumber')
      .populate('teams', 'teamName sport ageCategory level');

    if (!profile || profile.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    // Increment profile views
    profile.activityStats.profileViews += 1;
    profile.activityStats.lastActivityDate = new Date();
    await profile.save();

    // Return public profile respecting privacy settings
    const publicProfile = profile.getPublicProfile();

    res.json({
      success: true,
      profile: publicProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching club profile',
      error: error.message
    });
  }
};

// Update club profile
exports.updateProfile = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        profile[key] = req.body[key];
      }
    });

    profile.activityStats.lastActivityDate = new Date();
    await profile.save();

    res.json({
      success: true,
      message: 'Club profile updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating club profile',
      error: error.message
    });
  }
};

// Delete club profile
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    profile.isDeleted = true;
    profile.isActive = false;
    await profile.save();

    res.json({
      success: true,
      message: 'Club profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting club profile',
      error: error.message
    });
  }
};

// ============================================
// SEARCH & DISCOVERY
// ============================================

// Search clubs
exports.searchClubs = async (req, res) => {
  try {
    const {
      organizationType,
      sport,
      city,
      country,
      minRating,
      verified,
      page = 1,
      limit = 20,
      sortBy = 'rating',
      search
    } = req.query;

    const query = {
      isActive: true,
      isDeleted: false,
      'privacy.allowSearch': true
    };

    if (organizationType) query.organizationType = organizationType;
    if (sport) query.availableSports = new RegExp(sport, 'i');
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (country) query['location.country'] = new RegExp(country, 'i');
    if (minRating) query['ratingStats.averageRating'] = { $gte: parseFloat(minRating) };
    if (verified === 'true') query['verification.isVerified'] = true;

    if (search) {
      query.$or = [
        { clubName: new RegExp(search, 'i') },
        { clubNameAr: new RegExp(search, 'i') },
        { searchKeywords: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {
      rating: { 'ratingStats.averageRating': -1 },
      members: { 'memberStats.totalMembers': -1 },
      name: { clubName: 1 },
      createdAt: { createdAt: -1 }
    };

    const skip = (page - 1) * limit;
    const clubs = await ClubProfile.find(query)
      .select('-privacy -notificationSettings -financialSettings')
      .sort(sortOptions[sortBy] || sortOptions.rating)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ClubProfile.countDocuments(query);

    res.json({
      success: true,
      clubs: clubs.map(club => club.getPublicProfile()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalClubs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching clubs',
      error: error.message
    });
  }
};

// Get nearby clubs
exports.getNearbyClubs = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, sport, page = 1, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      isActive: true,
      isDeleted: false,
      'privacy.allowSearch': true,
      'location.coordinates.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    };

    if (sport) query.availableSports = new RegExp(sport, 'i');

    const skip = (page - 1) * limit;
    const clubs = await ClubProfile.find(query)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ClubProfile.countDocuments(query);

    res.json({
      success: true,
      clubs: clubs.map(club => club.getPublicProfile()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalClubs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding nearby clubs',
      error: error.message
    });
  }
};

// ============================================
// MEMBER MANAGEMENT
// ============================================

// Get all club members
exports.getMembers = async (req, res) => {
  try {
    const { memberType, status, sport, memberRole, page = 1, limit = 50 } = req.query;

    const members = await ClubMember.getClubMembers(req.user._id, {
      memberType,
      status,
      sport,
      memberRole
    });

    res.json({
      success: true,
      members,
      total: members.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching members',
      error: error.message
    });
  }
};

// Get pending membership requests
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await ClubMember.getPendingRequests(req.user._id);

    res.json({
      success: true,
      requests,
      total: requests.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending requests',
      error: error.message
    });
  }
};

// Approve membership request
exports.approveMembership = async (req, res) => {
  try {
    const member = await ClubMember.findById(req.params.memberId);

    if (!member || member.clubId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Membership request not found'
      });
    }

    await member.activate(req.user._id);

    res.json({
      success: true,
      message: 'Membership approved successfully',
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving membership',
      error: error.message
    });
  }
};

// Reject membership request
exports.rejectMembership = async (req, res) => {
  try {
    const { reason } = req.body;
    const member = await ClubMember.findById(req.params.memberId);

    if (!member || member.clubId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Membership request not found'
      });
    }

    member.status = 'rejected';
    member.addHistory('rejected', req.user._id, reason);
    await member.save();

    res.json({
      success: true,
      message: 'Membership request rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting membership',
      error: error.message
    });
  }
};

// Update member role and permissions
exports.updateMemberRole = async (req, res) => {
  try {
    const { memberRole, permissions } = req.body;
    const member = await ClubMember.findById(req.params.memberId);

    if (!member || member.clubId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (memberRole) {
      member.memberRole = memberRole;
      member.addHistory('role_changed', req.user._id, `Role changed to ${memberRole}`);
    }

    if (permissions) {
      member.updatePermissions(permissions, req.user._id);
    }

    await member.save();

    res.json({
      success: true,
      message: 'Member role and permissions updated successfully',
      member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating member role',
      error: error.message
    });
  }
};

// Remove member
exports.removeMember = async (req, res) => {
  try {
    const { reason } = req.body;
    const member = await ClubMember.findById(req.params.memberId);

    if (!member || member.clubId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.deactivate(req.user._id, reason);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

// Get member statistics
exports.getMemberStatistics = async (req, res) => {
  try {
    const stats = await ClubMember.getMemberStatistics(req.user._id);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching member statistics',
      error: error.message
    });
  }
};

// ============================================
// JOB POSTING & RECRUITMENT
// ============================================

// Create job posting
exports.createJob = async (req, res) => {
  try {
    console.log('📝 Creating job posting with data:', req.body);
    
    const jobData = {
      clubId: req.user._id,
      postedBy: req.user._id,
      ...req.body
    };

    // Validate required fields
    if (!jobData.title) {
      return res.status(400).json({
        success: false,
        message: 'Job title is required',
        messageAr: 'عنوان الوظيفة مطلوب'
      });
    }

    if (!jobData.description) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required',
        messageAr: 'وصف الوظيفة مطلوب'
      });
    }

    if (!jobData.jobType) {
      return res.status(400).json({
        success: false,
        message: 'Job type is required',
        messageAr: 'نوع الوظيفة مطلوب'
      });
    }

    if (!jobData.category) {
      return res.status(400).json({
        success: false,
        message: 'Job category is required',
        messageAr: 'فئة الوظيفة مطلوبة'
      });
    }

    if (!jobData.employmentType) {
      return res.status(400).json({
        success: false,
        message: 'Employment type is required',
        messageAr: 'نوع التوظيف مطلوب'
      });
    }

    if (!jobData.applicationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline is required',
        messageAr: 'تاريخ انتهاء التقديم مطلوب'
      });
    }

    const job = new Job(jobData);
    await job.save();

    console.log('✅ Job posting created successfully:', job._id);

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      messageAr: 'تم نشر الوظيفة بنجاح',
      job
    });
  } catch (error) {
    console.error('❌ Error creating job posting:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        messageAr: 'فشل التحقق من البيانات',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Job posting already exists',
        messageAr: 'الوظيفة موجودة بالفعل'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating job posting',
      messageAr: 'خطأ في نشر الوظيفة',
      error: error.message
    });
  }
};

// Get club's job postings
exports.getJobs = async (req, res) => {
  try {
    const { status, category, sport } = req.query;

    const query = {
      clubId: req.user._id,
      isDeleted: false
    };

    if (status) query.status = status;
    if (category) query.category = category;
    if (sport) query.sport = new RegExp(sport, 'i');

    const jobs = await Job.find(query)
      .populate('postedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
      total: jobs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job postings',
      error: error.message
    });
  }
};

// Get single job posting by ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('clubId', 'clubName logo location')
      .populate('postedBy', 'fullName email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job posting',
      error: error.message
    });
  }
};

// Update job posting
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, clubId: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        job[key] = req.body[key];
      }
    });

    await job.save();

    res.json({
      success: true,
      message: 'Job posting updated successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating job posting',
      error: error.message
    });
  }
};

// Close job posting
exports.closeJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findOne({ _id: req.params.jobId, clubId: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    job.close(req.user._id, reason);
    await job.save();

    res.json({
      success: true,
      message: 'Job posting closed successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error closing job posting',
      error: error.message
    });
  }
};

// Extend job deadline
exports.extendJobDeadline = async (req, res) => {
  try {
    const { newDeadline } = req.body;
    const job = await Job.findOne({ _id: req.params.jobId, clubId: req.user._id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found'
      });
    }

    job.extendDeadline(new Date(newDeadline), req.user._id);
    await job.save();

    res.json({
      success: true,
      message: 'Job deadline extended successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error extending job deadline',
      error: error.message
    });
  }
};

// Get job applications
exports.getJobApplications = async (req, res) => {
  try {
    const { status, jobId } = req.query;

    const result = await JobApplication.getClubApplications(req.user._id, {
      status,
      jobId,
      page: req.query.page,
      limit: req.query.limit
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job applications',
      error: error.message
    });
  }
};

// Get single job application by ID
exports.getApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.applicationId)
      .populate('jobId', 'title titleAr category sport')
      .populate('applicantId', 'fullName email phoneNumber')
      .populate('clubId', 'clubName logo');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// Review application
exports.reviewApplication = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.moveToReview(req.user._id);

    // Send notification to applicant
    try {
      const notification = await Notification.create({
        userId: application.applicantId._id,
        userRole: 'player',
        type: 'job_application',
        title: 'Application Under Review',
        titleAr: 'طلبك قيد المراجعة',
        message: `Your application for ${application.jobId.title} at ${application.clubId.clubName} is now under review. We will contact you soon with updates.`,
        messageAr: `تم البدء بمراجعة طلبك للوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName}. سنتواصل معك قريباً بالتحديثات.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/jobs/${application.jobId._id}/application/${application._id}`,
        priority: 'high'
      });

      try {
        const emailService = require('../../../utils/email');
        const applicant = application.applicantId;
        if (applicant?.email) {
          await emailService.sendNotificationEmail({
            toEmail: applicant.email,
            toName: applicant.fullName || `${applicant.firstName || ''}`.trim(),
            title: 'Application Under Review',
            titleAr: 'طلبك قيد المراجعة',
            message: `Your application for ${application.jobId.title} at ${application.clubId.clubName} is now under review.`,
            messageAr: `طلبك لوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName} قيد المراجعة الآن.`,
          });
        }
      } catch (emailError) {}

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'job_application',
          notificationType: 'application_reviewed',
          applicationId: application._id,
          jobId: application.jobId._id,
          jobTitle: application.jobId.title,
          jobTitleAr: application.jobId.titleAr,
          clubName: application.clubId.clubName,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: application.applicantId._id,
          status: 'pending',
          priority: 'high',
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Application review notification sent to applicant ${application.applicantId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Application moved to review',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reviewing application',
      error: error.message
    });
  }
};

// Schedule interview
exports.scheduleInterview = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.scheduleInterview(req.body, req.user._id);

    // Send notification to applicant
    try {
      const notification = await Notification.create({
        userId: application.applicantId._id,
        userRole: 'player',
        type: 'job_application',
        title: 'Interview Scheduled',
        titleAr: 'تم جدولة المقابلة',
        message: `Interview scheduled for ${application.jobId.title} at ${application.clubId.clubName} on ${new Date(req.body.date).toLocaleDateString()}.`,
        messageAr: `تم جدولة مقابلة لوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName} بتاريخ ${new Date(req.body.date).toLocaleDateString()}.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/jobs/${application.jobId._id}/application/${application._id}`,
        priority: 'high'
      });

      try {
        const emailService = require('../../../utils/email');
        const applicant = application.applicantId;
        if (applicant?.email) {
          await emailService.sendNotificationEmail({
            toEmail: applicant.email,
            toName: applicant.fullName || `${applicant.firstName || ''}`.trim(),
            title: 'Interview Scheduled',
            titleAr: 'تم جدولة المقابلة',
            message: `Interview scheduled for ${application.jobId.title} at ${application.clubId.clubName} on ${new Date(req.body.date).toLocaleDateString()}.`,
            messageAr: `تم جدولة مقابلة لوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName} بتاريخ ${new Date(req.body.date).toLocaleDateString()}.`,
          });
        }
      } catch (emailError) {}

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'job_application',
          notificationType: 'interview_scheduled',
          applicationId: application._id,
          jobId: application.jobId._id,
          jobTitle: application.jobId.title,
          jobTitleAr: application.jobId.titleAr,
          clubName: application.clubId.clubName,
          interviewDate: req.body.date,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: application.applicantId._id,
          status: 'pending',
          priority: 'high',
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Interview notification sent to applicant ${application.applicantId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    // Send email to applicant if requested
    if (req.body.sendEmail !== false) {
      try {
        const emailService = require('../../../utils/email');
        const ClubProfile = require('../models/ClubProfile');
        const clubProfile = await ClubProfile.findOne({ userId: req.user._id });
        
        await emailService.sendInterviewEmail(
          application.applicantId,
          application.jobId.titleAr || application.jobId.title,
          clubProfile?.clubName || application.clubId.clubName || 'Club',
          {
            type: req.body.type,
            scheduledDate: req.body.date || req.body.scheduledDate,
            location: req.body.location,
            meetingLink: req.body.meetingLink
          },
          req.body.customMessage || '',
          req.body.language || 'ar'
        );

        // Log communication
        application.addCommunication({
          type: 'email',
          subject: 'Interview Scheduled',
          message: `Interview invitation sent for ${application.jobId.title}`
        }, req.user._id);
        await application.save();
      } catch (emailError) {
        console.error('⚠️ Interview email error (non-critical):', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

// Make job offer
exports.makeOffer = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.makeOffer(req.body, req.user._id);

    // Send notification to applicant
    try {
      const notification = await Notification.create({
        userId: application.applicantId._id,
        userRole: 'player',
        type: 'job_application',
        title: 'Job Offer Received!',
        titleAr: 'تم استلام عرض العمل!',
        message: `Congratulations! You received a job offer for ${application.jobId.title} at ${application.clubId.clubName}.`,
        messageAr: `تهانينا! لقد تلقيت عرض عمل لوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName}.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/jobs/${application.jobId._id}/application/${application._id}`,
        priority: 'urgent'
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'job_application',
          notificationType: 'job_offer_received',
          applicationId: application._id,
          jobId: application.jobId._id,
          jobTitle: application.jobId.title,
          jobTitleAr: application.jobId.titleAr,
          clubName: application.clubId.clubName,
          offerDetails: req.body,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: application.applicantId._id,
          status: 'pending',
          priority: 'urgent',
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Job offer notification sent to applicant ${application.applicantId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    // Send email to applicant if requested
    if (req.body.sendEmail !== false) {
      try {
        const emailService = require('../../../utils/email');
        const ClubProfile = require('../models/ClubProfile');
        const clubProfile = await ClubProfile.findOne({ userId: req.user._id });
        
        await emailService.sendOfferEmail(
          application.applicantId,
          application.jobId.titleAr || application.jobId.title,
          clubProfile?.clubName || application.clubId.clubName || 'Club',
          {
            startDate: req.body.startDate,
            expiryDate: req.body.expiryDate,
            contractType: req.body.contractType
          },
          req.body.customMessage || '',
          req.body.language || 'ar'
        );

        // Log communication
        application.addCommunication({
          type: 'email',
          subject: 'Job Offer',
          message: `Job offer sent for ${application.jobId.title}`
        }, req.user._id);
        await application.save();
      } catch (emailError) {
        console.error('⚠️ Offer email error (non-critical):', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Offer made successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error making offer',
      error: error.message
    });
  }
};

// Hire applicant
exports.hireApplicant = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.hire(req.body, req.user._id);

    // Send notification to applicant
    try {
      const notification = await Notification.create({
        userId: application.applicantId._id,
        userRole: 'player',
        type: 'club_accepted',
        title: 'Congratulations - You Are Hired!',
        titleAr: 'تهانينا - تم قبولك!',
        message: `Congratulations! You have been hired for ${application.jobId.title} at ${application.clubId.clubName}. Welcome to the team!`,
        messageAr: `تهانينا! لقد تم قبولك لوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName}. مرحباً بك في الفريق!`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/jobs/${application.jobId._id}/application/${application._id}`,
        priority: 'urgent'
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'club_accepted',
          notificationType: 'application_accepted',
          applicationId: application._id,
          jobId: application.jobId._id,
          jobTitle: application.jobId.title,
          jobTitleAr: application.jobId.titleAr,
          clubName: application.clubId.clubName,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: application.applicantId._id,
          status: 'success',
          priority: 'urgent',
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Hire notification sent to applicant ${application.applicantId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    // Send email to applicant if requested
    if (req.body.sendEmail !== false) {
      try {
        const emailService = require('../../../utils/email');
        const ClubProfile = require('../models/ClubProfile');
        const clubProfile = await ClubProfile.findOne({ userId: req.user._id });
        
        await emailService.sendHireEmail(
          application.applicantId,
          application.jobId.titleAr || application.jobId.title,
          clubProfile?.clubName || application.clubId.clubName || 'Club',
          {
            startDate: req.body.startDate
          },
          req.body.customMessage || '',
          req.body.language || 'ar'
        );

        // Log communication
        application.addCommunication({
          type: 'email',
          subject: 'Welcome to the Team',
          message: `Hire confirmation sent for ${application.jobId.title}`
        }, req.user._id);
        await application.save();
      } catch (emailError) {
        console.error('⚠️ Hire email error (non-critical):', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Applicant hired successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error hiring applicant',
      error: error.message
    });
  }
};

// Reject application
exports.rejectApplication = async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.reject(reason, req.user._id);

    // Send notification to applicant
    try {
      const notification = await Notification.create({
        userId: application.applicantId._id,
        userRole: 'player',
        type: 'club_rejected',
        title: 'Application Update',
        titleAr: 'تحديث الطلب',
        message: `Thank you for your interest in ${application.jobId.title} at ${application.clubId.clubName}. Unfortunately, we have decided to move forward with other candidates.`,
        messageAr: `شكراً لاهتمامك بوظيفة ${application.jobId.titleAr || application.jobId.title} في ${application.clubId.clubName}. للأسف، قررنا المضي قدماً مع مرشحين آخرين.`,
        relatedTo: {
          entityType: 'job_application',
          entityId: application._id
        },
        actionUrl: `/jobs/${application.jobId._id}/application/${application._id}`,
        priority: 'normal'
      });

      // Send real-time notification via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(application.applicantId._id.toString()).emit('new_notification', {
          _id: notification._id,
          type: 'club_rejected',
          notificationType: 'application_rejected',
          applicationId: application._id,
          jobId: application.jobId._id,
          jobTitle: application.jobId.title,
          jobTitleAr: application.jobId.titleAr,
          clubName: application.clubId.clubName,
          title: notification.title,
          titleAr: notification.titleAr,
          message: notification.message,
          messageAr: notification.messageAr,
          actionUrl: notification.actionUrl,
          userId: application.applicantId._id,
          status: 'rejected',
          priority: 'normal',
          isRead: false,
          createdAt: notification.createdAt
        });
        console.log(`🔔 Rejection notification sent to applicant ${application.applicantId._id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    // Send email to applicant if requested
    if (req.body.sendEmail !== false) {
      try {
        const emailService = require('../../../utils/email');
        const ClubProfile = require('../models/ClubProfile');
        const clubProfile = await ClubProfile.findOne({ userId: req.user._id });
        
        await emailService.sendRejectionEmail(
          application.applicantId,
          application.jobId.titleAr || application.jobId.title,
          clubProfile?.clubName || application.clubId.clubName || 'Club',
          req.body.customMessage || '',
          req.body.language || 'ar'
        );

        // Log communication
        application.addCommunication({
          type: 'email',
          subject: 'Application Update',
          message: `Application status update sent for ${application.jobId.title}`
        }, req.user._id);
        await application.save();
      } catch (emailError) {
        console.error('⚠️ Rejection email error (non-critical):', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Application rejected',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting application',
      error: error.message
    });
  }
};

// Send direct message email to applicant
exports.sendDirectMessage = async (req, res) => {
  try {
    const { message, language } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      clubId: req.user._id
    }).populate('applicantId jobId clubId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Get club profile for club name
    const ClubProfile = require('../models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId: req.user._id });
    const clubName = clubProfile?.clubName || application.clubId.clubName || 'Club';

    // Send direct message email
    try {
      const emailService = require('../../../utils/email');
      await emailService.sendDirectMessageEmail(
        application.applicantId,
        application.jobId.titleAr || application.jobId.title,
        clubName,
        message,
        language || 'ar'
      );

      // Log communication
      application.addCommunication({
        type: 'email',
        subject: 'Direct Message',
        message: message.substring(0, 200) + (message.length > 200 ? '...' : '')
      }, req.user._id);
      await application.save();

      res.json({
        success: true,
        message: 'Email sent successfully',
        emailSent: true
      });
    } catch (emailError) {
      console.error('❌ Direct message email error:', emailError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending direct message',
      error: error.message
    });
  }
};

// ============================================
// TEAM MANAGEMENT
// ============================================

// Create team
exports.createTeam = async (req, res) => {
  try {
    const teamData = {
      clubId: req.user._id,
      createdBy: req.user._id,
      ...req.body
    };

    const team = new Team(teamData);
    await team.save();

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: error.message
    });
  }
};

// Get club teams
exports.getTeams = async (req, res) => {
  try {
    const { sport, ageCategory, level, status } = req.query;

    const teams = await Team.getClubTeams(req.user._id, {
      sport,
      ageCategory,
      level,
      status
    });

    res.json({
      success: true,
      teams,
      total: teams.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

// Get team by ID
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    })
    .populate('players.userId', 'fullName profilePicture')
    .populate('coaches.userId', 'fullName profilePicture')
    .populate('staff.userId', 'fullName profilePicture');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
};

// Update team
exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'players' && key !== 'coaches' && key !== 'staff') {
        team[key] = req.body[key];
      }
    });

    await team.save();

    res.json({
      success: true,
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating team',
      error: error.message
    });
  }
};

// Add player to team
exports.addPlayerToTeam = async (req, res) => {
  try {
    const { memberId, userId, position, jerseyNumber } = req.body;
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await team.addPlayer(memberId, userId, position, jerseyNumber);

    res.json({
      success: true,
      message: 'Player added to team successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding player to team',
      error: error.message
    });
  }
};

// Remove player from team
exports.removePlayerFromTeam = async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await team.removePlayer(req.params.userId);

    res.json({
      success: true,
      message: 'Player removed from team successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing player from team',
      error: error.message
    });
  }
};

// Add coach to team
exports.addCoachToTeam = async (req, res) => {
  try {
    const { memberId, userId, role } = req.body;
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await team.addCoach(memberId, userId, role);

    res.json({
      success: true,
      message: 'Coach added to team successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding coach to team',
      error: error.message
    });
  }
};

// Update training schedule
exports.updateTrainingSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    const team = await Team.findOne({
      _id: req.params.teamId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    team.updateTrainingSchedule(schedule);
    await team.save();

    res.json({
      success: true,
      message: 'Training schedule updated successfully',
      team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating training schedule',
      error: error.message
    });
  }
};

// ============================================
// EVENT MANAGEMENT
// ============================================

// Create event
exports.createEvent = async (req, res) => {
  try {
    const eventData = {
      clubId: req.user._id,
      createdBy: req.user._id,
      ...req.body
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: error.message
    });
  }
};

// Get club events
exports.getEvents = async (req, res) => {
  try {
    const result = await Event.getClubEvents(req.user._id, req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const events = await Event.getUpcomingEvents(req.user._id, parseInt(days));

    res.json({
      success: true,
      events,
      total: events.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: error.message
    });
  }
};

// Cancel event
exports.cancelEvent = async (req, res) => {
  try {
    const { reason, reasonAr } = req.body;
    const event = await Event.findOne({
      _id: req.params.eventId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.cancel(reason, reasonAr);
    await event.save();

    res.json({
      success: true,
      message: 'Event cancelled successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling event',
      error: error.message
    });
  }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { userId, status, checkInTime } = req.body;
    const event = await Event.findOne({
      _id: req.params.eventId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.markAttendance(userId, status, checkInTime);
    await event.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
};

// ============================================
// FACILITY & BOOKING MANAGEMENT
// ============================================

// Create facility booking
exports.createBooking = async (req, res) => {
  try {
    const bookingData = {
      clubId: req.user._id,
      bookedBy: {
        userId: req.body.bookedBy?.userId || req.user._id,
        ...req.body.bookedBy
      },
      ...req.body
    };

    const booking = new FacilityBooking(bookingData);
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// Get club bookings
exports.getBookings = async (req, res) => {
  try {
    const result = await FacilityBooking.getClubBookings(req.user._id, req.query);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// Get facility schedule
exports.getFacilitySchedule = async (req, res) => {
  try {
    const { facilityId, date } = req.query;

    if (!facilityId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID and date are required'
      });
    }

    const bookings = await FacilityBooking.getFacilitySchedule(
      req.user._id,
      facilityId,
      new Date(date)
    );

    res.json({
      success: true,
      date,
      facilityId,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching facility schedule',
      error: error.message
    });
  }
};

// Get available slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const { facilityId, date, slotDuration = 60 } = req.query;

    if (!facilityId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID and date are required'
      });
    }

    const availableSlots = await FacilityBooking.getAvailableSlots(
      req.user._id,
      facilityId,
      new Date(date),
      parseInt(slotDuration)
    );

    res.json({
      success: true,
      date,
      facilityId,
      availableSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
};

// Approve booking
exports.approveBooking = async (req, res) => {
  try {
    const booking = await FacilityBooking.findOne({
      _id: req.params.bookingId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.approve(req.user._id);

    res.json({
      success: true,
      message: 'Booking approved successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving booking',
      error: error.message
    });
  }
};

// Reject booking
exports.rejectBooking = async (req, res) => {
  try {
    const { reason, reasonAr } = req.body;
    const booking = await FacilityBooking.findOne({
      _id: req.params.bookingId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.reject(req.user._id, reason, reasonAr);

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking',
      error: error.message
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { reason, reasonAr } = req.body;
    const booking = await FacilityBooking.findOne({
      _id: req.params.bookingId,
      clubId: req.user._id,
      isDeleted: false
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.cancel(req.user._id, reason, reasonAr);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// Get facility utilization
exports.getFacilityUtilization = async (req, res) => {
  try {
    const { facilityId, startDate, endDate } = req.query;

    if (!facilityId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID, start date, and end date are required'
      });
    }

    const utilization = await FacilityBooking.getFacilityUtilization(
      req.user._id,
      facilityId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      facilityId,
      period: { startDate, endDate },
      utilization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching facility utilization',
      error: error.message
    });
  }
};

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

// Get club dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    // CRITICAL PERFORMANCE FIX: Run all queries in parallel using Promise.all
    // This reduces total load time from sequential to parallel execution
    const [
      memberStats,
      activeJobs,
      pendingApplications,
      upcomingEvents,
      pendingMembers,
      pendingBookings
    ] = await Promise.all([
      // Get member statistics with timeout fallback
      ClubMember.getMemberStatistics(req.user._id).catch(err => {
        console.warn('[getDashboardStats] Member stats error:', err.message);
        return { newThisMonth: 0 }; // Fallback
      }),
      
      // Get active jobs with timeout fallback
      Job.countDocuments({
        clubId: req.user._id,
        status: 'active',
        isDeleted: false
      }).catch(err => {
        console.warn('[getDashboardStats] Active jobs error:', err.message);
        return 0; // Fallback
      }),
      
      // Get pending applications with timeout fallback
      JobApplication.countDocuments({
        clubId: req.user._id,
        status: 'new',
        isDeleted: false
      }).catch(err => {
        console.warn('[getDashboardStats] Pending applications error:', err.message);
        return 0; // Fallback
      }),
      
      // Get upcoming events with timeout fallback
      Event.getUpcomingEvents(req.user._id, 7).catch(err => {
        console.warn('[getDashboardStats] Upcoming events error:', err.message);
        return []; // Fallback
      }),
      
      // Get pending membership requests with timeout fallback
      ClubMember.countDocuments({
        clubId: req.user._id,
        status: 'pending',
        isDeleted: false
      }).catch(err => {
        console.warn('[getDashboardStats] Pending members error:', err.message);
        return 0; // Fallback
      }),
      
      // Get pending bookings with timeout fallback
      FacilityBooking.countDocuments({
        clubId: req.user._id,
        status: 'pending',
        isDeleted: false
      }).catch(err => {
        console.warn('[getDashboardStats] Pending bookings error:', err.message);
        return 0; // Fallback
      })
    ]);

    const stats = {
      profile: {
        clubName: profile.clubName,
        logo: profile.logo,
        completionPercentage: profile.completionPercentage,
        isVerified: profile.verification.isVerified,
        rating: profile.ratingStats.averageRating,
        totalReviews: profile.ratingStats.totalReviews
      },
      members: {
        total: profile.memberStats.totalMembers,
        active: profile.memberStats.activeMembers,
        players: profile.memberStats.playerMembers,
        coaches: profile.memberStats.coachMembers,
        specialists: profile.memberStats.specialistMembers,
        staff: profile.memberStats.staffMembers,
        newThisMonth: memberStats.newThisMonth,
        pendingRequests: pendingMembers
      },
      teams: {
        total: profile.teams.length
      },
      recruitment: {
        activeJobs,
        totalApplications: profile.activityStats.totalApplications,
        pendingApplications
      },
      events: {
        total: profile.activityStats.totalEvents,
        upcoming: upcomingEvents.length,
        upcomingList: upcomingEvents.slice(0, 5)
      },
      facilities: {
        totalBookings: profile.activityStats.totalBookings,
        pendingBookings
      },
      activity: {
        profileViews: profile.activityStats.profileViews,
        lastActivityDate: profile.activityStats.lastActivityDate
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// ============================================
// MEDIA GALLERY
// ============================================

// Add facility photo
exports.addFacilityPhoto = async (req, res) => {
  try {
    const { url, caption, captionAr } = req.body;
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    if (profile.facilityDetails.facilityPhotos.length >= 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 facility photos allowed'
      });
    }

    profile.facilityDetails.facilityPhotos.push({
      url,
      caption,
      captionAr,
      uploadedAt: new Date()
    });

    await profile.save();

    res.json({
      success: true,
      message: 'Facility photo added successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding facility photo',
      error: error.message
    });
  }
};

// Remove facility photo
exports.removeFacilityPhoto = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    profile.facilityDetails.facilityPhotos = profile.facilityDetails.facilityPhotos.filter(
      photo => photo._id.toString() !== req.params.photoId
    );

    await profile.save();

    res.json({
      success: true,
      message: 'Facility photo removed successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing facility photo',
      error: error.message
    });
  }
};

// Add facility video
exports.addFacilityVideo = async (req, res) => {
  try {
    const { url, thumbnail, title, titleAr, duration } = req.body;
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    if (profile.facilityDetails.facilityVideos.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 facility videos allowed'
      });
    }

    profile.facilityDetails.facilityVideos.push({
      url,
      thumbnail,
      title,
      titleAr,
      duration,
      uploadedAt: new Date()
    });

    await profile.save();

    res.json({
      success: true,
      message: 'Facility video added successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding facility video',
      error: error.message
    });
  }
};

// Remove facility video
exports.removeFacilityVideo = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    profile.facilityDetails.facilityVideos = profile.facilityDetails.facilityVideos.filter(
      video => video._id.toString() !== req.params.videoId
    );

    await profile.save();

    res.json({
      success: true,
      message: 'Facility video removed successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing facility video',
      error: error.message
    });
  }
};

// ============================================
// IMAGE UPLOADS
// ============================================

// Upload club logo
exports.uploadLogo = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // req.processedFile is set by the processLogo middleware
    if (!req.processedFile) {
      return res.status(400).json({
        success: false,
        message: 'No processed file found',
        code: 'NO_PROCESSED_FILE'
      });
    }

    // Update profile with new logo URL
    profile.logo = req.processedFile.url;
    await profile.save();

    res.json({
      success: true,
      message: 'Club logo uploaded successfully',
      logo: {
        url: req.processedFile.url,
        smallUrl: req.processedFile.smallUrl,
        mediumUrl: req.processedFile.mediumUrl,
        largeUrl: req.processedFile.largeUrl
      }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading club logo',
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
};

// Upload club banner
exports.uploadBanner = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // req.processedFile is set by the processBanner middleware
    if (!req.processedFile) {
      return res.status(400).json({
        success: false,
        message: 'No processed file found',
        code: 'NO_PROCESSED_FILE'
      });
    }

    // Update profile with new banner URL
    profile.banner = req.processedFile.url;
    await profile.save();

    res.json({
      success: true,
      message: 'Club banner uploaded successfully',
      banner: {
        url: req.processedFile.url,
        mobileUrl: req.processedFile.mobileUrl,
        tabletUrl: req.processedFile.tabletUrl,
        desktopUrl: req.processedFile.desktopUrl
      }
    });
  } catch (error) {
    console.error('Upload banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading club banner',
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
};

// Upload facility gallery images
exports.uploadGalleryImages = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // req.processedFiles is set by the processPortfolioImages middleware
    if (!req.processedFiles || req.processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No processed files found',
        code: 'NO_PROCESSED_FILES'
      });
    }

    // Add images to facility photos
    const newPhotos = req.processedFiles.map((file, index) => ({
      url: file.url,
      caption: req.body.captions ? req.body.captions[index] : '',
      captionAr: req.body.captionsAr ? req.body.captionsAr[index] : '',
      uploadedAt: new Date()
    }));

    profile.facilityDetails.facilityPhotos.push(...newPhotos);

    // Limit to 20 photos
    if (profile.facilityDetails.facilityPhotos.length > 20) {
      profile.facilityDetails.facilityPhotos = profile.facilityDetails.facilityPhotos.slice(-20);
    }

    await profile.save();

    res.json({
      success: true,
      message: `${newPhotos.length} gallery image(s) uploaded successfully`,
      photos: newPhotos,
      totalPhotos: profile.facilityDetails.facilityPhotos.length
    });
  } catch (error) {
    console.error('Upload gallery images error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading gallery images',
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
};

// ============================================
// SETTINGS
// ============================================

// Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    profile.privacy = { ...profile.privacy, ...req.body.privacy };
    await profile.save();

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating privacy settings',
      error: error.message
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const profile = await ClubProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found'
      });
    }

    profile.notificationSettings = { ...profile.notificationSettings, ...req.body.notifications };
    await profile.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification settings',
      error: error.message
    });
  }
};

module.exports = exports;
