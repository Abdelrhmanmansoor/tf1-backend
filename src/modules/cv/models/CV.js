const mongoose = require('mongoose');

/**
 * Professional Experience Schema
 * Enhanced with fields similar to major platforms (LinkedIn, Indeed, etc.)
 */
const experienceSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  company: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  location: { 
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary'],
    default: 'Full-time'
  },
  startDate: { 
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  isCurrent: { 
    type: Boolean, 
    default: false 
  },
  description: { 
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  descriptionBullets: [{ 
    type: String,
    maxlength: [500, 'Each bullet point cannot exceed 500 characters']
  }],
  achievements: [{
    type: String,
    maxlength: [500, 'Each achievement cannot exceed 500 characters']
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Skill name cannot exceed 100 characters']
  }],
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  }
}, { _id: true });

/**
 * Education Schema
 * Enhanced with comprehensive education fields
 */
const educationSchema = new mongoose.Schema({
  degree: { 
    type: String, 
    required: [true, 'Degree is required'],
    trim: true,
    maxlength: [200, 'Degree cannot exceed 200 characters']
  },
  fieldOfStudy: { 
    type: String,
    trim: true,
    maxlength: [200, 'Field of study cannot exceed 200 characters']
  },
  institution: { 
    type: String, 
    required: [true, 'Institution name is required'],
    trim: true,
    maxlength: [200, 'Institution name cannot exceed 200 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  startDate: {
    type: Date
  },
  graduationDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        return !this.startDate || !value || value >= this.startDate;
      },
      message: 'Graduation date must be after start date'
    }
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  gpa: {
    type: String,
    trim: true,
    maxlength: [10, 'GPA cannot exceed 10 characters']
  },
  description: { 
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  honors: [{
    type: String,
    maxlength: [200, 'Honor cannot exceed 200 characters']
  }],
  activities: [{
    type: String,
    maxlength: [200, 'Activity cannot exceed 200 characters']
  }]
}, { _id: true });

/**
 * Language Schema
 */
const languageSchema = new mongoose.Schema({
  language: { 
    type: String, 
    required: [true, 'Language name is required'],
    trim: true,
    maxlength: [50, 'Language name cannot exceed 50 characters']
  },
  proficiency: { 
    type: String, 
    enum: {
      values: ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Beginner'],
      message: 'Proficiency must be one of: Native, Fluent, Advanced, Intermediate, Beginner'
    },
    required: [true, 'Proficiency level is required']
  },
  certification: {
    type: String,
    trim: true,
    maxlength: [200, 'Certification cannot exceed 200 characters']
  }
}, { _id: true });

/**
 * Course/Certification Schema
 */
const courseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [200, 'Course name cannot exceed 200 characters']
  },
  institution: { 
    type: String,
    trim: true,
    maxlength: [200, 'Institution name cannot exceed 200 characters']
  },
  issuer: {
    type: String,
    trim: true,
    maxlength: [200, 'Issuer name cannot exceed 200 characters']
  },
  issueDate: { 
    type: Date
  },
  expiryDate: {
    type: Date
  },
  credentialId: {
    type: String,
    trim: true,
    maxlength: [100, 'Credential ID cannot exceed 100 characters']
  },
  credentialUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Credential URL must be a valid HTTP/HTTPS URL'
    }
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, { _id: true });

/**
 * Project Schema
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  url: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Project URL must be a valid HTTP/HTTPS URL'
    }
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  technologies: [{
    type: String,
    trim: true,
    maxlength: [100, 'Technology name cannot exceed 100 characters']
  }],
  achievements: [{
    type: String,
    maxlength: [500, 'Achievement cannot exceed 500 characters']
  }]
}, { _id: true });

/**
 * Reference Schema
 */
const referenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Reference name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  relationship: {
    type: String,
    trim: true,
    maxlength: [100, 'Relationship cannot exceed 100 characters']
  }
}, { _id: true });

/**
 * Professional CV/Resume Schema
 * Enhanced with comprehensive fields similar to major platforms
 */
const cvSchema = new mongoose.Schema({
  // User identification
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  sessionId: { 
    type: String,
    index: true,
    sparse: true
  },
  
  // Language and localization
  language: { 
    type: String, 
    enum: ['en', 'ar'], 
    default: 'ar',
    required: true
  },
  
  // Personal Information - Enhanced
  personalInfo: {
    fullName: { 
      type: String, 
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [200, 'Full name cannot exceed 200 characters']
    },
    jobTitle: { 
      type: String, 
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Job title cannot exceed 200 characters']
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    address: { 
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    city: { 
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    country: { 
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters']
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters']
    },
    linkedin: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'LinkedIn URL must be a valid HTTP/HTTPS URL'
      }
    },
    website: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website URL must be a valid HTTP/HTTPS URL'
      }
    },
    github: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'GitHub URL must be a valid HTTP/HTTPS URL'
      }
    },
    portfolio: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Portfolio URL must be a valid HTTP/HTTPS URL'
      }
    },
    dateOfBirth: {
      type: Date
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [100, 'Nationality cannot exceed 100 characters']
    },
    visaStatus: {
      type: String,
      enum: ['Citizen', 'Permanent Resident', 'Work Visa', 'Student Visa', 'Tourist Visa', 'Other'],
      trim: true
    },
    profilePhoto: {
      type: String,
      trim: true
    }
  },
  
  // Professional Summary
  summary: { 
    type: String,
    maxlength: [2000, 'Summary cannot exceed 2000 characters']
  },
  
  // Experience - Enhanced
  experience: [experienceSchema],
  
  // Education - Enhanced
  education: [educationSchema],
  
  // Skills - Enhanced with categorization (backward compatible)
  skills: {
    type: mongoose.Schema.Types.Mixed,
    default: function() {
      // Support both old format (array) and new format (object)
      return {};
    },
    validate: {
      validator: function(v) {
        // Allow array (old format) or object (new format)
        return Array.isArray(v) || (typeof v === 'object' && v !== null);
      },
      message: 'Skills must be either an array or an object'
    }
  },
  
  // Languages - Enhanced
  languages: [languageSchema],
  
  // Certifications and Courses
  courses: [courseSchema],
  certifications: [courseSchema], // Alias for courses
  
  // Projects
  projects: [projectSchema],
  
  // References
  references: [referenceSchema],
  
  // Awards and Honors
  awards: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Award title cannot exceed 200 characters']
    },
    issuer: {
      type: String,
      trim: true,
      maxlength: [200, 'Issuer name cannot exceed 200 characters']
    },
    date: {
      type: Date
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    }
  }],
  
  // Publications
  publications: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Publication title cannot exceed 500 characters']
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: [200, 'Publisher name cannot exceed 200 characters']
    },
    date: {
      type: Date
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Publication URL must be a valid HTTP/HTTPS URL'
      }
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    }
  }],
  
  // Volunteer Experience
  volunteerExperience: [{
    organization: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters']
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Role cannot exceed 200 characters']
    },
    cause: {
      type: String,
      trim: true,
      maxlength: [100, 'Cause cannot exceed 100 characters']
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    isCurrent: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    hoursPerWeek: {
      type: Number,
      min: 0
    }
  }],
  
  // Additional Information
  additionalInfo: {
    type: String,
    maxlength: [2000, 'Additional information cannot exceed 2000 characters']
  },
  
  // Metadata
  meta: {
    template: { 
      type: String, 
      default: 'standard',
      enum: ['standard', 'modern', 'classic', 'creative', 'minimal', 'executive'],
      required: true
    },
    isATSFriendly: { 
      type: Boolean, 
      default: true 
    },
    version: {
      type: Number,
      default: 1
    },
    lastOptimized: {
      type: Date
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    privacy: {
      type: String,
      enum: ['public', 'private', 'shared'],
      default: 'private'
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
cvSchema.index({ user: 1, 'meta.updatedAt': -1 });
cvSchema.index({ sessionId: 1 });
cvSchema.index({ 'meta.template': 1 });
cvSchema.index({ 'meta.isATSFriendly': 1 });

// Virtual for full name
cvSchema.virtual('fullName').get(function() {
  return this.personalInfo?.fullName || '';
});

// Pre-save middleware to update meta.updatedAt
cvSchema.pre('save', function(next) {
  this.meta.updatedAt = new Date();
  this.meta.version = (this.meta.version || 0) + 1;
  next();
});

// Method to check if CV is complete
cvSchema.methods.isComplete = function() {
  return !!(
    this.personalInfo?.fullName &&
    this.personalInfo?.email &&
    this.personalInfo?.phone &&
    (this.experience?.length > 0 || this.education?.length > 0)
  );
};

// Method to get completion percentage
cvSchema.methods.getCompletionPercentage = function() {
  let completed = 0;
  let total = 10;
  
  if (this.personalInfo?.fullName) completed++;
  if (this.personalInfo?.email) completed++;
  if (this.personalInfo?.phone) completed++;
  if (this.summary) completed++;
  if (this.experience?.length > 0) completed++;
  if (this.education?.length > 0) completed++;
  
  // Handle both old (array) and new (object) skills format
  const hasSkills = Array.isArray(this.skills) 
    ? this.skills.length > 0
    : (this.skills?.technical?.length > 0 || this.skills?.soft?.length > 0);
  if (hasSkills) completed++;
  
  if (this.languages?.length > 0) completed++;
  if (this.courses?.length > 0) completed++;
  if (this.projects?.length > 0) completed++;
  
  return Math.round((completed / total) * 100);
};

module.exports = mongoose.model('CV', cvSchema);
