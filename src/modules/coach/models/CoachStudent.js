const mongoose = require('mongoose');

const coachStudentSchema = new mongoose.Schema({
  // === RELATIONSHIP ===
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === OPTIONAL PLAYER PROFILE LINK ===
  playerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlayerProfile',
    default: null,
    index: true
  },

  // === STATUS ===
  status: {
    type: String,
    enum: ['active', 'former'],
    default: 'active',
    index: true
  },

  // === STUDENT INFO ===
  // These fields are used when playerProfileId is null
  // When playerProfileId exists, data is pulled from PlayerProfile
  sport: {
    type: String
  },
  position: String, // e.g., "Forward", "Defender", "Goalkeeper"
  level: {
    type: String,
    enum: ['beginner', 'amateur', 'semi-pro', 'professional'],
    default: 'amateur'
  },

  // === DATES ===
  joinedDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastSessionDate: Date,
  endDate: Date, // When student stopped training (for former students)

  // === SESSION STATISTICS ===
  sessionStats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    completedSessions: {
      type: Number,
      default: 0
    },
    upcomingSessions: {
      type: Number,
      default: 0
    },
    cancelledSessions: {
      type: Number,
      default: 0
    },
    noShowSessions: {
      type: Number,
      default: 0
    }
  },

  // === FINANCIAL ===
  totalPaid: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'EGP'
  },

  // === RATING ===
  rating: {
    type: Number, // Student's rating of the coach (average of all session ratings)
    default: 0,
    min: 0,
    max: 5
  },

  // === COACH NOTES ===
  notes: String, // Private notes about this student
  goals: [String], // Student's goals
  achievements: [{
    title: String,
    titleAr: String,
    date: Date,
    description: String
  }],

  // === PROGRESS TRACKING ===
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  strengths: [String],
  areasForImprovement: [String],

  // === METADATA ===
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
coachStudentSchema.index({ coachId: 1, studentId: 1 }, { unique: true });
coachStudentSchema.index({ coachId: 1, status: 1 });
coachStudentSchema.index({ studentId: 1, status: 1 });

// === VIRTUALS ===
coachStudentSchema.virtual('durationInMonths').get(function() {
  const endDate = this.endDate || new Date();
  const diffTime = Math.abs(endDate - this.joinedDate);
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  return diffMonths;
});

// === METHODS ===

// Link to PlayerProfile if it exists
coachStudentSchema.methods.linkPlayerProfile = async function() {
  if (this.playerProfileId) {
    return this; // Already linked
  }

  const PlayerProfile = mongoose.model('PlayerProfile');
  const playerProfile = await PlayerProfile.findOne({
    userId: this.studentId,
    isDeleted: false
  });

  if (playerProfile) {
    this.playerProfileId = playerProfile._id;

    // Pull data from PlayerProfile if not set
    if (!this.sport && playerProfile.primarySport) {
      this.sport = playerProfile.primarySport;
    }
    if (!this.position && playerProfile.position) {
      this.position = playerProfile.position;
    }
    if (!this.level && playerProfile.level) {
      this.level = playerProfile.level;
    }
  }

  return this;
};

// Get student info (from PlayerProfile if linked, otherwise from local fields)
coachStudentSchema.methods.getStudentInfo = async function() {
  if (this.playerProfileId) {
    const PlayerProfile = mongoose.model('PlayerProfile');
    const playerProfile = await PlayerProfile.findById(this.playerProfileId);

    if (playerProfile) {
      return {
        sport: playerProfile.primarySport,
        position: playerProfile.position,
        level: playerProfile.level,
        hasPlayerProfile: true
      };
    }
  }

  // Fallback to local fields
  return {
    sport: this.sport,
    position: this.position,
    level: this.level,
    hasPlayerProfile: false
  };
};

// Sync training stats to PlayerProfile (if linked)
coachStudentSchema.methods.syncToPlayerProfile = async function() {
  if (!this.playerProfileId) {
    return; // No PlayerProfile to sync to
  }

  const PlayerProfile = mongoose.model('PlayerProfile');
  const playerProfile = await PlayerProfile.findById(this.playerProfileId);

  if (playerProfile) {
    playerProfile.trainingStats.totalSessions = this.sessionStats.totalSessions;
    playerProfile.trainingStats.completedSessions = this.sessionStats.completedSessions;
    playerProfile.trainingStats.cancelledSessions = this.sessionStats.cancelledSessions;
    await playerProfile.save();
  }
};

// Update session statistics
coachStudentSchema.methods.updateSessionStats = async function() {
  const TrainingSession = mongoose.model('TrainingSession');

  const totalSessions = await TrainingSession.countDocuments({
    coachId: this.coachId,
    studentId: this.studentId,
    isDeleted: false
  });

  const completedSessions = await TrainingSession.countDocuments({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'completed',
    isDeleted: false
  });

  const upcomingSessions = await TrainingSession.countDocuments({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'upcoming',
    date: { $gte: new Date() },
    isDeleted: false
  });

  const cancelledSessions = await TrainingSession.countDocuments({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'cancelled',
    isDeleted: false
  });

  const noShowSessions = await TrainingSession.countDocuments({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'no_show',
    isDeleted: false
  });

  // Get last session date
  const lastSession = await TrainingSession.findOne({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'completed',
    isDeleted: false
  }).sort({ date: -1 });

  this.sessionStats.totalSessions = totalSessions;
  this.sessionStats.completedSessions = completedSessions;
  this.sessionStats.upcomingSessions = upcomingSessions;
  this.sessionStats.cancelledSessions = cancelledSessions;
  this.sessionStats.noShowSessions = noShowSessions;

  if (lastSession) {
    this.lastSessionDate = lastSession.date;
  }

  // Update status based on upcoming sessions
  if (upcomingSessions === 0 && totalSessions > 0) {
    this.status = 'former';
    if (!this.endDate) {
      this.endDate = lastSession ? lastSession.date : new Date();
    }
  } else if (upcomingSessions > 0) {
    this.status = 'active';
    this.endDate = null;
  }

  // Auto-sync to PlayerProfile if linked
  await this.syncToPlayerProfile();

  return this;
};

// Update average rating from all sessions
coachStudentSchema.methods.updateRating = async function() {
  const TrainingSession = mongoose.model('TrainingSession');

  const sessions = await TrainingSession.find({
    coachId: this.coachId,
    studentId: this.studentId,
    status: 'completed',
    'rating.studentRating': { $exists: true, $ne: null },
    isDeleted: false
  });

  if (sessions.length > 0) {
    const totalRating = sessions.reduce((sum, session) => sum + (session.rating?.studentRating || 0), 0);
    this.rating = totalRating / sessions.length;
  }

  return this;
};

// Calculate total paid
coachStudentSchema.methods.updateTotalPaid = async function() {
  const TrainingSession = mongoose.model('TrainingSession');

  const result = await TrainingSession.aggregate([
    {
      $match: {
        coachId: this.coachId,
        studentId: this.studentId,
        paymentStatus: 'paid',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$price' }
      }
    }
  ]);

  this.totalPaid = result.length > 0 ? result[0].total : 0;

  return this;
};

// Mark as former student
coachStudentSchema.methods.markAsFormer = function() {
  this.status = 'former';
  if (!this.endDate) {
    this.endDate = new Date();
  }
  return this;
};

// Mark as active student
coachStudentSchema.methods.markAsActive = function() {
  this.status = 'active';
  this.endDate = null;
  return this;
};

// === STATIC METHODS ===

// Get or create coach-student relationship
coachStudentSchema.statics.getOrCreate = async function(coachId, studentId, studentData = {}) {
  let relationship = await this.findOne({ coachId, studentId, isDeleted: false });

  if (!relationship) {
    relationship = new this({
      coachId,
      studentId,
      ...studentData
    });

    // Auto-link to PlayerProfile if exists
    await relationship.linkPlayerProfile();
    await relationship.save();
  } else {
    // If relationship exists but not linked, try to link
    if (!relationship.playerProfileId) {
      await relationship.linkPlayerProfile();
      await relationship.save();
    }
  }

  return relationship;
};

// Get coach's students with filters
coachStudentSchema.statics.getCoachStudents = async function(coachId, filters = {}) {
  const query = { coachId, isDeleted: false };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    // Search will be handled in the controller with User population
    return null; // Signal to controller to handle search
  }

  return this.find(query)
    .populate('studentId', 'firstName lastName email phone avatar dateOfBirth')
    .sort({ joinedDate: -1 });
};

// Update all students' stats for a coach
coachStudentSchema.statics.updateCoachStudentsStats = async function(coachId) {
  const students = await this.find({ coachId, isDeleted: false });

  for (const student of students) {
    await student.updateSessionStats();
    await student.updateRating();
    await student.updateTotalPaid();
    await student.save();
  }

  // Update coach profile student counts
  const CoachProfile = mongoose.model('CoachProfile');
  const profile = await CoachProfile.findOne({ userId: coachId });

  if (profile) {
    const activeCount = await this.countDocuments({ coachId, status: 'active', isDeleted: false });
    const totalCount = await this.countDocuments({ coachId, isDeleted: false });
    await profile.updateStudentStats(activeCount, totalCount);
  }
};

// === HOOKS ===

// Before save - auto-link to PlayerProfile if not already linked
coachStudentSchema.pre('save', async function(next) {
  if (this.isNew && !this.playerProfileId) {
    await this.linkPlayerProfile();
  }
  next();
});

// After save - update coach profile stats
coachStudentSchema.post('save', async function(doc) {
  const CoachProfile = mongoose.model('CoachProfile');
  const profile = await CoachProfile.findOne({ userId: doc.coachId });

  if (profile) {
    const activeCount = await mongoose.model('CoachStudent').countDocuments({
      coachId: doc.coachId,
      status: 'active',
      isDeleted: false
    });

    const totalCount = await mongoose.model('CoachStudent').countDocuments({
      coachId: doc.coachId,
      isDeleted: false
    });

    await profile.updateStudentStats(activeCount, totalCount);
  }
});

const CoachStudent = mongoose.model('CoachStudent', coachStudentSchema);

module.exports = CoachStudent;
