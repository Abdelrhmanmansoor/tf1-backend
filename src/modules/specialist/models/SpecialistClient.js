const mongoose = require('mongoose');

const specialistClientSchema = new mongoose.Schema({
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

  // === CLIENT STATUS ===
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'former'],
    default: 'active',
    index: true
  },

  // === CLIENT TYPE ===
  clientType: {
    type: String,
    enum: ['player', 'coach', 'regular', 'club_member'],
    required: true
  },

  sport: {
    type: String
  },

  // === RELATIONSHIP DATES ===
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },

  // === GOALS & OBJECTIVES ===
  goals: [{
    goal: String,
    goalAr: String,
    targetDate: Date,
    achieved: Boolean,
    achievedDate: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    notes: String
  }],

  // === HEALTH & MEDICAL INFORMATION (encrypted) ===
  medicalHistory: {
    conditions: [String],
    previousInjuries: [{
      injury: String,
      date: Date,
      severity: String,
      treatment: String,
      fullyRecovered: Boolean
    }],
    surgeries: [{
      surgery: String,
      date: Date,
      notes: String
    }],
    allergies: [String],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date
    }],
    familyHistory: String,
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current']
    },
    alcoholConsumption: String
  },

  // === CURRENT CONDITION ===
  currentCondition: {
    primaryComplaint: String,
    primaryComplaintAr: String,
    symptoms: [String],
    onsetDate: Date,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    affectedAreas: [String],
    limitedActivities: [String]
  },

  // === INITIAL ASSESSMENT ===
  initialAssessment: {
    date: Date,
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    findings: String,
    findingsAr: String,
    recommendations: String,
    recommendationsAr: String,
    estimatedDuration: String,
    prognosis: String
  },

  // === MEASUREMENTS & PROGRESS (for Nutrition/Fitness) ===
  measurements: [{
    date: {
      type: Date,
      default: Date.now
    },
    weight: Number,
    height: Number,
    bmi: Number,
    bodyFatPercentage: Number,
    muscleMass: Number,
    visceralFat: Number,
    chest: Number,
    waist: Number,
    hips: Number,
    arms: Number,
    thighs: Number,
    notes: String
  }],

  // === FITNESS METRICS (for Fitness Trainers) ===
  fitnessMetrics: [{
    date: {
      type: Date,
      default: Date.now
    },
    strengthTests: {
      benchPress: Number,
      squat: Number,
      deadlift: Number,
      pullUps: Number,
      pushUps: Number
    },
    enduranceTests: {
      runningDistance: Number,
      runningTime: Number,
      vo2Max: Number
    },
    flexibilityTests: {
      sitAndReach: Number,
      shoulderMobility: Number
    },
    notes: String
  }],

  // === PAIN & RECOVERY TRACKING (for Physiotherapy) ===
  painTracking: [{
    date: {
      type: Date,
      default: Date.now
    },
    painLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    location: String,
    description: String,
    triggers: [String],
    reliefMethods: [String]
  }],

  rangeOfMotion: [{
    date: {
      type: Date,
      default: Date.now
    },
    joint: String,
    movement: String,
    degrees: Number,
    notes: String
  }],

  // === PSYCHOLOGICAL ASSESSMENT (for Sports Psychology) ===
  psychologicalProfile: {
    stressLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    anxietyLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    motivationLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    confidenceLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    primaryConcerns: [String],
    copingMechanisms: [String],
    supportSystem: String
  },

  // === ASSIGNED PROGRAMS ===
  assignedPrograms: [{
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecialistProgram'
    },
    assignedDate: Date,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled']
    },
    compliance: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: String
  }],

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
    lastSessionDate: Date,
    nextSessionDate: Date
  },

  // === PROGRESS SUMMARY ===
  progressSummary: {
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    goalsAchieved: {
      type: Number,
      default: 0
    },
    totalGoals: {
      type: Number,
      default: 0
    },
    keyImprovements: [String],
    ongoingChallenges: [String],
    lastUpdated: Date
  },

  // === NOTES ===
  privateNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['general', 'important', 'medical', 'behavioral', 'other']
    }
  }],

  // === EMERGENCY CONTACT ===
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String,
    email: String
  },

  // === DOCUMENTS ===
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['consent_form', 'medical_report', 'test_results', 'plan', 'other']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === PHOTOS (Progress tracking) ===
  progressPhotos: [{
    url: String,
    type: {
      type: String,
      enum: ['before', 'during', 'after']
    },
    date: {
      type: Date,
      default: Date.now
    },
    caption: String,
    isPrivate: {
      type: Boolean,
      default: true
    }
  }],

  // === PREFERENCES ===
  preferences: {
    preferredSessionTime: String,
    preferredSessionDuration: Number,
    preferredLocation: String,
    communicationMethod: {
      type: String,
      enum: ['phone', 'email', 'app', 'whatsapp']
    },
    reminderPreference: {
      type: Boolean,
      default: true
    },
    reminderTiming: {
      type: Number,
      default: 24 // hours before session
    }
  },

  // === RATING ===
  clientRating: {
    type: Number,
    min: 1,
    max: 5
  },

  // === STATUS FLAGS ===
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
specialistClientSchema.index({ specialistId: 1, clientId: 1 }, { unique: true });
specialistClientSchema.index({ specialistId: 1, status: 1 });
specialistClientSchema.index({ specialistId: 1, isFavorite: 1 });

// === VIRTUALS ===
specialistClientSchema.virtual('relationshipDuration').get(function() {
  const endDate = this.endDate || new Date();
  const duration = endDate - this.startDate;
  return Math.floor(duration / (1000 * 60 * 60 * 24)); // days
});

// === METHODS ===

// Add measurement
specialistClientSchema.methods.addMeasurement = function(measurementData) {
  // Calculate BMI if height and weight provided
  if (measurementData.weight && measurementData.height) {
    const heightInMeters = measurementData.height / 100;
    measurementData.bmi = (measurementData.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }

  this.measurements.push({
    ...measurementData,
    date: new Date()
  });

  return this;
};

// Track progress
specialistClientSchema.methods.updateProgress = function() {
  const totalGoals = this.goals.length;
  const achievedGoals = this.goals.filter(g => g.achieved).length;

  this.progressSummary.totalGoals = totalGoals;
  this.progressSummary.goalsAchieved = achievedGoals;
  this.progressSummary.overallProgress = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;
  this.progressSummary.lastUpdated = new Date();

  return this;
};

// Add note
specialistClientSchema.methods.addNote = function(note, category = 'general') {
  this.privateNotes.push({
    note,
    addedBy: this.specialistId,
    addedAt: new Date(),
    category
  });

  return this;
};

// === STATIC METHODS ===

// Get all clients for specialist
specialistClientSchema.statics.getSpecialistClients = async function(specialistId, filters = {}) {
  const query = { specialistId, isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.clientType) query.clientType = filters.clientType;
  if (filters.sport) query.sport = filters.sport;
  if (filters.isFavorite !== undefined) query.isFavorite = filters.isFavorite;

  return this.find(query)
    .populate('clientId', 'fullName profilePicture email phoneNumber')
    .sort({ isFavorite: -1, startDate: -1 });
};

// Get client statistics
specialistClientSchema.statics.getClientStatistics = async function(specialistId) {
  const stats = await this.aggregate([
    { $match: { specialistId: new mongoose.Types.ObjectId(specialistId), isDeleted: false } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 }
    }}
  ]);

  return stats;
};

const SpecialistClient = mongoose.model('SpecialistClient', specialistClientSchema);

module.exports = SpecialistClient;
