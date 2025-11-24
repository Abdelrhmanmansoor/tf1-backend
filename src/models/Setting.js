const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  // Site Info
  siteName: {
    type: String,
    default: 'SportX Platform',
  },
  siteDescription: {
    type: String,
    default: 'Professional Sports Networking Platform',
  },
  siteLogoUrl: String,

  // Theme/Design
  theme: {
    primaryColor: {
      type: String,
      default: '#1a73e8',
    },
    secondaryColor: {
      type: String,
      default: '#34a853',
    },
    accentColor: {
      type: String,
      default: '#fbbc04',
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
    textColor: {
      type: String,
      default: '#202124',
    },
  },

  // Maintenance
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    default: 'The platform is under maintenance. Please check back soon.',
  },

  // Features
  features: {
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    emailVerificationRequired: {
      type: Boolean,
      default: true,
    },
    blogEnabled: {
      type: Boolean,
      default: true,
    },
    jobsEnabled: {
      type: Boolean,
      default: true,
    },
    messagingEnabled: {
      type: Boolean,
      default: true,
    },
  },

  // Legal
  legal: {
    termsUrl: String,
    privacyUrl: String,
  },

  // Support
  support: {
    email: String,
    phone: String,
    address: String,
  },

  // Social Links
  social: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },

  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Setting', settingSchema);
