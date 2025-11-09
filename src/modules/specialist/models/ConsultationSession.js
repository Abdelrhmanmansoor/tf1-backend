const mongoose = require('mongoose');

const consultationSessionSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  specialistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === SESSION DETAILS ===
  sessionType: {
    type: String,
    enum: ['initial_consultation', 'follow_up', 'treatment', 'training',
           'assessment', 'emergency', 'online', 'group'],
    required: true
  },

  specialization: {
    type: String,
    enum: ['sports_physiotherapy', 'sports_nutrition', 'fitness_training',
           'sports_psychology', 'injury_rehabilitation', 'sports_massage'],
    required: true
  },

  // === SCHEDULING ===
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },

  // === LOCATION ===
  locationType: {
    type: String,
    enum: ['clinic', 'online', 'home_visit', 'club', 'client_location', 'other'],
    required: true
  },
  location: {
    address: String,
    addressAr: String,
    city: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    meetingLink: String, // for online sessions
    notes: String
  },

  // === PRICING ===
  price: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number
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
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_payment', 'card', 'club_payment']
  },

  // === SESSION GOALS ===
  goals: [{
    goal: String,
    goalAr: String,
    achieved: Boolean,
    notes: String
  }],

  // === CONSULTATION DETAILS (for Physiotherapy) ===
  physiotherapy: {
    chiefComplaint: String,
    chiefComplaintAr: String,
    painLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    rangeOfMotion: {
      affected: String,
      before: String,
      after: String
    },
    treatmentProvided: [{
      technique: String,
      duration: Number,
      intensity: String
    }],
    exercisesAssigned: [{
      exercise: String,
      sets: Number,
      reps: Number,
      frequency: String
    }],
    homeExercisePlan: String
  },

  // === NUTRITION SESSION (for Nutritionists) ===
  nutrition: {
    currentWeight: Number,
    targetWeight: Number,
    bodyFatPercentage: Number,
    muscleMass: Number,
    measurements: {
      chest: Number,
      waist: Number,
      hips: Number,
      arms: Number,
      thighs: Number
    },
    dietaryHabits: String,
    allergies: [String],
    supplementsRecommended: [{
      name: String,
      dosage: String,
      timing: String,
      duration: String
    }],
    mealPlanAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecialistProgram'
    },
    waterIntake: String,
    calorieTarget: Number
  },

  // === FITNESS SESSION (for Fitness Trainers) ===
  fitness: {
    workoutType: String,
    intensity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very_high']
    },
    exercisesPerformed: [{
      exercise: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number,
      notes: String
    }],
    performanceMetrics: {
      heartRate: {
        resting: Number,
        peak: Number,
        average: Number
      },
      caloriesBurned: Number,
      distanceCovered: Number
    },
    workoutPlanAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecialistProgram'
    }
  },

  // === PSYCHOLOGY SESSION (for Sports Psychologists) ===
  psychology: {
    sessionFocus: [{
      type: String,
      enum: ['anxiety', 'stress', 'motivation', 'confidence', 'focus',
             'injury_recovery', 'performance', 'goal_setting', 'other']
    }],
    moodAssessment: {
      before: {
        type: Number,
        min: 1,
        max: 10
      },
      after: {
        type: Number,
        min: 1,
        max: 10
      }
    },
    techniquesUsed: [{
      type: String,
      enum: ['CBT', 'mindfulness', 'visualization', 'goal_setting',
             'relaxation', 'biofeedback', 'other']
    }],
    homeworkAssigned: String,
    homeworkAssignedAr: String,
    progressNotes: String
  },

  // === SESSION NOTES ===
  sessionNotes: {
    type: String
  },
  sessionNotesAr: {
    type: String
  },
  privateNotes: {
    type: String // only visible to specialist
  },

  // === PROGRESS TRACKING ===
  progress: {
    overallProgress: {
      type: Number,
      min: 0,
      max: 100
    },
    improvements: [String],
    challenges: [String],
    recommendations: String,
    recommendationsAr: String
  },

  // === NEXT STEPS ===
  nextSession: {
    recommended: Boolean,
    recommendedDate: Date,
    recommendedFrequency: String,
    followUpNotes: String
  },

  // === ATTENDANCE ===
  attendance: {
    checkedIn: Boolean,
    checkInTime: Date,
    checkedOut: Boolean,
    checkOutTime: Date,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    }
  },

  // === DOCUMENTS & MEDIA ===
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['report', 'plan', 'prescription', 'test_results', 'consent_form', 'other']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  photos: [{
    url: String,
    type: {
      type: String,
      enum: ['before', 'after', 'during', 'progress']
    },
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === RATING & FEEDBACK ===
  rating: {
    clientRating: {
      type: Number,
      min: 1,
      max: 5
    },
    clientFeedback: String,
    clientFeedbackAr: String,
    ratedAt: Date,
    detailedRatings: {
      professionalism: Number,
      communication: Number,
      effectiveness: Number,
      punctuality: Number,
      valueForMoney: Number
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

  // === RESCHEDULING ===
  rescheduling: [{
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rescheduledAt: Date,
    oldDate: Date,
    oldTime: String,
    newDate: Date,
    newTime: String,
    reason: String
  }],

  // === METADATA ===
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConsultationRequest'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSeriesId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // === STATUS FLAGS ===
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
consultationSessionSchema.index({ specialistId: 1, scheduledDate: 1 });
consultationSessionSchema.index({ clientId: 1, scheduledDate: 1 });
consultationSessionSchema.index({ 'attendance.status': 1 });
consultationSessionSchema.index({ createdAt: -1 });

// === VIRTUALS ===
consultationSessionSchema.virtual('isPast').get(function() {
  return new Date() > this.scheduledDate;
});

consultationSessionSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.scheduledDate;
});

consultationSessionSchema.virtual('isToday').get(function() {
  const today = new Date();
  const sessionDate = new Date(this.scheduledDate);
  return today.toDateString() === sessionDate.toDateString();
});

// === METHODS ===

// Check in
consultationSessionSchema.methods.checkIn = function() {
  this.attendance.checkedIn = true;
  this.attendance.checkInTime = new Date();
  this.attendance.status = 'in_progress';
  return this;
};

// Check out / Complete session
consultationSessionSchema.methods.complete = function(sessionNotes, progress) {
  this.attendance.checkedOut = true;
  this.attendance.checkOutTime = new Date();
  this.attendance.status = 'completed';

  if (sessionNotes) {
    this.sessionNotes = sessionNotes;
  }

  if (progress) {
    this.progress = { ...this.progress, ...progress };
  }

  // Calculate net amount
  this.netAmount = this.price - (this.platformFee || 0);

  return this;
};

// Cancel session
consultationSessionSchema.methods.cancel = function(cancelledBy, reason, reasonAr, refundAmount = 0) {
  this.attendance.status = 'cancelled';
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

// Reschedule session
consultationSessionSchema.methods.reschedule = function(rescheduledBy, newDate, newTime, reason) {
  this.rescheduling.push({
    rescheduledBy,
    rescheduledAt: new Date(),
    oldDate: this.scheduledDate,
    oldTime: this.startTime,
    newDate,
    newTime,
    reason
  });

  this.scheduledDate = newDate;
  this.startTime = newTime;
  this.attendance.status = 'rescheduled';

  return this;
};

// Rate session
consultationSessionSchema.methods.rate = function(rating, feedback, feedbackAr, detailedRatings) {
  this.rating = {
    clientRating: rating,
    clientFeedback: feedback,
    clientFeedbackAr: feedbackAr,
    ratedAt: new Date(),
    detailedRatings
  };

  return this;
};

// === STATIC METHODS ===

// Get specialist's sessions
consultationSessionSchema.statics.getSpecialistSessions = async function(specialistId, filters = {}) {
  const query = { specialistId, isDeleted: false };

  if (filters.status) query['attendance.status'] = filters.status;
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.sessionType) query.sessionType = filters.sessionType;

  if (filters.startDate || filters.endDate) {
    query.scheduledDate = {};
    if (filters.startDate) query.scheduledDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.scheduledDate.$lte = new Date(filters.endDate);
  }

  return this.find(query)
    .populate('clientId', 'fullName profilePicture email phoneNumber')
    .sort({ scheduledDate: -1 });
};

// Get client's sessions
consultationSessionSchema.statics.getClientSessions = async function(clientId) {
  return this.find({ clientId, isDeleted: false })
    .populate('specialistId', 'fullName profilePicture')
    .sort({ scheduledDate: -1 });
};

// Get today's sessions for specialist
consultationSessionSchema.statics.getTodaySessions = async function(specialistId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    specialistId,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    'attendance.status': { $in: ['scheduled', 'in_progress'] },
    isDeleted: false
  })
  .populate('clientId', 'fullName profilePicture phoneNumber')
  .sort({ startTime: 1 });
};

// === HOOKS ===

// After save - update specialist statistics
consultationSessionSchema.post('save', async function(doc) {
  if (doc.attendance.status === 'completed') {
    const SpecialistProfile = mongoose.model('SpecialistProfile');
    const profile = await SpecialistProfile.findOne({ userId: doc.specialistId });

    if (profile) {
      profile.sessionStats.completedSessions += 1;
      profile.sessionStats.totalSessions += 1;

      // Update rating if session was rated
      if (doc.rating?.clientRating) {
        const totalRating = (profile.ratingStats.averageRating * profile.ratingStats.totalReviews) + doc.rating.clientRating;
        profile.ratingStats.totalReviews += 1;
        profile.ratingStats.averageRating = totalRating / profile.ratingStats.totalReviews;

        // Update rating distribution
        const stars = Math.round(doc.rating.clientRating);
        const key = stars === 5 ? 'fiveStars' :
                   stars === 4 ? 'fourStars' :
                   stars === 3 ? 'threeStars' :
                   stars === 2 ? 'twoStars' : 'oneStar';
        profile.ratingStats.ratingDistribution[key] += 1;

        // Update detailed ratings
        if (doc.rating.detailedRatings) {
          Object.keys(doc.rating.detailedRatings).forEach(key => {
            if (profile.ratingStats.detailedRatings[key] !== undefined) {
              const currentAvg = profile.ratingStats.detailedRatings[key];
              const newRating = doc.rating.detailedRatings[key];
              const newAvg = ((currentAvg * (profile.ratingStats.totalReviews - 1)) + newRating) / profile.ratingStats.totalReviews;
              profile.ratingStats.detailedRatings[key] = newAvg;
            }
          });
        }
      }

      await profile.save();
    }
  }
});

const ConsultationSession = mongoose.model('ConsultationSession', consultationSessionSchema);

module.exports = ConsultationSession;
