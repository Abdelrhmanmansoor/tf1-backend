const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    // References
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publisherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Interview Details
    type: {
      type: String,
      enum: ['online', 'onsite'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
      index: true,
    },

    // Scheduling
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    timezone: {
      type: String,
      default: 'Asia/Riyadh',
    },

    // Online Interview
    meetingUrl: {
      type: String,
      trim: true,
    },
    meetingPlatform: {
      type: String,
      enum: ['internal', 'zoom', 'google-meet', 'teams', 'other'],
      default: 'internal',
    },
    meetingToken: {
      type: String,
      // Indexed with unique and sparse options via schema.index() below
    },
    meetingId: {
      type: String, // External meeting ID (Zoom, Meet, etc.)
    },
    meetingPassword: {
      type: String, // Meeting password if needed
    },

    // Onsite Interview
    location: {
      type: {
        type: String,
        enum: ['branch', 'custom'],
      },
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      },
      branchName: String,
      address: {
        street: String,
        building: String,
        floor: String,
        room: String,
        city: String,
        district: String,
        country: String,
        zipCode: String,
        fullAddress: String, // Complete formatted address
      },
      mapUrl: String, // Google Maps link
      coordinates: {
        lat: Number,
        lng: Number,
      },
      directions: String, // Additional directions/instructions
    },

    // Participants
    interviewers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        role: String,
        email: String,
        phone: String,
        isLeadInterviewer: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Communication
    messageThreadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageThread',
      index: true,
    },
    invitationSentAt: Date,
    invitationAcceptedAt: Date,
    invitationDeclinedAt: Date,
    invitationResponse: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending',
    },
    invitationNotes: String, // Applicant's notes when responding

    // Reminders
    reminders: [
      {
        type: {
          type: String,
          enum: ['24h', '1h', '15min', 'custom'],
        },
        scheduledAt: Date,
        sentAt: Date,
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'inapp', 'whatsapp', 'push'],
          },
        ],
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed'],
          default: 'pending',
        },
      },
    ],

    // Rescheduling History
    rescheduledHistory: [
      {
        originalDate: Date,
        newDate: Date,
        rescheduledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        rescheduledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Notes & Instructions
    notes: String, // Private notes for interviewers
    instructionsForApplicant: String, // Public instructions
    instructionsForApplicantAr: String,

    // Preparation Materials
    preparationMaterials: [
      {
        title: String,
        titleAr: String,
        url: String,
        type: {
          type: String,
          enum: ['document', 'video', 'link', 'other'],
        },
      },
    ],

    // Feedback & Evaluation
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      technicalSkills: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      cultureFit: {
        type: Number,
        min: 1,
        max: 5,
      },
      strengths: [String],
      concerns: [String],
      recommendation: {
        type: String,
        enum: ['strong-hire', 'hire', 'maybe', 'no-hire'],
      },
      detailedFeedback: String,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      submittedAt: Date,
    },

    // Cancellation
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: Date,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Quick Access Data (denormalized for performance)
    jobData: {
      title: String,
      titleAr: String,
      position: String,
      companyName: String,
    },
    applicantData: {
      name: String,
      email: String,
      phone: String,
      avatar: String,
    },

    // Attendance
    applicantJoinedAt: Date,
    applicantLeftAt: Date,
    actualDuration: Number, // in minutes
  },
  {
    timestamps: true,
  }
);

// Indexes
interviewSchema.index({ publisherId: 1, scheduledAt: -1 });
interviewSchema.index({ applicantId: 1, scheduledAt: -1 });
interviewSchema.index({ status: 1, scheduledAt: 1 });
interviewSchema.index({ meetingToken: 1 }, { unique: true, sparse: true });

// Virtual for computed fields
interviewSchema.virtual('isUpcoming').get(function () {
  return this.scheduledAt > new Date() && this.status === 'scheduled';
});

interviewSchema.virtual('isPast').get(function () {
  return this.scheduledAt < new Date();
});

interviewSchema.virtual('formattedDuration').get(function () {
  if (this.duration < 60) return `${this.duration} minutes`;
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
});

// Statics

// Get upcoming interviews for a publisher
interviewSchema.statics.getUpcomingInterviews = async function (
  publisherId,
  options = {}
) {
  const { page = 1, limit = 20, startDate, endDate } = options;

  const query = {
    publisherId,
    status: { $in: ['scheduled', 'rescheduled'] },
    scheduledAt: { $gte: startDate || new Date() },
  };

  if (endDate) {
    query.scheduledAt.$lte = endDate;
  }

  const interviews = await this.find(query)
    .populate('applicantId', 'firstName lastName email phone avatar')
    .populate('jobId', 'title sport category')
    .sort({ scheduledAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await this.countDocuments(query);

  return {
    interviews,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

// Get interview statistics
interviewSchema.statics.getStatistics = async function (publisherId, dateRange = {}) {
  const { startDate, endDate } = dateRange;

  const matchStage = { publisherId: mongoose.Types.ObjectId(publisherId) };
  if (startDate || endDate) {
    matchStage.scheduledAt = {};
    if (startDate) matchStage.scheduledAt.$gte = new Date(startDate);
    if (endDate) matchStage.scheduledAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        scheduled: {
          $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
        online: { $sum: { $cond: [{ $eq: ['$type', 'online'] }, 1, 0] } },
        onsite: { $sum: { $cond: [{ $eq: ['$type', 'onsite'] }, 1, 0] } },
      },
    },
  ]);

  return stats[0] || { total: 0 };
};

// Generate unique meeting token
interviewSchema.statics.generateMeetingToken = function () {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
};

// Find interview by token (for joining)
interviewSchema.statics.findByToken = async function (token) {
  return this.findOne({ meetingToken: token })
    .populate('applicantId', 'firstName lastName email avatar')
    .populate('publisherId', 'firstName lastName companyName')
    .populate('jobId', 'title sport category')
    .lean();
};

// Methods

// Schedule reminders
interviewSchema.methods.scheduleReminders = function () {
  const interviewDate = new Date(this.scheduledAt);
  const reminders = [];

  // 24 hours before
  const reminder24h = new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000);
  if (reminder24h > new Date()) {
    reminders.push({
      type: '24h',
      scheduledAt: reminder24h,
      channels: ['email', 'inapp'],
      status: 'pending',
    });
  }

  // 1 hour before
  const reminder1h = new Date(interviewDate.getTime() - 60 * 60 * 1000);
  if (reminder1h > new Date()) {
    reminders.push({
      type: '1h',
      scheduledAt: reminder1h,
      channels: ['sms', 'push', 'inapp'],
      status: 'pending',
    });
  }

  // 15 minutes before
  const reminder15min = new Date(interviewDate.getTime() - 15 * 60 * 1000);
  if (reminder15min > new Date()) {
    reminders.push({
      type: '15min',
      scheduledAt: reminder15min,
      channels: ['push', 'inapp'],
      status: 'pending',
    });
  }

  this.reminders = reminders;
  return this;
};

// Reschedule interview
interviewSchema.methods.reschedule = function (newDate, rescheduledBy, reason) {
  this.rescheduledHistory.push({
    originalDate: this.scheduledAt,
    newDate,
    rescheduledBy,
    reason,
    rescheduledAt: new Date(),
  });

  this.scheduledAt = newDate;
  this.status = 'rescheduled';
  this.scheduleReminders(); // Re-schedule reminders

  return this;
};

// Mark as completed
interviewSchema.methods.complete = function () {
  this.status = 'completed';
  if (!this.actualDuration && this.applicantJoinedAt && this.applicantLeftAt) {
    this.actualDuration = Math.floor(
      (this.applicantLeftAt - this.applicantJoinedAt) / 1000 / 60
    );
  }
  return this;
};

// Cancel interview
interviewSchema.methods.cancel = function (cancelledBy, reason) {
  this.status = 'cancelled';
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this;
};

// Add feedback
interviewSchema.methods.addFeedback = function (feedbackData, submittedBy) {
  this.feedback = {
    ...feedbackData,
    submittedBy,
    submittedAt: new Date(),
  };
  return this;
};

// Generate meeting URL
interviewSchema.methods.generateMeetingUrl = function (baseUrl) {
  if (!this.meetingToken) {
    this.meetingToken = this.constructor.generateMeetingToken();
  }
  this.meetingUrl = `${baseUrl}/interview/${this.meetingToken}`;
  return this.meetingUrl;
};

// Generate Google Maps URL
interviewSchema.methods.generateMapUrl = function () {
  if (this.type === 'onsite' && this.location?.address) {
    const address = this.location.address.fullAddress || 
      `${this.location.address.street}, ${this.location.address.city}, ${this.location.address.country}`;
    this.location.mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    return this.location.mapUrl;
  }
  return null;
};

// Pre-save middleware
interviewSchema.pre('save', function (next) {
  // Generate meeting token for online interviews if not exists
  if (
    this.type === 'online' &&
    this.meetingPlatform === 'internal' &&
    !this.meetingToken
  ) {
    this.meetingToken = this.constructor.generateMeetingToken();
  }

  // Generate map URL for onsite interviews if not exists
  if (this.type === 'onsite' && !this.location?.mapUrl) {
    this.generateMapUrl();
  }

  next();
});

// Post-save middleware - Send notifications
interviewSchema.post('save', async function (doc, next) {
  try {
    // If this is a new interview, send invitation notification
    if (this.isNew && !this.invitationSentAt) {
      const notificationService = require('../services/interviewNotificationService');
      await notificationService.sendInterviewInvitation(doc);
      
      // Update invitation sent time
      await this.constructor.updateOne(
        { _id: doc._id },
        { invitationSentAt: new Date() }
      );
    }
  } catch (error) {
    console.error('Error sending interview notification:', error);
  }
  next();
});

module.exports = mongoose.model('Interview', interviewSchema);
