const mongoose = require('mongoose');

const clubProfileSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Organization Information
  organizationType: {
    type: String,
    enum: ['sports_club', 'academy', 'training_center', 'federation', 'gym', 'sports_complex'],
    required: true,
    index: true
  },
  clubName: {
    type: String,
    required: true
  },
  clubNameAr: {
    type: String
  },
  logo: {
    type: String // URL to logo/badge
  },
  banner: {
    type: String // URL to banner/cover image
  },
  establishedDate: {
    type: Date
  },
  businessRegistrationNumber: {
    type: String
  },
  sportsLicenseNumber: {
    type: String
  },
  legalStatus: {
    type: String,
    enum: ['registered', 'licensed', 'certified', 'pending'],
    default: 'pending'
  },
  description: {
    type: String
  },

  // === CONTACT & LOCATION ===
  location: {
    address: {
      type: String
    },
    addressAr: {
      type: String
    },
    city: {
      type: String,
      index: true
    },
    cityAr: {
      type: String
    },
    area: {
      type: String
    },
    areaAr: {
      type: String
    },
    state: {
      type: String
    },
    stateAr: {
      type: String
    },
    country: {
      type: String,
      index: true
    },
    countryAr: {
      type: String
    },
    postalCode: {
      type: String
    },
    nationalAddress: {
      buildingNumber: { type: String },
      additionalNumber: { type: String },
      zipCode: { type: String },
      isVerified: { type: Boolean, default: false }, // national_address_verified
      verifiedAt: { type: Date },
      verificationAttempted: { type: Boolean, default: false },
      apiVersion: { type: String, default: 'v3.1' }
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }
  },

  contactInfo: {
    phoneNumbers: [{
      type: String
    }],
    email: {
      type: String
    },
    departmentEmails: [{
      department: String,
      departmentAr: String,
      email: String
    }],
    website: {
      type: String
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      tiktok: String,
      linkedin: String
    }
  },

  // === FACILITY DETAILS ===
  facilityDetails: {
    facilitySizeSqm: {
      type: Number
    },
    capacity: {
      type: Number // Total member capacity
    },
    numberOfFields: {
      type: Number
    },
    facilityTypes: [{
      type: String,
      enum: ['outdoor_field', 'indoor_court', 'gym', 'swimming_pool', 'tennis_court',
             'basketball_court', 'volleyball_court', 'track', 'martial_arts_hall',
             'dance_studio', 'yoga_studio', 'other']
    }],
    additionalAmenities: [{
      type: String,
      enum: ['locker_rooms', 'showers', 'cafeteria', 'restaurant', 'medical_room',
             'physiotherapy_room', 'sauna', 'steam_room', 'parking', 'wheelchair_accessible',
             'retail_shop', 'conference_rooms', 'wifi', 'air_conditioning']
    }],
    facilityPhotos: [{
      url: String,
      caption: String,
      captionAr: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    facilityVideos: [{
      url: String,
      thumbnail: String,
      title: String,
      titleAr: String,
      duration: Number, // in seconds
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    virtualTourUrl: {
      type: String
    }
  },

  // === SPORTS & PROGRAMS ===
  availableSports: [{
    type: String
  }],

  programsOffered: {
    kidsPrograms: [{
      name: String,
      nameAr: String,
      ageRange: String, // e.g., "6-12"
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String // e.g., "3 months"
    }],
    youthPrograms: [{
      name: String,
      nameAr: String,
      ageRange: String,
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String
    }],
    professionalTraining: [{
      name: String,
      nameAr: String,
      level: String,
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String
    }],
    fitnessPrograms: [{
      name: String,
      nameAr: String,
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String
    }],
    summerCamps: [{
      name: String,
      nameAr: String,
      startDate: Date,
      endDate: Date,
      ageRange: String,
      description: String,
      descriptionAr: String,
      price: Number,
      capacity: Number
    }],
    trainingCourses: [{
      name: String,
      nameAr: String,
      type: String,
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String,
      certification: Boolean
    }],
    coachCertification: [{
      name: String,
      nameAr: String,
      level: String,
      description: String,
      descriptionAr: String,
      price: Number,
      duration: String,
      accreditedBy: String
    }]
  },

  // === ABOUT & DESCRIPTION ===
  about: {
    bio: {
      type: String
    },
    bioAr: {
      type: String
    },
    vision: {
      type: String
    },
    visionAr: {
      type: String
    },
    mission: {
      type: String
    },
    missionAr: {
      type: String
    },
    coreValues: [{
      value: String,
      valueAr: String
    }]
  },

  achievements: [{
    title: {
      type: String
    },
    titleAr: {
      type: String
    },
    description: {
      type: String
    },
    descriptionAr: {
      type: String
    },
    date: {
      type: Date
    },
    type: {
      type: String,
      enum: ['championship', 'tournament', 'award', 'milestone', 'certification', 'other']
    },
    images: [String]
  }],

  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],

  // === MEMBERSHIP STATISTICS ===
  memberStats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    playerMembers: {
      type: Number,
      default: 0
    },
    coachMembers: {
      type: Number,
      default: 0
    },
    specialistMembers: {
      type: Number,
      default: 0
    },
    staffMembers: {
      type: Number,
      default: 0
    },
    newMembersThisMonth: {
      type: Number,
      default: 0
    }
  },

  // === RATINGS & VERIFICATION ===
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
      facilities: { type: Number, default: 0 },
      programs: { type: Number, default: 0 },
      staff: { type: Number, default: 0 },
      valueForMoney: { type: Number, default: 0 },
      cleanliness: { type: Number, default: 0 }
    }
  },

  verification: {
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationDate: {
      type: Date
    },
    verificationBadge: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'none'],
      default: 'none'
    },
    accreditations: [{
      name: String,
      nameAr: String,
      issuedBy: String,
      issuedDate: Date,
      expiryDate: Date,
      certificateUrl: String
    }]
  },

  // === MEMBERSHIP SETTINGS ===
  membershipSettings: {
    fees: {
      currency: {
        type: String,
        default: 'EGP'
      },
      monthlyFee: {
        player: Number,
        coach: Number,
        general: Number
      },
      annualFee: {
        player: Number,
        coach: Number,
        general: Number
      },
      registrationFee: Number,
      renewalFee: Number
    },
    packages: [{
      name: String,
      nameAr: String,
      type: String, // player, coach, family, corporate
      price: Number,
      duration: Number, // in months
      features: [String],
      featuresAr: [String],
      discount: Number
    }],
    admissionPolicy: {
      type: String
    },
    admissionPolicyAr: {
      type: String
    },
    membershipTerms: {
      type: String
    },
    membershipTermsAr: {
      type: String
    },
    cancellationPolicy: {
      type: String
    },
    cancellationPolicyAr: {
      type: String
    },
    autoRenewal: {
      type: Boolean,
      default: false
    }
  },

  // === FINANCIAL SETTINGS ===
  financialSettings: {
    acceptedPaymentMethods: [{
      type: String,
      enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'mobile_payment', 'check']
    }],
    bankAccountInfo: {
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
      accountHolderName: String
    },
    refundPolicy: {
      type: String
    },
    refundPolicyAr: {
      type: String
    },
    taxRegistrationNumber: {
      type: String
    },
    platformFeePercentage: {
      type: Number,
      default: 10
    }
  },

  // === REVENUE STATISTICS ===
  revenueStats: {
    totalRevenue: {
      type: Number,
      default: 0
    },
    monthlyRevenue: {
      type: Number,
      default: 0
    },
    annualRevenue: {
      type: Number,
      default: 0
    },
    membershipRevenue: {
      type: Number,
      default: 0
    },
    bookingRevenue: {
      type: Number,
      default: 0
    },
    eventRevenue: {
      type: Number,
      default: 0
    },
    merchandiseRevenue: {
      type: Number,
      default: 0
    },
    sponsorshipRevenue: {
      type: Number,
      default: 0
    },
    donationRevenue: {
      type: Number,
      default: 0
    }
  },

  // === PRIVACY SETTINGS ===
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'members_only', 'private'],
      default: 'public'
    },
    showMembers: {
      type: Boolean,
      default: false
    },
    showStatistics: {
      type: Boolean,
      default: true
    },
    showRevenue: {
      type: Boolean,
      default: false
    },
    showContactInfo: {
      type: Boolean,
      default: true
    },
    allowSearch: {
      type: Boolean,
      default: true
    },
    allowMembershipRequests: {
      type: Boolean,
      default: true
    },
    allowJobApplications: {
      type: Boolean,
      default: true
    },
    allowBookings: {
      type: Boolean,
      default: true
    }
  },

  // === NOTIFICATION SETTINGS ===
  notificationSettings: {
    newMembershipRequests: {
      type: Boolean,
      default: true
    },
    jobApplications: {
      type: Boolean,
      default: true
    },
    newBookings: {
      type: Boolean,
      default: true
    },
    payments: {
      type: Boolean,
      default: true
    },
    newReviews: {
      type: Boolean,
      default: true
    },
    eventReminders: {
      type: Boolean,
      default: true
    },
    newMessages: {
      type: Boolean,
      default: true
    },
    systemUpdates: {
      type: Boolean,
      default: true
    }
  },

  // === ACTIVITY STATISTICS ===
  activityStats: {
    totalEvents: {
      type: Number,
      default: 0
    },
    upcomingEvents: {
      type: Number,
      default: 0
    },
    totalJobPostings: {
      type: Number,
      default: 0
    },
    activeJobPostings: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    },
    lastActivityDate: {
      type: Date
    }
  },

  // === STATUS & METADATA ===
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
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Search optimization
  searchKeywords: [{
    type: String
  }],

  // Languages supported
  languages: [{
    type: String,
    enum: ['arabic', 'english', 'french', 'german', 'spanish', 'other']
  }],

  // Operating hours
  operatingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openTime: String, // "09:00"
    closeTime: String // "22:00"
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
clubProfileSchema.index({ clubName: 'text', 'clubNameAr': 'text', 'about.bio': 'text', 'about.bioAr': 'text' });
clubProfileSchema.index({ 'location.city': 1, 'location.country': 1 });
clubProfileSchema.index({ organizationType: 1, status: 1 });
clubProfileSchema.index({ 'verification.isVerified': 1, 'ratingStats.averageRating': -1 });
clubProfileSchema.index({ availableSports: 1 });
clubProfileSchema.index({ createdAt: -1 });

// === VIRTUALS ===
clubProfileSchema.virtual('memberCount').get(function() {
  return this.memberStats.totalMembers || 0;
});

clubProfileSchema.virtual('isFullyVerified').get(function() {
  return this.verification.isVerified && this.legalStatus === 'licensed';
});

// === METHODS ===

// Calculate profile completion percentage
clubProfileSchema.methods.calculateCompletionPercentage = function() {
  let score = 0;
  const maxScore = 100;

  // Basic information (20 points)
  if (this.clubName) score += 5;
  if (this.logo) score += 5;
  if (this.organizationType) score += 5;
  if (this.establishedDate) score += 5;

  // Contact & Location (15 points)
  if (this.location?.address) score += 5;
  if (this.location?.coordinates?.coordinates?.length === 2) score += 5;
  if (this.contactInfo?.phoneNumbers?.length > 0) score += 5;

  // Facility Details (15 points)
  if (this.facilityDetails?.facilitySizeSqm) score += 5;
  if (this.facilityDetails?.facilityTypes?.length > 0) score += 5;
  if (this.facilityDetails?.facilityPhotos?.length > 0) score += 5;

  // Sports & Programs (15 points)
  if (this.availableSports?.length > 0) score += 7;
  if (Object.keys(this.programsOffered).some(key => this.programsOffered[key]?.length > 0)) score += 8;

  // About & Description (15 points)
  if (this.about?.bio) score += 5;
  if (this.about?.vision) score += 5;
  if (this.about?.mission) score += 5;

  // Membership Settings (10 points)
  if (this.membershipSettings?.fees?.monthlyFee) score += 5;
  if (this.membershipSettings?.admissionPolicy) score += 5;

  // Financial Settings (5 points)
  if (this.financialSettings?.acceptedPaymentMethods?.length > 0) score += 5;

  // Operating Hours (5 points)
  if (this.operatingHours?.length > 0) score += 5;

  this.completionPercentage = Math.min(score, maxScore);
  return this.completionPercentage;
};

// Get public profile (respecting privacy settings)
clubProfileSchema.methods.getPublicProfile = function() {
  const profile = {
    _id: this._id,
    clubName: this.clubName,
    clubNameAr: this.clubNameAr,
    logo: this.logo,
    organizationType: this.organizationType,
    location: {
      city: this.location.city,
      cityAr: this.location.cityAr,
      country: this.location.country,
      countryAr: this.location.countryAr
    },
    availableSports: this.availableSports,
    ratingStats: this.ratingStats,
    verification: this.verification,
    about: this.about,
    facilityDetails: {
      facilityTypes: this.facilityDetails?.facilityTypes,
      additionalAmenities: this.facilityDetails?.additionalAmenities,
      facilityPhotos: this.facilityDetails?.facilityPhotos,
      facilityVideos: this.facilityDetails?.facilityVideos
    },
    completionPercentage: this.completionPercentage
  };

  if (this.privacy.showContactInfo) {
    profile.contactInfo = this.contactInfo;
  }

  if (this.privacy.showStatistics) {
    profile.memberStats = this.memberStats;
    profile.activityStats = this.activityStats;
  }

  if (this.privacy.showMembers) {
    profile.teams = this.teams;
  }

  return profile;
};

// Generate search keywords automatically
clubProfileSchema.methods.generateSearchKeywords = function() {
  const keywords = new Set();

  if (this.clubName) keywords.add(this.clubName.toLowerCase());
  if (this.clubNameAr) keywords.add(this.clubNameAr);
  if (this.organizationType) keywords.add(this.organizationType);
  if (this.location?.city) keywords.add(this.location.city.toLowerCase());
  if (this.location?.country) keywords.add(this.location.country.toLowerCase());

  this.availableSports?.forEach(sport => keywords.add(sport.toLowerCase()));
  this.facilityDetails?.facilityTypes?.forEach(type => keywords.add(type));

  this.searchKeywords = Array.from(keywords);
  return this.searchKeywords;
};

// Update member statistics
clubProfileSchema.methods.updateMemberStats = async function() {
  const ClubMember = mongoose.model('ClubMember');

  const stats = await ClubMember.aggregate([
    { $match: { clubId: this.userId, status: 'active', isDeleted: false } },
    { $group: {
      _id: '$memberType',
      count: { $sum: 1 }
    }}
  ]);

  this.memberStats.totalMembers = 0;
  this.memberStats.playerMembers = 0;
  this.memberStats.coachMembers = 0;
  this.memberStats.specialistMembers = 0;
  this.memberStats.staffMembers = 0;

  stats.forEach(stat => {
    this.memberStats.totalMembers += stat.count;
    if (stat._id === 'player') this.memberStats.playerMembers = stat.count;
    if (stat._id === 'coach') this.memberStats.coachMembers = stat.count;
    if (stat._id === 'specialist') this.memberStats.specialistMembers = stat.count;
    if (stat._id === 'staff') this.memberStats.staffMembers = stat.count;
  });

  this.memberStats.activeMembers = this.memberStats.totalMembers;

  await this.save();
  return this.memberStats;
};

// === HOOKS ===

// Before save - calculate completion and generate keywords
clubProfileSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.calculateCompletionPercentage();
    this.generateSearchKeywords();
  }
  next();
});

// After save - update user's role if needed
clubProfileSchema.post('save', async function(doc) {
  const User = mongoose.model('User');
  const user = await User.findById(doc.userId);

  if (user && user.role !== 'club') {
    user.role = 'club';
    await user.save();
  }
});

const ClubProfile = mongoose.model('ClubProfile', clubProfileSchema);

module.exports = ClubProfile;
