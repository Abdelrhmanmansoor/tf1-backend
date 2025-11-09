const mongoose = require('mongoose');

const specialistProfileSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // === SPECIALIZATION ===
  primarySpecialization: {
    type: String,
    enum: ['sports_physiotherapy', 'sports_nutrition', 'fitness_training',
           'sports_psychology', 'injury_rehabilitation', 'sports_massage'],
    required: true,
    index: true
  },
  additionalSpecializations: [{
    type: String,
    enum: ['sports_physiotherapy', 'sports_nutrition', 'fitness_training',
           'sports_psychology', 'injury_rehabilitation', 'sports_massage']
  }],

  // Sub-specializations based on primary type
  subSpecializations: [{
    type: String
  }],

  // === PROFESSIONAL CREDENTIALS ===
  education: {
    degree: {
      type: String,
      enum: ['bachelor', 'master', 'phd', 'diploma', 'certificate']
    },
    fieldOfStudy: String,
    fieldOfStudyAr: String,
    institution: String,
    institutionAr: String,
    graduationYear: Number
  },

  certifications: [{
    name: String,
    nameAr: String,
    issuingOrganization: String, // Frontend field name
    issuedBy: String,            // Keep for backward compatibility
    issuedByAr: String,
    issueDate: Date,             // Frontend field name
    issuedDate: Date,            // Keep for backward compatibility
    expiryDate: Date,
    certificateUrl: String,
    credentialId: String,        // Frontend field name
    licenseNumber: String        // Keep for backward compatibility
  }],

  professionalLicenseNumber: {
    type: String
  },
  professionalAssociations: [{
    // License fields (from frontend)
    licenseNumber: { type: String },
    issuingAuthority: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    },

    // Professional association fields (legacy/backward compatibility)
    name: String,
    nameAr: String,
    membershipNumber: String,
    joinDate: Date
  }],

  // === EXPERIENCE ===
  experienceYears: {
    type: Number,
    default: 0,
    min: 0
  },

  sportsSpecializedIn: [{
    type: String
  }],

  ageGroupsServed: [{
    type: String,
    enum: ['kids', 'youth', 'adults', 'seniors', 'elite_athletes']
  }],

  levelsServed: [{
    type: String,
    enum: ['beginner', 'amateur', 'semi-pro', 'professional', 'elite']
  }],

  previousExperience: [{
    // Education fields (from frontend)
    degree: { type: String },
    institution: { type: String },
    graduationYear: { type: Number },
    fieldOfStudy: { type: String },

    // Work experience fields (legacy/backward compatibility)
    organization: String,
    organizationAr: String,
    type: {
      type: String,
      enum: ['club', 'national_team', 'academy', 'hospital', 'private_practice', 'other']
    },
    role: String,
    roleAr: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean,
    description: String,
    descriptionAr: String
  }],

  notableClients: [{
    name: String,
    sport: String,
    achievement: String,
    achievementAr: String,
    year: Number
  }],

  // === BIO & ABOUT ===
  bio: {
    type: String
  },
  bioAr: {
    type: String
  },
  languages: [{
    type: String,
    enum: ['arabic', 'english', 'french', 'german', 'spanish', 'italian', 'other']
  }],

  // === PROFILE IMAGES ===
  avatar: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    mediumUrl: String,
    largeUrl: String
  },
  banner: {
    url: String,
    publicId: String,
    mobileUrl: String,
    tabletUrl: String,
    desktopUrl: String
  },

  // === SPECIALIZATION-SPECIFIC DETAILS ===

  // For Physiotherapists
  physiotherapy: {
    injuryTypes: [{
      type: String,
      enum: ['ACL', 'meniscus', 'muscle_tear', 'sprain', 'fracture', 'tendonitis',
             'shoulder_injury', 'back_pain', 'knee_injury', 'ankle_injury', 'other']
    }],
    treatmentTechniques: [{
      type: String,
      enum: ['manual_therapy', 'electrotherapy', 'hydrotherapy', 'dry_needling',
             'kinesio_taping', 'exercise_therapy', 'massage', 'other']
    }],
    rehabilitationPrograms: [{
      name: String,
      nameAr: String,
      duration: String,
      description: String
    }]
  },

  // For Nutritionists
  nutrition: {
    dietTypes: [{
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'performance', 'recovery',
             'endurance', 'strength', 'general_health', 'medical_diet']
    }],
    sportSpecificNutrition: [{
      sport: String,
      specialization: String
    }],
    supplementsAdvice: Boolean,
    mealPlanning: Boolean,
    customMealPrep: Boolean
  },

  // For Fitness Trainers
  fitness: {
    trainingTypes: [{
      type: String,
      enum: ['strength', 'endurance', 'HIIT', 'functional', 'crossfit',
             'bodybuilding', 'cardio', 'flexibility', 'sports_specific']
    }],
    fitnessPrograms: [{
      name: String,
      nameAr: String,
      type: String,
      duration: String,
      description: String
    }],
    equipmentUsed: [{
      type: String,
      enum: ['free_weights', 'machines', 'bodyweight', 'resistance_bands',
             'kettlebells', 'trx', 'functional_equipment', 'cardio_machines']
    }]
  },

  // For Sports Psychologists
  psychology: {
    specializations: [{
      type: String,
      enum: ['mental_health', 'stress_management', 'motivation', 'confidence',
             'focus', 'anxiety', 'depression', 'injury_recovery', 'performance']
    }],
    techniques: [{
      type: String,
      enum: ['CBT', 'mindfulness', 'visualization', 'goal_setting',
             'relaxation', 'biofeedback', 'hypnosis', 'other']
    }],
    ageGroupExpertise: [{
      type: String,
      enum: ['children', 'adolescents', 'adults', 'seniors']
    }]
  },

  // === SERVICE OFFERINGS ===
  servicesOffered: [{
    type: {
      type: String,
      enum: ['individual_consultation', 'group_session', 'initial_assessment',
             'follow_up', 'long_term_program', 'emergency_consultation',
             'online_consultation', 'home_visit', 'comprehensive_assessment'],
      required: true
    },
    name: String,
    nameAr: String,
    description: String,
    descriptionAr: String,
    duration: Number, // in minutes
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // === CONSULTATION TYPES ===
  consultationTypes: {
    type: [String],
    enum: ['individual', 'group', 'team', 'workshop'],
    default: []
  },

  // === ONLINE CONSULTATION SETTINGS ===
  onlineConsultation: {
    available: {
      type: Boolean,
      default: false
    },
    platforms: {
      type: [String],
      enum: ['zoom', 'google-meet', 'microsoft-teams', 'skype'],
      default: []
    }
  },

  // === LOCATION & AVAILABILITY ===
  serviceLocations: [{
    type: {
      type: String,
      enum: ['clinic', 'gym', 'home_visit', 'online', 'private_clinic', 'club_facility', 'academy', 'client_location']
    },
    name: String,
    nameAr: String,
    address: {
      street: String,
      streetAr: String,
      city: String,
      cityAr: String,
      state: String,
      stateAr: String,
      country: String,
      countryAr: String,
      postalCode: String,
      area: String,
      areaAr: String
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    },
    isPrimary: Boolean
  }],

  areasServed: [{
    city: String,
    cityAr: String,
    areas: [String]
  }],

  workingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isAvailable: Boolean,
    slots: [{
      startTime: String,
      endTime: String
    }]
  }],

  // === PRICING ===
  pricing: {
    currency: {
      type: String,
      default: 'EGP'
    },
    initialConsultation: {
      price: Number,
      duration: Number,
      description: String,
      descriptionAr: String
    },
    individualSession: {
      price: Number,
      duration: Number,
      description: String,
      descriptionAr: String
    },
    groupSession: {
      price: Number,
      maxParticipants: Number,
      duration: Number,
      description: String,
      descriptionAr: String
    },
    onlineConsultation: {
      price: Number,
      duration: Number,
      description: String,
      descriptionAr: String
    },
    homeVisit: {
      price: Number,
      duration: Number,
      additionalFees: String,
      description: String,
      descriptionAr: String
    },
    comprehensiveAssessment: {
      price: Number,
      duration: Number,
      description: String,
      descriptionAr: String
    },
    monthlyPackage: {
      price: Number,
      sessionsIncluded: Number,
      duration: String,
      description: String,
      descriptionAr: String
    },
    customPackages: [{
      name: String,
      nameAr: String,
      price: Number,
      sessionsIncluded: Number,
      duration: String,
      description: String,
      descriptionAr: String
    }]
  },

  // === CLIENT STATISTICS ===
  clientStats: {
    totalClients: {
      type: Number,
      default: 0
    },
    activeClients: {
      type: Number,
      default: 0
    },
    formerClients: {
      type: Number,
      default: 0
    },
    newClientsThisMonth: {
      type: Number,
      default: 0
    }
  },

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
    completionRate: {
      type: Number,
      default: 0
    }
  },

  // === RATINGS & REVIEWS ===
  ratingStats: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    ratingDistribution: {
      fiveStars: { type: Number, default: 0 },
      fourStars: { type: Number, default: 0 },
      threeStars: { type: Number, default: 0 },
      twoStars: { type: Number, default: 0 },
      oneStar: { type: Number, default: 0 }
    },
    detailedRatings: {
      professionalism: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      effectiveness: { type: Number, default: 0 },
      punctuality: { type: Number, default: 0 },
      valueForMoney: { type: Number, default: 0 }
    }
  },

  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // === EARNINGS STATISTICS ===
  earningsStats: {
    totalEarnings: {
      type: Number,
      default: 0
    },
    monthlyEarnings: {
      type: Number,
      default: 0
    },
    averageSessionPrice: {
      type: Number,
      default: 0
    }
  },

  // === MEDIA GALLERY ===
  photos: [{
    url: String,
    caption: String,
    captionAr: String,
    type: {
      type: String,
      enum: ['profile', 'facility', 'certificate', 'before_after', 'work', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  videos: [{
    url: String,
    thumbnail: String,
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    duration: Number,
    type: {
      type: String,
      enum: ['introduction', 'technique', 'tutorial', 'testimonial', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === SUCCESS STORIES ===
  successStories: [{
    title: String,
    titleAr: String,
    clientName: String, // optional, can be anonymous
    clientType: {
      type: String,
      enum: ['player', 'coach', 'regular']
    },
    sport: String,
    problem: String,
    problemAr: String,
    solution: String,
    solutionAr: String,
    results: String,
    resultsAr: String,
    duration: String,
    beforePhotos: [String],
    afterPhotos: [String],
    testimonial: String,
    testimonialAr: String,
    date: Date
  }],

  // === SETTINGS ===
  bookingSettings: {
    autoAcceptRequests: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    minimumNotice: {
      type: Number,
      default: 24 // hours
    },
    maximumAdvanceBooking: {
      type: Number,
      default: 30 // days
    },
    maxSessionsPerDay: {
      type: Number,
      default: 8
    },
    breakBetweenSessions: {
      type: Number,
      default: 15 // minutes
    }
  },

  cancellationPolicy: {
    allowCancellation: {
      type: Boolean,
      default: true
    },
    refundableHours: {
      type: Number,
      default: 24
    },
    refundPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    policy: String,
    policyAr: String
  },

  // === PRIVACY SETTINGS ===
  privacy: {
    showPhoneNumber: {
      type: Boolean,
      default: false
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: true
    },
    showPricing: {
      type: Boolean,
      default: true
    },
    showClientCount: {
      type: Boolean,
      default: true
    },
    showEarnings: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'registered_only', 'private'],
      default: 'public'
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    allowBookings: {
      type: Boolean,
      default: true
    }
  },

  // === VERIFICATION ===
  verification: {
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationDate: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    licenseVerified: {
      type: Boolean,
      default: false
    },
    backgroundCheckCompleted: {
      type: Boolean,
      default: false
    }
  },

  // === STATUS ===
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification',
    index: true
  },
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
  isAvailableForClubs: {
    type: Boolean,
    default: true
  },
  isAcceptingNewClients: {
    type: Boolean,
    default: true
  },

  // === METADATA ===
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  searchKeywords: [{
    type: String
  }],
  profileViews: {
    type: Number,
    default: 0
  },
  lastActivityDate: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
specialistProfileSchema.index({ primarySpecialization: 1, experienceYears: -1 });
specialistProfileSchema.index({ 'serviceLocations.city': 1 });
specialistProfileSchema.index({ 'ratingStats.averageRating': -1 });
specialistProfileSchema.index({ sportsSpecializedIn: 1 });
specialistProfileSchema.index({ 'pricing.individualSession.price': 1 });
specialistProfileSchema.index({ bio: 'text', bioAr: 'text' });

// === VIRTUALS ===
specialistProfileSchema.virtual('allSpecializations').get(function() {
  return [this.primarySpecialization, ...this.additionalSpecializations];
});

specialistProfileSchema.virtual('isFullyVerified').get(function() {
  return this.verification.isVerified && this.verification.licenseVerified;
});

// === METHODS ===

// Calculate profile completion percentage
specialistProfileSchema.methods.calculateCompletionPercentage = function() {
  let score = 0;
  const maxScore = 100;

  // Basic info (20 points)
  if (this.primarySpecialization) score += 10;
  if (this.bio) score += 5;
  if (this.languages?.length > 0) score += 5;

  // Credentials (20 points)
  if (this.education?.degree) score += 5;
  if (this.certifications?.length > 0) score += 10;
  if (this.professionalLicenseNumber) score += 5;

  // Experience (15 points)
  if (this.experienceYears > 0) score += 5;
  if (this.sportsSpecializedIn?.length > 0) score += 5;
  if (this.previousExperience?.length > 0) score += 5;

  // Services & Pricing (15 points)
  if (this.servicesOffered?.length > 0) score += 7;
  if (this.pricing?.individualSession?.price) score += 8;

  // Location (10 points)
  if (this.serviceLocations?.length > 0) score += 10;

  // Media (10 points)
  if (this.photos?.length > 0) score += 5;
  if (this.videos?.length > 0) score += 5;

  // Specialization details (10 points)
  if (this.primarySpecialization === 'sports_physiotherapy' && this.physiotherapy?.injuryTypes?.length > 0) score += 10;
  if (this.primarySpecialization === 'sports_nutrition' && this.nutrition?.dietTypes?.length > 0) score += 10;
  if (this.primarySpecialization === 'fitness_training' && this.fitness?.trainingTypes?.length > 0) score += 10;
  if (this.primarySpecialization === 'sports_psychology' && this.psychology?.specializations?.length > 0) score += 10;

  this.completionPercentage = Math.min(score, maxScore);
  return this.completionPercentage;
};

// Get public profile
specialistProfileSchema.methods.getPublicProfile = function() {
  const profile = {
    _id: this._id,
    userId: this.userId,
    primarySpecialization: this.primarySpecialization,
    additionalSpecializations: this.additionalSpecializations,
    bio: this.bio,
    bioAr: this.bioAr,
    experienceYears: this.experienceYears,
    sportsSpecializedIn: this.sportsSpecializedIn,
    ageGroupsServed: this.ageGroupsServed,
    languages: this.languages,
    ratingStats: this.ratingStats,
    verification: this.verification,
    photos: this.photos,
    videos: this.videos,
    successStories: this.successStories,
    completionPercentage: this.completionPercentage
  };

  if (this.privacy.showPricing) {
    profile.pricing = this.pricing;
  }

  if (this.privacy.showLocation) {
    profile.serviceLocations = this.serviceLocations;
    profile.areasServed = this.areasServed;
  }

  if (this.privacy.showClientCount) {
    profile.clientStats = this.clientStats;
  }

  return profile;
};

// Generate search keywords
specialistProfileSchema.methods.generateSearchKeywords = function() {
  const keywords = new Set();

  keywords.add(this.primarySpecialization);
  this.additionalSpecializations?.forEach(spec => keywords.add(spec));
  this.sportsSpecializedIn?.forEach(sport => keywords.add(sport.toLowerCase()));
  this.subSpecializations?.forEach(sub => keywords.add(sub.toLowerCase()));

  if (this.primarySpecialization === 'sports_physiotherapy') {
    this.physiotherapy?.injuryTypes?.forEach(injury => keywords.add(injury));
    this.physiotherapy?.treatmentTechniques?.forEach(technique => keywords.add(technique));
  }

  if (this.primarySpecialization === 'sports_nutrition') {
    this.nutrition?.dietTypes?.forEach(diet => keywords.add(diet));
  }

  if (this.primarySpecialization === 'fitness_training') {
    this.fitness?.trainingTypes?.forEach(type => keywords.add(type));
  }

  if (this.primarySpecialization === 'sports_psychology') {
    this.psychology?.specializations?.forEach(spec => keywords.add(spec));
  }

  this.searchKeywords = Array.from(keywords);
  return this.searchKeywords;
};

// === HOOKS ===

// Before save
specialistProfileSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.calculateCompletionPercentage();
    this.generateSearchKeywords();
    this.lastActivityDate = new Date();
  }
  next();
});

// After save - update user's role
specialistProfileSchema.post('save', async function(doc) {
  const User = mongoose.model('User');
  const user = await User.findById(doc.userId);

  // Update user role to 'specialist' if not already set
  if (user && user.role !== 'specialist') {
    user.role = 'specialist';
    await user.save();
  }
});

const SpecialistProfile = mongoose.model('SpecialistProfile', specialistProfileSchema);

module.exports = SpecialistProfile;
