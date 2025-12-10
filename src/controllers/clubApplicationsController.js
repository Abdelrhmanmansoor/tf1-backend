const JobApplication = require('../modules/club/models/JobApplication');
const Job = require('../modules/club/models/Job');
const User = require('../modules/shared/models/User');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');

/**
 * @route   GET /api/v1/clubs/applications
 * @desc    Get all club applications with proper population
 * @access  Private (Club)
 */
exports.getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, jobId } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { clubId: userId, isDeleted: false };
    if (status) query.status = status;
    if (jobId) query.jobId = jobId;

    const [applications, total] = await Promise.all([
      JobApplication.find(query)
        .populate('jobId', 'title titleAr sport category')
        .populate('applicantId', 'firstName lastName fullName email phoneNumber profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments(query)
    ]);

    // Get club profile for club name
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId });

    // Format applications with full data
    const formattedApplications = applications.map(app => {
      // Find resume attachment
      const resume = app.attachments?.find(att => att.type === 'resume' || att.type === 'cv') || app.attachments?.[0];
      
      return {
        _id: app._id,
        jobId: {
          _id: app.jobId?._id,
          title: app.jobId?.title,
          titleAr: app.jobId?.titleAr,
          sport: app.jobId?.sport,
          category: app.jobId?.category,
          clubId: {
            clubName: clubProfile?.clubName,
            clubNameAr: clubProfile?.clubNameAr,
            logo: clubProfile?.logo
          }
        },
        applicantId: {
          _id: app.applicantId?._id,
          fullName: app.applicantId?.fullName || `${app.applicantId?.firstName} ${app.applicantId?.lastName}`,
          email: app.applicantId?.email,
          phoneNumber: app.applicantId?.phoneNumber,
          profilePicture: app.applicantId?.profilePicture
        },
        status: app.status,
        applicantSnapshot: app.applicantSnapshot,
        whatsapp: app.whatsapp,
        portfolio: app.portfolio,
        linkedin: app.linkedin,
        coverLetter: app.coverLetter,
        attachments: app.attachments,
        // Add resume-specific fields for easy access
        resume: resume ? {
          name: resume.name,
          originalName: resume.originalName,
          url: resume.url,
          mimeType: resume.mimeType,
          size: resume.size,
          uploadedAt: resume.uploadedAt,
          downloadUrl: `/api/v1/clubs/applications/${app._id}/resume/download`,
          viewUrl: `/api/v1/clubs/applications/${app._id}/resume/view`,
          infoUrl: `/api/v1/clubs/applications/${app._id}/resume/info`
        } : null,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        interview: app.interview,
        statusHistory: app.statusHistory
      };
    });

    res.json({
      success: true,
      applications: formattedApplications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalClubs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Get applications for specific job
exports.getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      JobApplication.find({ jobId })
        .populate('applicantId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments({ jobId })
    ]);

    res.json({
      success: true,
      data: {
        applications,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
};

// Get single application details
exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await JobApplication.findById(applicationId)
      .populate('jobId')
      .populate('applicantId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching application' });
  }
};

/**
 * @route   POST /api/v1/clubs/applications/:applicationId/review
 * @desc    Move application to under review
 * @access  Private (Club)
 */
exports.reviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.moveToReview(userId);

    // Send notification to applicant
    await sendStatusNotification(application, 'under_review');

    res.json({
      success: true,
      message: 'Application moved to review',
      application: {
        _id: application._id,
        status: application.status,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing application',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/v1/clubs/applications/:applicationId/interview
 * @desc    Schedule interview for application
 * @access  Private (Club)
 */
exports.scheduleInterview = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;
    const { date, time, type, location, meetingLink } = req.body;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.scheduleInterview({
      date,
      time,
      type,
      location,
      meetingLink
    }, userId);

    // Send notification to applicant
    await sendStatusNotification(application, 'interviewed');

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      application: {
        _id: application._id,
        status: application.status,
        interview: application.interview,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/v1/clubs/applications/:applicationId/offer
 * @desc    Make job offer to applicant
 * @access  Private (Club)
 */
exports.makeOffer = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;
    const {
      message,
      contactPhone,
      contactAddress,
      meetingDate,
      meetingTime,
      meetingLocation,
      applicantName,
      applicantEmail,
      jobTitle,
      startDate,
      contractType
    } = req.body;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    }).populate('jobId').populate('applicantId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status to offered
    await application.makeOffer({
      startDate,
      contractType
    }, userId);

    // Get club profile
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId });

    // Send email notification
    try {
      const emailService = require('../utils/email');
      if (emailService.sendJobOfferEmail) {
        await emailService.sendJobOfferEmail({
          applicantName: applicantName || application.applicantId?.fullName,
          applicantEmail: applicantEmail || application.applicantId?.email,
          jobTitle: jobTitle || application.jobId?.title,
          clubName: clubProfile?.clubName || 'Club',
          message,
          contactPhone,
          contactAddress,
          meetingDate,
          meetingTime,
          meetingLocation
        });
      }
    } catch (emailError) {
      console.error('Email send error (non-critical):', emailError.message);
    }

    // Send in-app notification
    await sendStatusNotification(application, 'offered', {
      message,
      contactPhone,
      contactAddress,
      meetingDate,
      meetingTime,
      meetingLocation
    });

    res.json({
      success: true,
      message: 'Offer sent successfully',
      application: {
        _id: application._id,
        status: application.status,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error making offer',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/v1/clubs/applications/:applicationId/hire
 * @desc    Hire applicant
 * @access  Private (Club)
 */
exports.hireApplicant = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;
    const {
      message,
      contactPhone,
      contactAddress,
      meetingDate,
      meetingTime,
      meetingLocation,
      applicantName,
      applicantEmail,
      jobTitle,
      startDate
    } = req.body;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    }).populate('jobId').populate('applicantId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Hire the applicant
    await application.hire({ startDate }, userId);

    // Get club profile
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId });

    // Send email notification
    try {
      const emailService = require('../utils/email');
      if (emailService.sendJobOfferEmail) {
        await emailService.sendJobOfferEmail({
          applicantName: applicantName || application.applicantId?.fullName,
          applicantEmail: applicantEmail || application.applicantId?.email,
          jobTitle: jobTitle || application.jobId?.title,
          clubName: clubProfile?.clubName || 'Club',
          message: message || 'Congratulations! You have been hired.',
          contactPhone,
          contactAddress,
          meetingDate,
          meetingTime,
          meetingLocation,
          isHiring: true
        });
      }
    } catch (emailError) {
      console.error('Email send error (non-critical):', emailError.message);
    }

    // Send in-app notification
    await sendStatusNotification(application, 'hired', {
      message,
      contactPhone,
      contactAddress,
      meetingDate,
      meetingTime,
      meetingLocation
    });

    res.json({
      success: true,
      message: 'Applicant hired successfully',
      application: {
        _id: application._id,
        status: application.status,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Hire applicant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error hiring applicant',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/v1/clubs/applications/:applicationId/reject
 * @desc    Reject application
 * @access  Private (Club)
 */
exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.reject(reason, userId);

    // Send notification to applicant
    await sendStatusNotification(application, 'rejected', { reason });

    // Send email notification
    try {
      const emailService = require('../utils/email');
      if (emailService.sendApplicationRejectionEmail) {
        const applicant = await User.findById(application.applicantId);
        const job = await Job.findById(application.jobId);
        
        if (applicant && job) {
          await emailService.sendApplicationRejectionEmail(
            applicant.email,
            applicant.fullName || `${applicant.firstName} ${applicant.lastName}`,
            job.title
          );
        }
      }
    } catch (emailError) {
      console.error('Email send error (non-critical):', emailError.message);
    }

    res.json({
      success: true,
      message: 'Application rejected',
      application: {
        _id: application._id,
        status: application.status,
        updatedAt: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting application',
      error: error.message
    });
  }
};

// Helper function to send status notifications
async function sendStatusNotification(application, status, extraData = {}) {
  try {
    const { saveNotification } = require('../middleware/notificationHandler');
    const job = await Job.findById(application.jobId);
    const applicant = await User.findById(application.applicantId);
    const ClubProfile = require('../modules/club/models/ClubProfile');
    const clubProfile = await ClubProfile.findOne({ userId: application.clubId });

    const statusMessages = {
      under_review: {
        type: 'application_reviewed',
        title: 'Application Under Review',
        titleAr: 'طلبك قيد المراجعة',
        message: `Your application for ${job?.title} is now under review.`,
        messageAr: `طلبك لوظيفة ${job?.titleAr || job?.title} قيد المراجعة الآن.`
      },
      interviewed: {
        type: 'application_reviewed',
        title: 'Interview Scheduled',
        titleAr: 'تم تحديد موعد المقابلة',
        message: `An interview has been scheduled for your application to ${job?.title}.`,
        messageAr: `تم تحديد موعد مقابلة لطلبك على وظيفة ${job?.titleAr || job?.title}.`
      },
      offered: {
        type: 'application_offered',
        title: 'Job Offer Received!',
        titleAr: 'تم قبول طلبك!',
        message: `Congratulations! You have received a job offer for ${job?.title}.`,
        messageAr: `مبروك! لقد تم قبول طلبك لوظيفة ${job?.titleAr || job?.title}.`
      },
      hired: {
        type: 'application_hired',
        title: 'You are Hired!',
        titleAr: 'تم توظيفك!',
        message: `Congratulations! You have been hired for ${job?.title}.`,
        messageAr: `مبروك! تم توظيفك في وظيفة ${job?.titleAr || job?.title}.`
      },
      rejected: {
        type: 'application_rejected',
        title: 'Application Status Update',
        titleAr: 'تحديث حالة الطلب',
        message: `Thank you for your interest in ${job?.title}. Unfortunately, we have decided to move forward with other candidates.`,
        messageAr: `شكراً لاهتمامك بوظيفة ${job?.titleAr || job?.title}. للأسف تم اختيار مرشحين آخرين.`
      }
    };

    const notifData = statusMessages[status];
    if (!notifData) return;

    const { notification } = await saveNotification({
      userId: application.applicantId,
      recipientId: application.applicantId,
      userRole: applicant?.roles?.[0] || 'user',
      type: notifData.type,
      title: notifData.title,
      titleAr: notifData.titleAr,
      message: notifData.message,
      messageAr: notifData.messageAr,
      relatedTo: {
        entityType: 'job_application',
        entityId: application._id
      },
      actionUrl: `/applications/${application._id}`,
      priority: status === 'offered' || status === 'hired' ? 'high' : 'normal',
      jobId: application.jobId,
      applicationId: application._id,
      clubId: application.clubId,
      jobData: {
        title: job?.title,
        titleAr: job?.titleAr,
        clubName: clubProfile?.clubName,
        clubNameAr: clubProfile?.clubNameAr
      },
      metadata: extraData
    });

    // Send real-time notification
    const io = global.io;
    if (io) {
      io.to(application.applicantId.toString()).emit('new_notification', notification);
    }
  } catch (error) {
    console.error('Error sending status notification:', error);
  }
}

// Add admin notes
exports.addNotes = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    const application = await JobApplication.findByIdAndUpdate(
      applicationId,
      { adminNotes },
      { new: true }
    );

    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Add notes error:', error);
    res.status(500).json({ success: false, message: 'Error adding notes' });
  }
};

/**
 * @route   GET /api/v1/clubs/applications/:applicationId/resume/download
 * @desc    Download resume with proper headers (supports local files and URLs)
 * @access  Private (Club)
 */
exports.downloadResume = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    console.log('📥 Download resume request for application:', applicationId);

    // Find application and verify club ownership
    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      console.log('❌ Application not found or unauthorized');
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        messageAr: 'الطلب غير موجود'
      });
    }

    // Check if attachments exist
    if (!application.attachments || application.attachments.length === 0) {
      console.log('❌ No attachments found');
      return res.status(404).json({
        success: false,
        message: 'No resume found for this application',
        messageAr: 'لا توجد سيرة ذاتية لهذا الطلب'
      });
    }

    // Find resume attachment
    const resume = application.attachments.find(att => att.type === 'resume' || att.type === 'cv') || application.attachments[0];
    
    console.log('📄 Resume found:', {
      name: resume.name,
      url: resume.url,
      localPath: resume.localPath,
      size: resume.size
    });

    // If URL exists, redirect to it
    if (resume.url) {
      // Check if it's a full URL (http/https)
      if (resume.url.startsWith('http://') || resume.url.startsWith('https://')) {
        console.log('🔗 Redirecting to URL:', resume.url);
        return res.redirect(resume.url);
      }
      
      // If it's a relative URL, try to serve it
      const path = require('path');
      const absolutePath = path.isAbsolute(resume.url) 
        ? resume.url 
        : path.join(process.cwd(), resume.url.replace(/^\//, ''));
      
      console.log('📂 Checking local path:', absolutePath);
      
      if (fs.existsSync(absolutePath)) {
        console.log('✅ File found locally, streaming...');
        
        // Set proper headers
        res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.originalName || resume.name)}"`);
        
        if (resume.size) {
          res.setHeader('Content-Length', resume.size);
        }

        // Stream file
        const fileStream = fs.createReadStream(absolutePath);
        
        fileStream.on('error', (error) => {
          console.error('❌ File stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error reading file',
              messageAr: 'خطأ في قراءة الملف'
            });
          }
        });
        
        return fileStream.pipe(res);
      }
    }

    // Try localPath if exists
    if (resume.localPath) {
      const path = require('path');
      const absolutePath = path.isAbsolute(resume.localPath) 
        ? resume.localPath 
        : path.join(process.cwd(), resume.localPath);
      
      console.log('📂 Checking localPath:', absolutePath);
      
      if (fs.existsSync(absolutePath)) {
        console.log('✅ File found at localPath, streaming...');
        
        res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.originalName || resume.name)}"`);
        
        if (resume.size) {
          res.setHeader('Content-Length', resume.size);
        }

        const fileStream = fs.createReadStream(absolutePath);
        
        fileStream.on('error', (error) => {
          console.error('❌ File stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error reading file',
              messageAr: 'خطأ في قراءة الملف'
            });
          }
        });
        
        return fileStream.pipe(res);
      }
    }

    // If we reach here, file not found anywhere
    console.log('❌ File not found in any location');
    console.log('Resume data:', JSON.stringify(resume, null, 2));
    
    return res.status(404).json({
      success: false,
      message: 'Resume file not found on server',
      messageAr: 'ملف السيرة الذاتية غير موجود على السيرفر',
      debug: {
        hasUrl: !!resume.url,
        hasLocalPath: !!resume.localPath,
        url: resume.url,
        localPath: resume.localPath
      }
    });
  } catch (error) {
    console.error('❌ Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading resume',
      messageAr: 'خطأ في تحميل السيرة الذاتية',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v1/clubs/applications/:applicationId/resume/view
 * @desc    View resume inline (opens in browser instead of download)
 * @access  Private (Club)
 */
exports.viewResume = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    console.log('👁️ View resume request for application:', applicationId);

    // Find application and verify club ownership
    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        messageAr: 'الطلب غير موجود'
      });
    }

    // Check if attachments exist
    if (!application.attachments || application.attachments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No resume found for this application',
        messageAr: 'لا توجد سيرة ذاتية لهذا الطلب'
      });
    }

    // Find resume attachment
    const resume = application.attachments.find(att => att.type === 'resume' || att.type === 'cv') || application.attachments[0];
    
    console.log('📄 Resume found for viewing:', {
      name: resume.name,
      url: resume.url,
      mimeType: resume.mimeType
    });

    // If URL exists, redirect to it
    if (resume.url) {
      if (resume.url.startsWith('http://') || resume.url.startsWith('https://')) {
        console.log('🔗 Redirecting to URL:', resume.url);
        return res.redirect(resume.url);
      }
      
      const path = require('path');
      const absolutePath = path.isAbsolute(resume.url) 
        ? resume.url 
        : path.join(process.cwd(), resume.url.replace(/^\//, ''));
      
      if (fs.existsSync(absolutePath)) {
        console.log('✅ File found, displaying inline...');
        
        // Set headers for inline display
        res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.originalName || resume.name)}"`);
        
        if (resume.size) {
          res.setHeader('Content-Length', resume.size);
        }

        const fileStream = fs.createReadStream(absolutePath);
        return fileStream.pipe(res);
      }
    }

    // Try localPath
    if (resume.localPath) {
      const path = require('path');
      const absolutePath = path.isAbsolute(resume.localPath) 
        ? resume.localPath 
        : path.join(process.cwd(), resume.localPath);
      
      if (fs.existsSync(absolutePath)) {
        console.log('✅ File found at localPath, displaying inline...');
        
        res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.originalName || resume.name)}"`);
        
        if (resume.size) {
          res.setHeader('Content-Length', resume.size);
        }

        const fileStream = fs.createReadStream(absolutePath);
        return fileStream.pipe(res);
      }
    }

    // File not found
    return res.status(404).json({
      success: false,
      message: 'Resume file not found on server',
      messageAr: 'ملف السيرة الذاتية غير موجود على السيرفر'
    });
  } catch (error) {
    console.error('❌ View resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing resume',
      messageAr: 'خطأ في عرض السيرة الذاتية',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/v1/clubs/applications/:applicationId/resume/info
 * @desc    Get resume metadata and check if file exists
 * @access  Private (Club)
 */
exports.getResumeInfo = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    const application = await JobApplication.findOne({
      _id: applicationId,
      clubId: userId,
      isDeleted: false
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!application.attachments || application.attachments.length === 0) {
      return res.json({
        success: true,
        hasResume: false,
        message: 'No resume attached'
      });
    }

    const resume = application.attachments.find(att => att.type === 'resume' || att.type === 'cv') || application.attachments[0];
    
    // Check if file exists
    let fileExists = false;
    let filePath = null;
    
    if (resume.url) {
      if (resume.url.startsWith('http://') || resume.url.startsWith('https://')) {
        fileExists = true; // Assume external URLs are valid
        filePath = resume.url;
      } else {
        const path = require('path');
        const absolutePath = path.isAbsolute(resume.url) 
          ? resume.url 
          : path.join(process.cwd(), resume.url.replace(/^\//, ''));
        fileExists = fs.existsSync(absolutePath);
        filePath = absolutePath;
      }
    } else if (resume.localPath) {
      const path = require('path');
      const absolutePath = path.isAbsolute(resume.localPath) 
        ? resume.localPath 
        : path.join(process.cwd(), resume.localPath);
      fileExists = fs.existsSync(absolutePath);
      filePath = absolutePath;
    }

    res.json({
      success: true,
      hasResume: true,
      fileExists,
      resume: {
        name: resume.name,
        originalName: resume.originalName,
        mimeType: resume.mimeType,
        size: resume.size,
        uploadedAt: resume.uploadedAt,
        type: resume.type,
        url: resume.url,
        downloadUrl: `/api/v1/clubs/applications/${applicationId}/resume/download`,
        viewUrl: `/api/v1/clubs/applications/${applicationId}/resume/view`
      },
      debug: {
        hasUrl: !!resume.url,
        hasLocalPath: !!resume.localPath,
        filePath,
        fileExists
      }
    });
  } catch (error) {
    console.error('❌ Get resume info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting resume info',
      error: error.message
    });
  }
};

// Export applications to CSV
exports.exportApplications = async (req, res) => {
  try {
    const { jobId } = req.query;
    const userId = req.user._id;

    const query = { clubId: userId };
    if (jobId) query.jobId = jobId;

    const applications = await JobApplication.find(query)
      .populate('jobId')
      .populate('applicantId')
      .lean();

    let csv = 'Name,Email,WhatsApp,Portfolio,LinkedIn,Status,Applied Date\n';
    
    applications.forEach(app => {
      const name = app.applicantId?.firstName + ' ' + app.applicantId?.lastName;
      const email = app.applicantId?.email;
      const whatsapp = app.whatsapp || '';
      const portfolio = app.portfolio || '';
      const linkedin = app.linkedin || '';
      const status = app.status;
      const date = new Date(app.createdAt).toLocaleDateString();

      csv += `"${name}","${email}","${whatsapp}","${portfolio}","${linkedin}","${status}","${date}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting applications' });
  }
};
