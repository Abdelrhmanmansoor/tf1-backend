const mongoose = require('mongoose');

const playerProfileSchema = new mongoose.Schema({
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
    tiktok: String
  },

  // Athletic Profile
  primarySport: {
    type: String,
    required: true,
    index: true
  },
  additionalSports: [{
    type: String
  }],
  position: {
    type: String, // e.g., "Striker", "Midfielder", "Point Guard"
  },
  positionAr: {
    type: String
  },
  preferredFoot: {
    type: String,
    enum: ['left', 'right', 'both', 'n/a']
  },
  height: {
    value: Number,
    unit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    }
  },
  level: {
    type: String,
    enum: ['beginner', 'amateur', 'semi-pro', 'professional'],
    default: 'amateur',
    index: true
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  },

  // Age Group Assignment
  ageGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup',
    index: true
  },
  ageGroupName: String,
  ageGroupNameAr: String,

  // Experience & Achievements
  currentClub: {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubProfile'
    },
    clubName: String,
    joinedDate: Date,
    position: String
  },
  previousClubs: [{
    clubName: String,
    startDate: Date,
    endDate: Date,
    position: String,
    achievements: String
  }],
  achievements: [{
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    date: Date,
    type: {
      type: String,
      enum: ['championship', 'award', 'record', 'certificate', 'other']
    }
  }],
  certificates: [{
    name: String,
    nameAr: String,
    issuedBy: String,
    issuedDate: Date,
    certificateUrl: String
  }],
  statistics: {
    matchesPlayed: Number,
    goals: Number,
    assists: Number,
    // Sport-specific stats can be added here
    custom: mongoose.Schema.Types.Mixed
  },

  // Availability & Preferences
  status: {
    type: String,
    enum: ['active', 'looking_for_club', 'open_to_offers', 'not_available'],
    default: 'active',
    index: true
  },
  availableForTraining: {
    type: Boolean,
    default: true
  },
  trainingAvailability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    slots: [{
      startTime: String, // "09:00"
      endTime: String    // "11:00"
    }]
  }],
  openToRelocation: {
    type: Boolean,
    default: false
  },
  salaryExpectations: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'EGP'
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'monthly'
    },
    showPublicly: {
      type: Boolean,
      default: false
    }
  },
  goals: {
    type: String,
    maxlength: 500
  },
  goalsAr: {
    type: String,
    maxlength: 500
  },

  // Media Gallery
  avatar: {
    type: String
  },
  bannerImage: {
    type: String
  },
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
    duration: Number, // in seconds
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  highlightVideoUrl: String, // Main highlight reel

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

  // Ratings & Reviews (aggregated)
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
    }
  },

  // Training History Stats
  trainingStats: {
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
    }
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
    showSalary: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'clubs_only', 'private'],
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
playerProfileSchema.index({ primarySport: 1, level: 1 });
playerProfileSchema.index({ status: 1, isActive: 1 });
playerProfileSchema.index({ 'location.city': 1, primarySport: 1 });
playerProfileSchema.index({ 'location.coordinates': '2dsphere' });
playerProfileSchema.index({ isVerified: 1, level: 1 });
playerProfileSchema.index({ searchKeywords: 1 });

// Virtual for age
playerProfileSchema.virtual('age').get(function() {
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

// Virtual for profile link
playerProfileSchema.virtual('profileUrl').get(function() {
  return `/players/${this._id}`;
});

// Calculate profile completion percentage
playerProfileSchema.methods.calculateProfileCompletion = function() {
  let completedFields = 0;
  const totalFields = 20; // Adjust based on important fields

  // Check each important field
  if (this.bio || this.bioAr) completedFields++;
  if (this.birthDate) completedFields++;
  if (this.nationality) completedFields++;
  if (this.languages && this.languages.length > 0) completedFields++;
  if (this.location && this.location.city) completedFields++;
  if (this.primarySport) completedFields++;
  if (this.position) completedFields++;
  if (this.level) completedFields++;
  if (this.yearsOfExperience) completedFields++;
  if (this.avatar) completedFields++;
  if (this.photos && this.photos.length > 0) completedFields++;
  if (this.videos && this.videos.length > 0) completedFields++;
  if (this.achievements && this.achievements.length > 0) completedFields++;
  if (this.currentClub && this.currentClub.clubName) completedFields++;
  if (this.previousClubs && this.previousClubs.length > 0) completedFields++;
  if (this.goals || this.goalsAr) completedFields++;
  if (this.status) completedFields++;
  if (this.trainingAvailability && this.trainingAvailability.length > 0) completedFields++;
  if (this.socialMedia && (this.socialMedia.instagram || this.socialMedia.facebook)) completedFields++;
  if (this.highlightVideoUrl) completedFields++;

  this.profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);
  return this.profileCompletionPercentage;
};

// Update search keywords
playerProfileSchema.methods.updateSearchKeywords = function() {
  const keywords = [];

  if (this.primarySport) keywords.push(this.primarySport.toLowerCase());
  if (this.additionalSports) {
    this.additionalSports.forEach(sport => keywords.push(sport.toLowerCase()));
  }
  if (this.position) keywords.push(this.position.toLowerCase());
  if (this.location && this.location.city) keywords.push(this.location.city.toLowerCase());
  if (this.location && this.location.country) keywords.push(this.location.country.toLowerCase());
  if (this.level) keywords.push(this.level);
  if (this.status) keywords.push(this.status);

  this.searchKeywords = [...new Set(keywords)]; // Remove duplicates
};

// Pre-save middleware
playerProfileSchema.pre('save', function(next) {
  // Normalize languages to lowercase
  if (this.languages && Array.isArray(this.languages)) {
    this.languages = this.languages.map(lang => lang.toLowerCase());
  }

  // Calculate profile completion
  this.calculateProfileCompletion();

  // Update search keywords
  this.updateSearchKeywords();

  next();
});

// Increment profile views
playerProfileSchema.methods.incrementProfileViews = async function() {
  this.profileViews += 1;
  await this.save();
};

// Get public profile (for other users to view)
playerProfileSchema.methods.getPublicProfile = function() {
  const profile = this.toObject();

  // Remove sensitive data based on privacy settings
  if (!this.privacy.showContact) {
    delete profile.socialMedia;
  }

  if (!this.privacy.showSalary) {
    delete profile.salaryExpectations;
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

module.exports = mongoose.model('PlayerProfile', playerProfileSchema);
