const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
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

  // === SESSION DETAILS ===
  date: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 60
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true,
    default: 'individual'
  },

  // === LOCATION ===
  location: {
    type: {
      type: String,
      enum: ['indoor', 'outdoor', 'online', 'home', 'club', 'other'],
      required: true
    },
    address: String,
    addressAr: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    },
    meetingLink: String, // for online sessions
    facilityName: String
  },

  // === PRICING ===
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'cancelled'],
    default: 'pending'
  },

  // === SESSION STATUS ===
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled', 'no_show'],
    default: 'upcoming',
    index: true
  },

  // === NOTES ===
  notes: {
    type: String // Session plan or notes (visible to student)
  },
  notesAr: {
    type: String
  },
  coachNotes: {
    type: String // Private notes for coach only
  },

  // === SESSION CONTENT ===
  sessionGoals: [{
    goal: String,
    goalAr: String,
    achieved: Boolean
  }],

  exercisesPerformed: [{
    exercise: String,
    sets: Number,
    reps: Number,
    duration: Number, // in minutes
    intensity: String,
    notes: String
  }],

  skillsPracticed: [{
    skill: String,
    skillAr: String,
    progressLevel: {
      type: String,
      enum: ['needs_improvement', 'developing', 'proficient', 'excellent']
    },
    notes: String
  }],

  // === PERFORMANCE TRACKING ===
  performance: {
    attendanceQuality: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor']
    },
    effortLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    skillImprovement: {
      type: Number,
      min: 1,
      max: 10
    },
    attitudeAndBehavior: {
      type: String,
      enum: ['excellent', 'good', 'needs_improvement']
    },
    notes: String
  },

  // === PROGRESS TRACKING ===
  progress: {
    overallProgress: {
      type: Number,
      min: 0,
      max: 100
    },
    strengths: [String],
    areasForImprovement: [String],
    recommendations: String,
    recommendationsAr: String
  },

  // === HOMEWORK/PRACTICE ASSIGNMENT ===
  homework: {
    assigned: Boolean,
    description: String,
    descriptionAr: String,
    dueDate: Date,
    completed: Boolean
  },

  // === NEXT SESSION ===
  nextSession: {
    recommended: Boolean,
    suggestedDate: Date,
    focusAreas: [String]
  },

  // === RATING & FEEDBACK ===
  rating: {
    studentRating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    feedbackAr: String,
    ratedAt: Date,
    detailedRatings: {
      professionalism: Number,
      communication: Number,
      expertise: Number,
      punctuality: Number,
      value: Number
    }
  },

  // === CANCELLATION ===
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    reasonAr: String,
    refundIssued: Boolean,
    refundAmount: Number
  },

  // === MEDIA ===
  photos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  videos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

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
trainingSessionSchema.index({ coachId: 1, date: 1 });
trainingSessionSchema.index({ studentId: 1, date: 1 });
trainingSessionSchema.index({ status: 1, date: 1 });
trainingSessionSchema.index({ coachId: 1, status: 1 });
trainingSessionSchema.index({ studentId: 1, status: 1 });

// === VIRTUALS ===
trainingSessionSchema.virtual('isPast').get(function() {
  return new Date() > this.date;
});

trainingSessionSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.date;
});

trainingSessionSchema.virtual('isToday').get(function() {
  const today = new Date();
  const sessionDate = new Date(this.date);
  return today.toDateString() === sessionDate.toDateString();
});

// === METHODS ===

// Complete session
trainingSessionSchema.methods.complete = function(coachNotes, performance, progress) {
  this.status = 'completed';

  if (coachNotes) {
    this.coachNotes = coachNotes;
  }

  if (performance) {
    this.performance = { ...this.performance, ...performance };
  }

  if (progress) {
    this.progress = { ...this.progress, ...progress };
  }

  return this;
};

// Cancel session
trainingSessionSchema.methods.cancel = function(cancelledBy, reason, reasonAr, refundAmount = 0) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy,
    cancelledAt: new Date(),
    reason,
    reasonAr,
    refundIssued: refundAmount > 0,
    refundAmount
  };

  if (refundAmount > 0) {
    this.paymentStatus = 'refunded';
  }

  return this;
};

// Rate session (by student)
trainingSessionSchema.methods.rate = function(rating, feedback, feedbackAr, detailedRatings) {
  this.rating = {
    studentRating: rating,
    feedback,
    feedbackAr,
    ratedAt: new Date(),
    detailedRatings
  };

  return this;
};

// Mark as no-show
trainingSessionSchema.methods.markNoShow = function() {
  this.status = 'no_show';
  return this;
};

// === STATIC METHODS ===

// Get coach's sessions with filters
trainingSessionSchema.statics.getCoachSessions = async function(coachId, filters = {}) {
  const query = { coachId, isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.studentId) query.studentId = filters.studentId;

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  return this.find(query)
    .populate('studentId', 'firstName lastName email phone avatar')
    .sort({ date: -1 });
};

// Get student's sessions
trainingSessionSchema.statics.getStudentSessions = async function(studentId, filters = {}) {
  const query = { studentId, isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.coachId) query.coachId = filters.coachId;

  return this.find(query)
    .populate('coachId', 'firstName lastName email phone avatar')
    .sort({ date: -1 });
};

// Get today's sessions for coach
trainingSessionSchema.statics.getTodaySessions = async function(coachId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    coachId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['upcoming', 'in_progress'] },
    isDeleted: false
  })
  .populate('studentId', 'firstName lastName phone avatar')
  .sort({ date: 1 });
};

// Get upcoming sessions count for coach
trainingSessionSchema.statics.getUpcomingSessionsCount = async function(coachId) {
  const now = new Date();
  return this.countDocuments({
    coachId,
    date: { $gte: now },
    status: 'upcoming',
    isDeleted: false
  });
};

// === HOOKS ===

// After save - update coach statistics
trainingSessionSchema.post('save', async function(doc) {
  const CoachProfile = mongoose.model('CoachProfile');
  const profile = await CoachProfile.findOne({ userId: doc.coachId });

  if (profile) {
    // Count sessions by status
    const totalSessions = await mongoose.model('TrainingSession').countDocuments({
      coachId: doc.coachId,
      isDeleted: false
    });

    const completedSessions = await mongoose.model('TrainingSession').countDocuments({
      coachId: doc.coachId,
      status: 'completed',
      isDeleted: false
    });

    const cancelledSessions = await mongoose.model('TrainingSession').countDocuments({
      coachId: doc.coachId,
      status: 'cancelled',
      isDeleted: false
    });

    const upcomingSessions = await mongoose.model('TrainingSession').countDocuments({
      coachId: doc.coachId,
      status: 'upcoming',
      date: { $gte: new Date() },
      isDeleted: false
    });

    // Update session stats
    profile.sessionStats.totalSessions = totalSessions;
    profile.sessionStats.completedSessions = completedSessions;
    profile.sessionStats.cancelledSessions = cancelledSessions;
    profile.sessionStats.upcomingSessions = upcomingSessions;

    // Update rating if session was rated
    if (doc.status === 'completed' && doc.rating?.studentRating) {
      const totalRating = (profile.ratingStats.averageRating * profile.ratingStats.totalReviews) + doc.rating.studentRating;
      profile.ratingStats.totalReviews += 1;
      profile.ratingStats.averageRating = totalRating / profile.ratingStats.totalReviews;

      // Update rating distribution
      const stars = Math.round(doc.rating.studentRating);
      profile.ratingStats.ratingDistribution[stars] = (profile.ratingStats.ratingDistribution[stars] || 0) + 1;

      // Update detailed ratings
      if (doc.rating.detailedRatings) {
        Object.keys(doc.rating.detailedRatings).forEach(key => {
          if (profile.ratingStats.detailedAverages[key] !== undefined) {
            const currentAvg = profile.ratingStats.detailedAverages[key];
            const newRating = doc.rating.detailedRatings[key];
            const newAvg = ((currentAvg * (profile.ratingStats.totalReviews - 1)) + newRating) / profile.ratingStats.totalReviews;
            profile.ratingStats.detailedAverages[key] = newAvg;
          }
        });
      }
    }

    await profile.save();
  }
});

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);

module.exports = TrainingSession;
