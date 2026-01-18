const mongoose = require('mongoose');

const jobPublisherProfileSchema = new mongoose.Schema({
  // Link to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Company/Organization Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  companyLogo: {
    type: String,
    default: null // URL to uploaded logo
  },

  industryType: {
    type: String,
    enum: [
      'technology',
      'finance',
      'healthcare',
      'retail',
      'manufacturing',
      'education',
      'hospitality',
      'sports',
      'construction',
      'logistics',
      'consulting',
      'media',
      'real-estate',
      'energy',
      'telecommunications',
      'other'
    ],
    required: true
  },

  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    required: true
  },

  websiteUrl: {
    type: String,
    trim: true,
    match: /^https?:\/\/.+/i
  },

  // Professional Information
  businessRegistrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // National Address fields removed - no longer required

  // Representative Information
  representativeName: {
    type: String,
    required: true,
    trim: true
  },

  representativeTitle: {
    type: String,
    required: true,
    enum: [
      'ceo',
      'hr_manager',
      'hiring_manager',
      'founder',
      'director',
      'manager',
      'owner',
      'other'
    ]
  },

  representativePhone: {
    type: String,
    required: true,
    match: /^[0-9+\-\s()]+$/
  },

  representativeEmail: {
    type: String,
    required: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },

  // Company Description
  companyDescription: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 2000,
    trim: true
  },

  // Company Culture & Values
  companyValues: {
    type: [String],
    default: []
  },

  // Company Benefits (مزايا الشركة)
  companyBenefits: {
    type: [String],
    default: [],
    // Examples: health insurance, remote work, flexible hours, training, etc.
  },

  // Work Environment Photos (صور بيئة العمل)
  workEnvironmentPhotos: [{
    url: String,
    caption: String,
    uploadDate: Date
  }],

  // Company Awards & Certifications (جوائز وشهادات)
  awards: [{
    title: String,
    description: String,
    issuer: String,
    date: Date,
    certificateUrl: String
  }],

  // Employee Testimonials (آراء الموظفين)
  employeeTestimonials: [{
    employeeName: String,
    position: String,
    testimonial: String,
    date: Date,
    verified: Boolean
  }],

  // Hiring Process Info
  hiringProcess: {
    averageTimeToHire: Number, // in days
    processSteps: [String], // e.g., ['Application Review', 'Phone Interview', 'In-person Interview', 'Offer']
    description: String
  },

  // Company Video (فيديو تعريفي)
  companyVideoUrl: String,

  // Office Locations (مواقع المكاتب)
  officeLocations: [{
    address: String,
    city: String,
    country: String,
    isPrimary: Boolean,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],

  // Social Media Links
  socialMediaLinks: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String,
    youtube: String,
    website: String
  },

  // Profile Verification
  isProfileComplete: {
    type: Boolean,
    default: false
  },

  profileVerificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  profileVerificationNotes: String,

  // Tax Information
  taxNumber: {
    type: String,
    trim: true
  },

  // Bank Information (for payments)
  bankAccountName: String,
  bankName: String,
  bankIban: String,
  bankVerified: {
    type: Boolean,
    default: false
  },

  // Contact Preferences
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'both'],
    default: 'both'
  },

  // Statistics
  statistics: {
    totalJobsPosted: {
      type: Number,
      default: 0
    },
    totalApplicationsReceived: {
      type: Number,
      default: 0
    },
    totalHired: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    },
    hireRate: {
      type: Number,
      default: 0
    }
  },

  // Subscription/Plan
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },

  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'cancelled'],
    default: 'inactive'
  },

  subscriptionExpiryDate: Date,

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },

  isSuspended: {
    type: Boolean,
    default: false
  },

  suspensionReason: String,
  suspensionDate: Date,

  // Document Upload
  documents: {
    businessLicense: {
      url: String,
      uploadDate: Date,
      verified: Boolean
    },
    taxCertificate: {
      url: String,
      uploadDate: Date,
      verified: Boolean
    },
    nationalAddressDocument: {
      url: String,
      uploadDate: Date,
      verified: Boolean
    }
  },

  // Last Activity
  lastActivityDate: {
    type: Date,
    default: Date.now
  },

  // Ratings and Reviews
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  metadata: {
    source: String,
    referralCode: String,
    notes: String
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'job-publisher-profiles'
});

// Index for faster queries
jobPublisherProfileSchema.index({ userId: 1, companyName: 1 });
jobPublisherProfileSchema.index({ profileVerificationStatus: 1 });
jobPublisherProfileSchema.index({ subscriptionStatus: 1 });
jobPublisherProfileSchema.index({ createdAt: -1 });

// Methods
jobPublisherProfileSchema.methods.markProfileComplete = function() {
  this.isProfileComplete = true;
  this.updatedAt = Date.now();
  return this.save();
};

jobPublisherProfileSchema.methods.updateLastActivity = function() {
  this.lastActivityDate = Date.now();
  return this.save();
};

jobPublisherProfileSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    companyName: this.companyName,
    companyLogo: this.companyLogo,
    industryType: this.industryType,
    companySize: this.companySize,
    websiteUrl: this.websiteUrl,
    companyDescription: this.companyDescription,
    companyValues: this.companyValues,
    socialMediaLinks: this.socialMediaLinks,
    statistics: this.statistics,
    ratings: this.ratings,
    profileVerificationStatus: this.profileVerificationStatus
  };
};

module.exports = mongoose.model('JobPublisherProfile', jobPublisherProfileSchema);
