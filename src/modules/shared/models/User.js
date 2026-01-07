const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../../../middleware/logger') || console;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    // Updated regex to support + sign and more email formats (RFC 5322 compliant)
    match: [/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(v) {
        // Skip validation if password is already hashed (starts with $2)
        if (v.startsWith('$2')) return true;
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: [
      'player',
      'coach',
      'club',
      'specialist',
      'team',
      'admin',
      'administrator',
      'administrative-officer',
      'age-group-supervisor',
      'sports-director',
      'executive-director',
      'secretary',
      'sports-administrator',
      'applicant',
      'job-publisher'
    ],
    default: 'player'
  },

  // Admin role specific fields
  department: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String
  }],

  // Basic account info
  firstName: String,
  lastName: String,
  phone: String,
  avatar: String,

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  // Blocking status (Admin can block users)
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  blockedAt: Date,

  // Email verification
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,

  // Password reset
  passwordResetToken: String,
  passwordResetTokenExpires: Date,

  // Login tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Additional indexes for better query performance
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ role: 1, isVerified: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Track isVerified changes with proper logging
  if (this.isModified('isVerified')) {
    logger.debug('Email verification status changed', {
      email: this.email,
      previousValue: !this.isVerified,
      newValue: this.isVerified,
      hasVerificationToken: !!this.emailVerificationToken,
      tokenExpires: this.emailVerificationTokenExpires
    });
  }

  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  // Set expiry to 7 days (168 hours) instead of 24 hours for better user experience
  this.emailVerificationTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = token;
  this.passwordResetTokenExpires = Date.now() + 60 * 60 * 1000; // 60 minutes (1 hour)
  return token;
};

// Clear email verification token
userSchema.methods.clearEmailVerificationToken = function () {
  this.emailVerificationToken = undefined;
  this.emailVerificationTokenExpires = undefined;
};

// Clear password reset token
userSchema.methods.clearPasswordResetToken = function () {
  this.passwordResetToken = undefined;
  this.passwordResetTokenExpires = undefined;
};

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || 'User';
});

// Method to get safe user object for responses
userSchema.methods.toSafeObject = function (includeEmail = false) {
  const userObject = {
    id: this._id.toString(),
    role: this.role,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    phone: this.phone,
    avatar: this.avatar,
    isVerified: this.isVerified,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (includeEmail) {
    userObject.email = this.email;
  }

  return userObject;
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);