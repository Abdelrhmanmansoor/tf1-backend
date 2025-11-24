const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === APPLICATION STATUS ===
  status: {
    type: String,
    enum: ['new', 'under_review', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired'],
    default: 'new',
    index: true
  },

  // === APPLICATION DETAILS ===
  coverLetter: {
    type: String
  },
  coverLetterAr: {
    type: String
  },

  // Video introduction (URL)
  videoUrl: {
    type: String
  },

  // === ATTACHMENTS ===
  attachments: [{
    type: {
      type: String,
      enum: ['resume', 'cv', 'certificate', 'portfolio', 'video', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === QUESTIONNAIRE RESPONSES (if job has custom questions) ===
  questionnaireResponses: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId
    },
    question: String,
    answer: mongoose.Schema.Types.Mixed // can be string, number, or array
  }],

  // === APPLICANT SNAPSHOT (at time of application) ===
  applicantSnapshot: {
    fullName: String,
    email: String,
    phoneNumber: String,
    location: {
      city: String,
      country: String
    },
    role: String, // player, coach, specialist
    sport: String,
    position: String,
    experienceYears: Number,
    rating: Number
  },

  // === REVIEW & ASSESSMENT ===
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: String,
    notesAr: String,
    strengths: [String],
    weaknesses: [String],
    recommendation: {
      type: String,
      enum: ['highly_recommended', 'recommended', 'neutral', 'not_recommended', 'rejected']
    }
  },

  // === INTERVIEW DETAILS ===
  interview: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['in_person', 'virtual', 'phone']
    },
    scheduledDate: Date,
    scheduledTime: String,
    duration: Number, // in minutes
    location: String,
    locationAr: String,
    meetingLink: String, // for virtual interviews
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // NEW: Interview coordinator/responsible person
    coordinator: {
      name: String,
      nameAr: String,
      email: String,
      phone: String,
      title: String,
      titleAr: String
    },
    // NEW: Company/club details
    companyName: String,
    companyNameAr: String,
    // NEW: Reminders and notifications
    reminders: [{
      type: {
        type: String,
        enum: ['email', 'sms', 'notification']
      },
      beforeMinutes: Number, // e.g., 1440 for 24 hours
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    }],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
    },
    notes: String,
    notesAr: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    feedbackAr: String
  },

  // === OFFER DETAILS ===
  offer: {
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    offeredAt: Date,
    offerLetter: String, // URL to offer letter document
    startDate: Date,
    contractType: String, // permanent, seasonal, temporary
    benefits: [String],
    expiryDate: Date, // offer valid until
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  },

  // === HIRING DETAILS ===
  hiring: {
    hiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    hiredAt: Date,
    startDate: Date,
    contractUrl: String,
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubMember'
    }
  },

  // === COMMUNICATION HISTORY ===
  communications: [{
    type: {
      type: String,
      enum: ['email', 'message', 'call', 'notification']
    },
    subject: String,
    message: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],

  // === STATUS HISTORY ===
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // === FLAGS ===
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // === METADATA ===
  source: {
    type: String,
    enum: ['direct', 'search', 'invitation', 'referral'],
    default: 'direct'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
jobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
jobApplicationSchema.index({ clubId: 1, status: 1 });
jobApplicationSchema.index({ applicantId: 1, status: 1 });
jobApplicationSchema.index({ createdAt: -1 });
jobApplicationSchema.index({ 'interview.scheduledDate': 1 });

// === VIRTUALS ===
jobApplicationSchema.virtual('daysSinceApplication').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

jobApplicationSchema.virtual('isInterviewPending').get(function() {
  return this.interview?.isScheduled && this.interview?.status === 'pending';
});

jobApplicationSchema.virtual('isOfferPending').get(function() {
  return this.status === 'offered' && !this.offer?.acceptedAt && !this.offer?.rejectedAt;
});

// === METHODS ===

// Add status history
jobApplicationSchema.methods.addStatusHistory = function(newStatus, changedBy, reason) {
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    changedAt: new Date(),
    reason
  });
  this.status = newStatus;
};

// Move to review
jobApplicationSchema.methods.moveToReview = async function(reviewedBy) {
  this.addStatusHistory('under_review', reviewedBy, 'Application moved to review');
  await this.save();

  // Update job statistics
  const Job = mongoose.model('Job');
  const job = await Job.findById(this.jobId);
  if (job) {
    await job.updateApplicationStats();
  }

  return this;
};

// Schedule interview
jobApplicationSchema.methods.scheduleInterview = async function(interviewDetails, scheduledBy) {
  this.interview = {
    isScheduled: true,
    type: interviewDetails.type,
    scheduledDate: interviewDetails.date,
    scheduledTime: interviewDetails.time,
    duration: interviewDetails.duration || 60,
    location: interviewDetails.location,
    locationAr: interviewDetails.locationAr,
    meetingLink: interviewDetails.meetingLink,
    interviewers: interviewDetails.interviewers || [],
    status: 'pending'
  };

  this.addStatusHistory('interviewed', scheduledBy, 'Interview scheduled');
  await this.save();

  return this;
};

// Complete interview
jobApplicationSchema.methods.completeInterview = async function(feedback, rating, interviewedBy) {
  if (!this.interview?.isScheduled) {
    throw new Error('No interview scheduled');
  }

  this.interview.status = 'completed';
  this.interview.feedback = feedback.feedback;
  this.interview.feedbackAr = feedback.feedbackAr;
  this.interview.rating = rating;
  this.interview.notes = feedback.notes;

  await this.save();

  return this;
};

// Make offer
jobApplicationSchema.methods.makeOffer = async function(offerDetails, offeredBy) {
  this.offer = {
    offeredBy,
    offeredAt: new Date(),
    offerLetter: offerDetails.offerLetter,
    startDate: offerDetails.startDate,
    contractType: offerDetails.contractType,
    benefits: offerDetails.benefits || [],
    expiryDate: offerDetails.expiryDate
  };

  this.addStatusHistory('offered', offeredBy, 'Offer extended to applicant');
  await this.save();

  // Update job statistics
  const Job = mongoose.model('Job');
  const job = await Job.findById(this.jobId);
  if (job) {
    await job.updateApplicationStats();
  }

  return this;
};

// Accept offer
jobApplicationSchema.methods.acceptOffer = async function() {
  if (this.status !== 'offered') {
    throw new Error('No active offer to accept');
  }

  this.offer.acceptedAt = new Date();
  this.addStatusHistory('accepted', this.applicantId, 'Offer accepted by applicant');
  await this.save();

  return this;
};

// Reject offer
jobApplicationSchema.methods.rejectOffer = async function(reason) {
  if (this.status !== 'offered') {
    throw new Error('No active offer to reject');
  }

  this.offer.rejectedAt = new Date();
  this.offer.rejectionReason = reason;
  this.addStatusHistory('rejected', this.applicantId, reason || 'Offer declined by applicant');
  await this.save();

  return this;
};

// Hire applicant
jobApplicationSchema.methods.hire = async function(hiringDetails, hiredBy) {
  if (this.status !== 'accepted' && this.status !== 'offered') {
    throw new Error('Applicant must accept offer before hiring');
  }

  this.hiring = {
    hiredBy,
    hiredAt: new Date(),
    startDate: hiringDetails.startDate,
    contractUrl: hiringDetails.contractUrl
  };

  this.addStatusHistory('hired', hiredBy, 'Applicant hired');

  // Create club member
  const ClubMember = mongoose.model('ClubMember');
  const Job = mongoose.model('Job');
  const job = await Job.findById(this.jobId).populate('clubId');

  const member = new ClubMember({
    clubId: this.clubId,
    userId: this.applicantId,
    memberType: job.category === 'coach' ? 'coach' :
                job.category === 'player' ? 'player' :
                job.category === 'specialist' ? 'specialist' : 'staff',
    status: 'active',
    sport: job.sport,
    position: job.position,
    applicationId: this._id,
    applicationDate: this.createdAt,
    joinDate: hiringDetails.startDate || new Date()
  });

  await member.save();
  await member.activate(hiredBy);

  this.hiring.membershipId = member._id;
  await this.save();

  // Update job statistics
  if (job) {
    await job.updateApplicationStats();
  }

  return this;
};

// Reject application
jobApplicationSchema.methods.reject = async function(reason, rejectedBy) {
  this.addStatusHistory('rejected', rejectedBy, reason || 'Application rejected');
  await this.save();

  // Update job statistics
  const Job = mongoose.model('Job');
  const job = await Job.findById(this.jobId);
  if (job) {
    await job.updateApplicationStats();
  }

  return this;
};

// Withdraw application
jobApplicationSchema.methods.withdraw = async function(reason) {
  this.addStatusHistory('withdrawn', this.applicantId, reason || 'Application withdrawn by applicant');
  await this.save();

  // Update job statistics
  const Job = mongoose.model('Job');
  const job = await Job.findById(this.jobId);
  if (job) {
    await job.updateApplicationStats();
  }

  return this;
};

// Add communication
jobApplicationSchema.methods.addCommunication = function(commData, sentBy) {
  this.communications.push({
    type: commData.type,
    subject: commData.subject,
    message: commData.message,
    sentBy,
    sentAt: new Date(),
    isRead: false
  });
};

// === STATIC METHODS ===

// Get applications for a job
jobApplicationSchema.statics.getJobApplications = async function(jobId, filters = {}) {
  const query = { jobId, isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.isFlagged !== undefined) query.isFlagged = filters.isFlagged;

  return this.find(query)
    .populate('applicantId', 'fullName email phoneNumber profilePicture roles')
    .populate('review.reviewedBy', 'fullName')
    .populate('interview.interviewers', 'fullName')
    .sort({ createdAt: -1 });
};

// Get applications for a club
jobApplicationSchema.statics.getClubApplications = async function(clubId, filters = {}) {
  const query = { clubId, isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.jobId) query.jobId = filters.jobId;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const applications = await this.find(query)
    .populate('jobId', 'title sport category')
    .populate('applicantId', 'fullName email phoneNumber profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await this.countDocuments(query);

  return {
    applications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalApplications: total,
      limit
    }
  };
};

// Get applicant's applications
jobApplicationSchema.statics.getApplicantApplications = async function(applicantId) {
  return this.find({ applicantId, isDeleted: false })
    .populate('jobId', 'title sport category status applicationDeadline')
    .populate('clubId', 'clubName logo')
    .sort({ createdAt: -1 });
};

// === HOOKS ===

// Before save - create applicant snapshot if new
jobApplicationSchema.pre('save', async function(next) {
  if (this.isNew) {
    const User = mongoose.model('User');
    const applicant = await User.findById(this.applicantId);

    if (applicant) {
      this.applicantSnapshot = {
        fullName: applicant.fullName,
        email: applicant.email,
        phoneNumber: applicant.phoneNumber,
        location: applicant.location,
        role: applicant.roles && applicant.roles.length > 0 ? applicant.roles[applicant.roles.length - 1] : 'user'
      };

      // Get additional info based on role
      if (applicant.roles && applicant.roles.includes('player')) {
        const PlayerProfile = mongoose.model('PlayerProfile');
        const profile = await PlayerProfile.findOne({ userId: this.applicantId });
        if (profile) {
          this.applicantSnapshot.sport = profile.primarySport;
          this.applicantSnapshot.position = profile.position;
          this.applicantSnapshot.rating = profile.ratingStats?.averageRating;
        }
      } else if (applicant.roles && applicant.roles.includes('coach')) {
        const CoachProfile = mongoose.model('CoachProfile');
        const profile = await CoachProfile.findOne({ userId: this.applicantId });
        if (profile) {
          this.applicantSnapshot.sport = profile.primarySport;
          this.applicantSnapshot.experienceYears = profile.experienceYears;
          this.applicantSnapshot.rating = profile.ratingStats?.averageRating;
        }
      }
    }

    // Add initial status history
    this.statusHistory.push({
      status: 'new',
      changedAt: new Date()
    });
  }

  next();
});

// After save - update club statistics
jobApplicationSchema.post('save', async function(doc) {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: doc.clubId });

  if (club) {
    const totalApps = await mongoose.model('JobApplication').countDocuments({
      clubId: doc.clubId,
      isDeleted: false
    });

    club.activityStats.totalApplications = totalApps;
    await club.save();
  }
});

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

module.exports = JobApplication;
