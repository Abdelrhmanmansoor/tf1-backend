const mongoose = require('mongoose');

const coachProfileSchema = new mongoose.Schema({
  // Link to User account
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Personal Information
  bio: {
    type: String,
    maxlength: 1000
  },
  bioAr: {
    type: String,
    maxlength: 1000
  },
  birthDate: {
    type: Date
  },
  nationality: {
    type: String
  },
  languages: [{
    type: String,
    enum: ['arabic', 'english', 'french', 'spanish', 'german', 'italian', 'other']
  }],

  // Location
  location: {
    country: String,
    city: String,
    address: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    showExactLocation: {
      type: Boolean,
      default: false
    }
  },

  // Contact & Social Media
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String,
    tiktok: String,
    linkedin: String
  },

  // Professional Credentials
  primarySport: {
    type: String,
    required: true,
    index: true
  },
  additionalSports: [{
    type: String
  }],
  specializations: [{
    type: String // e.g., "Youth Training", "Goalkeeping", "Tactical Training", "Strength & Conditioning"
  }],
  specializationsAr: [{
    type: String
  }],

  // Certifications & Licenses
  certifications: [{
    name: String,
    nameAr: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String,
    level: String // e.g., "UEFA A", "CAF License", "ISSA Certified"
  }],
  licenseNumber: String,

  // Experience
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  },
  coachingLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'elite'],
    default: 'intermediate',
    index: true
  },

  // Coaching Experience History
  currentClub: {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubProfile'
    },
    clubName: String,
    position: String, // e.g., "Head Coach", "Assistant Coach"
    joinedDate: Date
  },
  previousExperience: [{
    organizationName: String,
    position: String,
    startDate: Date,
    endDate: Date,
    achievements: String,
    achievementsAr: String
  }],

  // Achievements
  achievements: [{
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    date: Date,
    type: {
      type: String,
      enum: ['championship', 'award', 'certification', 'milestone', 'other']
    }
  }],

  // Coaching Philosophy
  coachingPhilosophy: {
    type: String,
    maxlength: 1000
  },
  coachingPhilosophyAr: {
    type: String,
    maxlength: 1000
  },
  methodologies: [String], // Training methodologies used

  // Service Offerings
  trainingTypes: [{
    type: String,
    enum: ['individual', 'group', 'team', 'online', 'consultation']
  }],
  ageGroups: [{
    type: String,
    enum: ['kids', 'youth', 'adults', 'seniors', 'all']
  }],
  levels: [{
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional', 'all']
  }],


  // Location Preferences
  trainingLocations: [{
    type: String,
    enum: ['my_facility', 'client_location', 'club_facility', 'outdoor', 'online']
  }],
  serviceRadius: {
    type: Number, // kilometers willing to travel
    default: 10
  },
  willingToTravel: {
    type: Boolean,
    default: false
  },

  // Media Gallery
  avatar: String,
  bannerImage: String,
  photos: [{
    url: String,
    publicId: String,
    thumbnailUrl: String,
    mediumUrl: String,
    largeUrl: String,
    caption: String,
    captionAr: String,
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
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  highlightVideoUrl: String,

  // Statistics
  studentStats: {
    totalStudents: {
      type: Number,
      default: 0
    },
    activeStudents: {
      type: Number,
      default: 0
    },
    formerStudents: {
      type: Number,
      default: 0
    }
  },
  sessionStats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    completedSessions: {
      type: Number,
      default: 0
    },
    cancelledSessions: {
      type: Number,
      default: 0
    },
    upcomingSessions: {
      type: Number,
      default: 0
    }
  },

  // Ratings & Reviews
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
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    },
    detailedAverages: {
      professionalism: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      expertise: { type: Number, default: 0 },
      punctuality: { type: Number, default: 0 },
      value: { type: Number, default: 0 }
    }
  },

  // Response & Reliability Metrics
  metrics: {
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageResponseTime: {
      type: Number, // in hours
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    recommendationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Availability Status
  status: {
    type: String,
    enum: ['available', 'busy', 'on_vacation', 'not_accepting'],
    default: 'available',
    index: true
  },
  acceptingNewStudents: {
    type: Boolean,
    default: true
  },
  maxStudents: {
    type: Number,
    default: null // null = unlimited
  },

  // Profile Metrics
  profileViews: {
    type: Number,
    default: 0
  },
  profileCompletionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Privacy Settings
  privacy: {
    showContact: {
      type: Boolean,
      default: true
    },
    showLocation: {
      type: Boolean,
      default: true
    },
    showStudentCount: {
      type: Boolean,
      default: true
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'players_only', 'private'],
      default: 'public'
    }
  },

  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verificationDocuments: [{
    type: String,
    documentUrl: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],

  // Search optimization
  searchKeywords: [String],

  // Status flags
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

// Indexes for search performance
coachProfileSchema.index({ primarySport: 1, coachingLevel: 1 });
coachProfileSchema.index({ status: 1, isActive: 1 });
coachProfileSchema.index({ 'location.city': 1, primarySport: 1 });
coachProfileSchema.index({ 'location.coordinates': '2dsphere' });
coachProfileSchema.index({ 'ratingStats.averageRating': -1 });
coachProfileSchema.index({ isVerified: 1, status: 1 });
coachProfileSchema.index({ searchKeywords: 1 });
coachProfileSchema.index({ acceptingNewStudents: 1, status: 1 });

// Virtual for age
coachProfileSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for profile URL
coachProfileSchema.virtual('profileUrl').get(function() {
  return `/coaches/${this._id}`;
});

// Calculate profile completion percentage
coachProfileSchema.methods.calculateProfileCompletion = function() {
  let completedFields = 0;
  const totalFields = 13;

  // Required fields (8 fields)
  if (this.primarySport) completedFields++;
  if (this.yearsOfExperience && this.yearsOfExperience > 0) completedFields++;
  if (this.bio && this.bio.trim().length > 0) completedFields++;
  if (this.bioAr && this.bioAr.trim().length > 0) completedFields++;
  if (this.location && this.location.city) completedFields++;
  if (this.location && this.location.country) completedFields++;
  if (this.avatar) completedFields++;
  if (this.bannerImage) completedFields++;

  // Optional but recommended fields (5 fields)
  if (this.certifications && this.certifications.length > 0) completedFields++;
  if (this.specializations && this.specializations.length > 0) completedFields++;
  if (this.languages && this.languages.length > 0) completedFields++;
  if (this.trainingLocations && this.trainingLocations.length > 0) completedFields++;
  if (this.location && this.location.address) completedFields++;

  this.profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);
  return this.profileCompletionPercentage;
};

// Update search keywords
coachProfileSchema.methods.updateSearchKeywords = function() {
  const keywords = [];

  if (this.primarySport) keywords.push(this.primarySport.toLowerCase());
  if (this.additionalSports) {
    this.additionalSports.forEach(sport => keywords.push(sport.toLowerCase()));
  }
  if (this.specializations) {
    this.specializations.forEach(spec => keywords.push(spec.toLowerCase()));
  }
  if (this.location && this.location.city) keywords.push(this.location.city.toLowerCase());
  if (this.location && this.location.country) keywords.push(this.location.country.toLowerCase());
  if (this.coachingLevel) keywords.push(this.coachingLevel);
  if (this.status) keywords.push(this.status);
  if (this.trainingTypes) {
    this.trainingTypes.forEach(type => keywords.push(type));
  }

  this.searchKeywords = [...new Set(keywords)];
};

// Pre-save middleware
coachProfileSchema.pre('save', function(next) {
  // Normalize languages to lowercase
  if (this.languages && Array.isArray(this.languages)) {
    this.languages = this.languages.map(lang => lang.toLowerCase());
  }

  this.calculateProfileCompletion();
  this.updateSearchKeywords();
  next();
});

// Increment profile views
coachProfileSchema.methods.incrementProfileViews = async function() {
  this.profileViews += 1;
  await this.save();
};

// Get public profile (for players to view)
coachProfileSchema.methods.getPublicProfile = function() {
  const profile = this.toObject();

  // Remove sensitive data based on privacy settings
  if (!this.privacy.showContact) {
    delete profile.socialMedia;
  }

  if (!this.privacy.showStudentCount) {
    delete profile.studentStats;
  }

  if (!this.privacy.showLocation) {
    if (profile.location) {
      delete profile.location.address;
      delete profile.location.coordinates;
    }
  }

  // Always remove verification documents
  delete profile.verificationDocuments;

  return profile;
};

// Update student stats
coachProfileSchema.methods.updateStudentStats = async function(activeCount, totalCount) {
  this.studentStats.activeStudents = activeCount;
  this.studentStats.totalStudents = totalCount;
  this.studentStats.formerStudents = totalCount - activeCount;
  await this.save();
};

// Update session stats
coachProfileSchema.methods.updateSessionStats = async function(stats) {
  if (stats.totalSessions !== undefined) this.sessionStats.totalSessions = stats.totalSessions;
  if (stats.completedSessions !== undefined) this.sessionStats.completedSessions = stats.completedSessions;
  if (stats.cancelledSessions !== undefined) this.sessionStats.cancelledSessions = stats.cancelledSessions;
  if (stats.upcomingSessions !== undefined) this.sessionStats.upcomingSessions = stats.upcomingSessions;
  await this.save();
};

module.exports = mongoose.model('CoachProfile', coachProfileSchema);
