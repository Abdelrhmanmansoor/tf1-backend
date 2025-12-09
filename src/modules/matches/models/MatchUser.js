const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const matchUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'MatchUser'
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  // Email verification
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  is_admin: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance
matchUserSchema.index({ email: 1 });
matchUserSchema.index({ emailVerificationToken: 1 });

// Generate email verification token
matchUserSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Clear email verification token
matchUserSchema.methods.clearEmailVerificationToken = function() {
  this.emailVerificationToken = undefined;
  this.emailVerificationTokenExpires = undefined;
};

// Compare password
matchUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Hash password before saving
matchUserSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) {
    return next();
  }
  
  // Always hash the password when modified
  this.password_hash = await bcrypt.hash(this.password_hash, 10);
  
  next();
});

module.exports = mongoose.model('MSMatchUser', matchUserSchema, 'ms_match_users');
