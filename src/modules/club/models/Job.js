const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // === JOB DETAILS ===
  title: {
    type: String,
    required: true
  },
  titleAr: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  descriptionAr: {
    type: String
  },

  // === JOB TYPE & CATEGORY ===
  jobType: {
    type: String,
    enum: ['permanent', 'seasonal', 'temporary', 'trial', 'internship', 'volunteer'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['coach', 'player', 'specialist', 'administrative', 'security_maintenance', 'medical', 'other'],
    required: true,
    index: true
  },

  // === SPORT & SPECIALIZATION ===
  sport: {
    type: String,
    index: true
  },
  position: {
    type: String // Player position or specific role
  },
  specialization: {
    type: String // For specialists: physio, nutritionist, fitness
  },

  // === LOCATION ===
  city: {
    type: String,
    index: true
  },
  country: {
    type: String,
    default: 'Saudi Arabia'
  },

  // === REQUIREMENTS ===
  requirements: {
    description: String,
    descriptionAr: String,
    minimumExperience: Number, // in years
    educationLevel: {
      type: String,
      enum: ['high_school', 'diploma', 'bachelor', 'master', 'phd', 'not_required']
    },
    certifications: [String],
    skills: [String],
    ageRange: {
      min: Number,
      max: Number
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'any'],
      default: 'any'
    },
    languages: [{
      type: String,
      enum: ['arabic', 'english', 'french', 'german', 'spanish', 'other']
    }]
  },

  // === RESPONSIBILITIES ===
  responsibilities: [{
    responsibility: String,
    responsibilityAr: String
  }],

  // === EMPLOYMENT DETAILS ===
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'freelance'],
    required: true
  },
  workSchedule: {
    type: String // e.g., "Monday to Friday, 9am-5pm"
  },
  workScheduleAr: {
    type: String
  },

  // === BENEFITS ===
  benefits: [{
    benefit: String,
    benefitAr: String
  }],

  // === DATES ===
  expectedStartDate: {
    type: String // Changed to String for frontend compatibility
  },
  applicationDeadline: {
    type: Date,
    required: true
  },

  // === MEETING DETAILS ===
  meetingDate: {
    type: String
  },
  meetingTime: {
    type: String
  },
  meetingLocation: {
    type: String
  },

  // === POSITIONS ===
  numberOfPositions: {
    type: Number,
    default: 1,
    min: 1
  },
  positionsFilled: {
    type: Number,
    default: 0
  },

  // === STATUS ===
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'expired', 'closed', 'cancelled'],
    default: 'active',
    index: true
  },

  // === APPLICATION STATISTICS ===
  applicationStats: {
    totalApplications: {
      type: Number,
      default: 0
    },
    newApplications: {
      type: Number,
      default: 0
    },
    underReview: {
      type: Number,
      default: 0
    },
    interviewed: {
      type: Number,
      default: 0
    },
    rejected: {
      type: Number,
      default: 0
    },
    offered: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    }
  },

  // === VIEW STATISTICS ===
  views: {
    type: Number,
    default: 0
  },
  uniqueViews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === POSTING HISTORY ===
  postingHistory: [{
    action: {
      type: String,
      enum: ['created', 'activated', 'paused', 'extended', 'reposted', 'closed', 'cancelled']
    },
    date: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],

  // === ADDITIONAL SETTINGS ===
  settings: {
    allowDirectApplications: {
      type: Boolean,
      default: true
    },
    requireCoverLetter: {
      type: Boolean,
      default: false
    },
    requireVideo: {
      type: Boolean,
      default: false
    },
    autoRejectAfterDeadline: {
      type: Boolean,
      default: false
    },
    sendAutoResponses: {
      type: Boolean,
      default: true
    }
  },

  // === QUESTIONNAIRE (optional custom questions) ===
  questionnaire: [{
    question: String,
    questionAr: String,
    type: {
      type: String,
      enum: ['text', 'multiple_choice', 'yes_no', 'number']
    },
    required: Boolean,
    options: [String] // for multiple_choice
  }],

  // === STATUS FLAGS ===
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  automationFlags: {
    deadlineTriggered: {
      type: Boolean,
      default: false
    }
  },

  // === SEARCH OPTIMIZATION ===
  searchKeywords: [{
    type: String
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
jobSchema.index({ title: 'text', titleAr: 'text', description: 'text' });
jobSchema.index({ clubId: 1, status: 1 });
jobSchema.index({ category: 1, sport: 1 });
jobSchema.index({ jobType: 1, employmentType: 1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ createdAt: -1 });

// === VIRTUALS ===
jobSchema.virtual('isExpired').get(function () {
  return new Date() > this.applicationDeadline;
});

jobSchema.virtual('daysUntilDeadline').get(function () {
  const now = new Date();
  const deadline = this.applicationDeadline;
  const diff = deadline - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

jobSchema.virtual('isFull').get(function () {
  return this.positionsFilled >= this.numberOfPositions;
});

jobSchema.virtual('applications', {
  ref: 'JobApplication',
  localField: '_id',
  foreignField: 'jobId'
});

// === METHODS ===

// Generate search keywords
jobSchema.methods.generateSearchKeywords = function () {
  const keywords = new Set();

  if (this.title) keywords.add(this.title.toLowerCase());
  if (this.category) keywords.add(this.category);
  if (this.sport) keywords.add(this.sport.toLowerCase());
  if (this.position) keywords.add(this.position.toLowerCase());
  if (this.specialization) keywords.add(this.specialization.toLowerCase());

  this.requirements?.skills?.forEach(skill => keywords.add(skill.toLowerCase()));

  this.searchKeywords = Array.from(keywords);
  return this.searchKeywords;
};

// Add posting history entry
jobSchema.methods.addHistory = function (action, performedBy, reason) {
  this.postingHistory.push({
    action,
    date: new Date(),
    performedBy,
    reason
  });
};

// Activate job posting
jobSchema.methods.activate = function (performedBy) {
  this.status = 'active';
  this.isActive = true;
  this.addHistory('activated', performedBy, 'Job posting activated');
  return this;
};

// Pause job posting
jobSchema.methods.pause = function (performedBy, reason) {
  this.status = 'paused';
  this.addHistory('paused', performedBy, reason);
  return this;
};

// Extend deadline
jobSchema.methods.extendDeadline = function (newDeadline, performedBy) {
  const oldDeadline = this.applicationDeadline;
  this.applicationDeadline = newDeadline;
  this.addHistory('extended', performedBy, `Deadline extended from ${oldDeadline.toDateString()} to ${newDeadline.toDateString()}`);
  return this;
};

// Close job posting
jobSchema.methods.close = function (performedBy, reason) {
  this.status = 'closed';
  this.isActive = false;
  this.addHistory('closed', performedBy, reason || 'Position filled');
  return this;
};

// Repost job
jobSchema.methods.repost = function (newDeadline, performedBy) {
  this.status = 'active';
  this.isActive = true;
  this.applicationDeadline = newDeadline;
  this.applicationStats.newApplications = 0;
  this.addHistory('reposted', performedBy, 'Job reposted with new deadline');
  return this;
};

// Increment view count
jobSchema.methods.incrementViews = async function (userId) {
  this.views += 1;

  // Track unique views
  if (userId) {
    const hasViewed = this.uniqueViews.some(
      view => view.userId.toString() === userId.toString()
    );

    if (!hasViewed) {
      this.uniqueViews.push({ userId, viewedAt: new Date() });
    }
  }

  await this.save();
};

// Update application statistics
jobSchema.methods.updateApplicationStats = async function () {
  const JobApplication = mongoose.model('JobApplication');

  const stats = await JobApplication.aggregate([
    { $match: { jobId: this._id, isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  this.applicationStats.totalApplications = 0;
  this.applicationStats.newApplications = 0;
  this.applicationStats.underReview = 0;
  this.applicationStats.interviewed = 0;
  this.applicationStats.rejected = 0;
  this.applicationStats.offered = 0;
  this.applicationStats.hired = 0;

  stats.forEach(stat => {
    this.applicationStats.totalApplications += stat.count;

    if (stat._id === 'new') this.applicationStats.newApplications = stat.count;
    if (stat._id === 'under_review') this.applicationStats.underReview = stat.count;
    if (stat._id === 'interviewed') this.applicationStats.interviewed = stat.count;
    if (stat._id === 'rejected') this.applicationStats.rejected = stat.count;
    if (stat._id === 'offered') this.applicationStats.offered = stat.count;
    if (stat._id === 'hired') this.applicationStats.hired = stat.count;
  });

  this.positionsFilled = this.applicationStats.hired;

  await this.save();
  return this.applicationStats;
};

// === STATIC METHODS ===

// Get active jobs for a club
jobSchema.statics.getActiveJobs = async function (clubId) {
  return this.find({
    clubId,
    status: 'active',
    isDeleted: false,
    applicationDeadline: { $gte: new Date() }
  })
    .populate('postedBy', 'fullName')
    .sort({ createdAt: -1 });
};

// Search jobs with filters
jobSchema.statics.searchJobs = async function (filters = {}) {
  const query = { isDeleted: false, status: 'active', applicationDeadline: { $gte: new Date() } };

  if (filters.clubId) query.clubId = filters.clubId;
  if (filters.category) query.category = filters.category;
  if (filters.sport) query.sport = new RegExp(filters.sport, 'i');
  if (filters.jobType) query.jobType = filters.jobType;
  if (filters.employmentType) query.employmentType = filters.employmentType;
  if (filters.specialization) query.specialization = new RegExp(filters.specialization, 'i');

  if (filters.search) {
    query.$or = [
      { title: new RegExp(filters.search, 'i') },
      { titleAr: new RegExp(filters.search, 'i') },
      { description: new RegExp(filters.search, 'i') },
      { searchKeywords: new RegExp(filters.search, 'i') }
    ];
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const jobs = await this.find(query)
    .populate('clubId', 'clubName logo location')
    .populate('postedBy', 'fullName')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await this.countDocuments(query);

  return {
    jobs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalJobs: total,
      limit
    }
  };
};

// Get expired jobs that need to be closed
jobSchema.statics.getExpiredJobs = async function () {
  return this.find({
    status: 'active',
    applicationDeadline: { $lt: new Date() },
    isDeleted: false
  });
};

// === HOOKS ===

// Before save - generate keywords and check expiry
jobSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.generateSearchKeywords();
  }

  // Auto-expire if past deadline
  if (this.status === 'active' && new Date() > this.applicationDeadline) {
    this.status = 'expired';
    this.isActive = false;
  }

  next();
});

// After save - update club statistics
jobSchema.post('save', async function (doc) {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: doc.clubId });

  if (club) {
    const activeCount = await mongoose.model('Job').countDocuments({
      clubId: doc.clubId,
      status: 'active',
      isDeleted: false
    });

    const totalCount = await mongoose.model('Job').countDocuments({
      clubId: doc.clubId,
      isDeleted: false
    });

    club.activityStats.activeJobPostings = activeCount;
    club.activityStats.totalJobPostings = totalCount;

    await club.save();
  }
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
