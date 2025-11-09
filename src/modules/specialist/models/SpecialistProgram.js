const mongoose = require('mongoose');

const specialistProgramSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  specialistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // === PROGRAM TYPE ===
  programType: {
    type: String,
    enum: ['physiotherapy', 'nutrition', 'fitness', 'psychology', 'general'],
    required: true,
    index: true
  },

  // === PROGRAM DETAILS ===
  name: {
    type: String,
    required: true
  },
  nameAr: {
    type: String
  },
  description: {
    type: String
  },
  descriptionAr: {
    type: String
  },

  // === PROGRAM CATEGORY ===
  category: {
    type: String,
    enum: ['rehabilitation', 'prevention', 'recovery', 'performance', 'weight_loss',
           'muscle_gain', 'endurance', 'strength', 'flexibility', 'mental_health',
           'stress_management', 'motivation', 'general_wellness', 'other']
  },

  // === DURATION ===
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },

  // === TARGET ===
  targetAudience: {
    sport: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional', 'all']
    },
    ageGroup: {
      type: String,
      enum: ['kids', 'youth', 'adults', 'seniors', 'all']
    }
  },

  // === GOALS ===
  goals: [{
    goal: String,
    goalAr: String,
    targetMetric: String,
    targetValue: String
  }],

  // === PHYSIOTHERAPY PROGRAM ===
  physiotherapy: {
    injuryType: String,
    affectedArea: String,
    phases: [{
      name: String,
      nameAr: String,
      duration: String,
      description: String,
      descriptionAr: String,
      exercises: [{
        name: String,
        nameAr: String,
        sets: Number,
        reps: Number,
        duration: Number,
        frequency: String,
        instructions: String,
        instructionsAr: String,
        videoUrl: String,
        imageUrl: String
      }],
      restrictions: [String],
      milestones: [String]
    }],
    homeExercises: [{
      exercise: String,
      exerciseAr: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    precautions: [String],
    precautionsAr: [String]
  },

  // === NUTRITION PROGRAM ===
  nutrition: {
    dietType: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'performance', 'recovery', 'general_health']
    },
    calorieTarget: {
      daily: Number,
      unit: String
    },
    macronutrients: {
      protein: Number, // grams
      carbs: Number,
      fats: Number
    },
    mealPlan: [{
      day: String,
      meals: [{
        mealType: {
          type: String,
          enum: ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'post_workout']
        },
        time: String,
        items: [{
          food: String,
          foodAr: String,
          quantity: String,
          calories: Number,
          protein: Number,
          carbs: Number,
          fats: Number
        }],
        notes: String,
        notesAr: String
      }]
    }],
    supplements: [{
      name: String,
      dosage: String,
      timing: String,
      duration: String,
      purpose: String
    }],
    hydration: {
      dailyWaterIntake: String,
      recommendations: String
    },
    restrictions: [String],
    restrictionsAr: [String],
    tips: [String],
    tipsAr: [String]
  },

  // === FITNESS PROGRAM ===
  fitness: {
    programType: {
      type: String,
      enum: ['strength', 'endurance', 'HIIT', 'functional', 'bodybuilding', 'sports_specific']
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    frequency: {
      sessionsPerWeek: Number,
      restDays: Number
    },
    workoutPlan: [{
      day: String,
      focus: String, // e.g., "Upper Body", "Legs", "Cardio"
      focusAr: String,
      warmUp: [{
        exercise: String,
        duration: Number
      }],
      mainWorkout: [{
        exercise: String,
        exerciseAr: String,
        sets: Number,
        reps: String,
        weight: String,
        restTime: Number,
        tempo: String,
        instructions: String,
        instructionsAr: String,
        videoUrl: String,
        imageUrl: String
      }],
      coolDown: [{
        exercise: String,
        duration: Number
      }],
      totalDuration: Number,
      notes: String,
      notesAr: String
    }],
    progressionPlan: {
      weeklyIncrease: String,
      deloadWeek: Number,
      reassessmentInterval: String
    },
    equipmentNeeded: [String]
  },

  // === PSYCHOLOGY PROGRAM ===
  psychology: {
    focusAreas: [{
      type: String,
      enum: ['stress', 'anxiety', 'motivation', 'confidence', 'focus', 'goal_setting']
    }],
    techniques: [{
      name: String,
      nameAr: String,
      description: String,
      descriptionAr: String,
      frequency: String,
      duration: String,
      instructions: String,
      instructionsAr: String
    }],
    sessions: [{
      week: Number,
      topic: String,
      topicAr: String,
      objectives: [String],
      activities: [String],
      homework: String,
      homeworkAr: String
    }],
    dailyPractices: [{
      practice: String,
      practiceAr: String,
      time: String,
      duration: Number,
      instructions: String
    }],
    milestones: [{
      week: Number,
      milestone: String,
      milestoneAr: String,
      assessmentCriteria: String
    }]
  },

  // === RESOURCES ===
  resources: [{
    type: {
      type: String,
      enum: ['video', 'article', 'pdf', 'image', 'link']
    },
    title: String,
    titleAr: String,
    url: String,
    description: String,
    descriptionAr: String
  }],

  // === TRACKING & COMPLIANCE ===
  trackingMetrics: [{
    metric: String,
    metricAr: String,
    unit: String,
    frequency: String,
    targetValue: String
  }],

  checkpoints: [{
    day: Number,
    checkpoint: String,
    checkpointAr: String,
    assessmentType: String
  }],

  // === USAGE STATISTICS ===
  usageStats: {
    timesAssigned: {
      type: Number,
      default: 0
    },
    activeClients: {
      type: Number,
      default: 0
    },
    completedByClients: {
      type: Number,
      default: 0
    },
    averageComplianceRate: {
      type: Number,
      default: 0
    }
  },

  // === TEMPLATE SETTINGS ===
  isTemplate: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  templateCategory: String,

  // === TAGS ===
  tags: [String],

  // === STATUS ===
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active'
  },
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
specialistProgramSchema.index({ specialistId: 1, programType: 1 });
specialistProgramSchema.index({ specialistId: 1, isTemplate: 1 });
specialistProgramSchema.index({ name: 'text', nameAr: 'text', description: 'text' });
specialistProgramSchema.index({ tags: 1 });

// === VIRTUALS ===
specialistProgramSchema.virtual('totalDays').get(function() {
  if (!this.duration) return 0;

  const { value, unit } = this.duration;
  if (unit === 'days') return value;
  if (unit === 'weeks') return value * 7;
  if (unit === 'months') return value * 30;
  return 0;
});

// === METHODS ===

// Clone program as template
specialistProgramSchema.methods.cloneAsTemplate = async function() {
  const clone = new this.constructor(this.toObject());
  clone._id = new mongoose.Types.ObjectId();
  clone.isTemplate = true;
  clone.isNew = true;
  clone.createdAt = new Date();
  clone.updatedAt = new Date();

  await clone.save();
  return clone;
};

// Assign to client
specialistProgramSchema.methods.assignToClient = async function(clientId) {
  const SpecialistClient = mongoose.model('SpecialistClient');
  const client = await SpecialistClient.findOne({
    specialistId: this.specialistId,
    clientId
  });

  if (client) {
    client.assignedPrograms.push({
      programId: this._id,
      assignedDate: new Date(),
      startDate: new Date(),
      status: 'active',
      compliance: 0
    });

    await client.save();

    this.usageStats.timesAssigned += 1;
    this.usageStats.activeClients += 1;
    await this.save();
  }

  return this;
};

// === STATIC METHODS ===

// Get specialist's programs
specialistProgramSchema.statics.getSpecialistPrograms = async function(specialistId, filters = {}) {
  const query = { specialistId, isDeleted: false };

  if (filters.programType) query.programType = filters.programType;
  if (filters.isTemplate !== undefined) query.isTemplate = filters.isTemplate;
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;

  return this.find(query)
    .sort({ createdAt: -1 });
};

// Get templates
specialistProgramSchema.statics.getTemplates = async function(specialistId, programType) {
  const query = {
    specialistId,
    isTemplate: true,
    isDeleted: false,
    status: 'active'
  };

  if (programType) query.programType = programType;

  return this.find(query)
    .sort({ name: 1 });
};

const SpecialistProgram = mongoose.model('SpecialistProgram', specialistProgramSchema);

module.exports = SpecialistProgram;
