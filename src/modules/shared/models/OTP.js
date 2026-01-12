/**
 * OTP Model
 * Stores OTP verification records for phone/email verification
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // User reference (optional - for registered users)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Contact info
  phone: {
    type: String,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },

  // OTP details
  otp: {
    type: String,
    required: true
  },
  otpHash: {
    type: String,
    // Hashed version for security (optional enhancement)
  },

  // OTP type and channel
  type: {
    type: String,
    required: true,
    enum: [
      'registration',      // New user registration verification
      'password-reset',    // Password recovery
      'phone-verification', // Verify phone number
      'email-verification', // Verify email via OTP
      'login',             // Two-factor login
      'transaction'        // Transaction verification
    ],
    index: true
  },
  channel: {
    type: String,
    required: true,
    enum: ['sms', 'whatsapp', 'email'],
    default: 'sms'
  },

  // Status tracking
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },

  // Attempt tracking (for rate limiting and security)
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  lastAttemptAt: {
    type: Date
  },

  // Expiration
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Resend tracking
  resendCount: {
    type: Number,
    default: 0
  },
  lastResendAt: {
    type: Date
  },

  // Metadata
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },

  // Authentica reference (for tracking with provider)
  providerRef: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
otpSchema.index({ phone: 1, type: 1, verified: 1 });
otpSchema.index({ email: 1, type: 1, verified: 1 });
otpSchema.index({ userId: 1, type: 1 });
// Note: TTL index for auto-deletion - expiresAt field handles expiry

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return Date.now() > this.expiresAt;
});

// Virtual for checking if max attempts exceeded
otpSchema.virtual('isLocked').get(function() {
  return this.attempts >= this.maxAttempts;
});

// Method to check if resend is allowed (cooldown check)
otpSchema.methods.canResend = function(cooldownSeconds = 60) {
  if (!this.lastResendAt) return true;
  const cooldownMs = cooldownSeconds * 1000;
  return Date.now() - this.lastResendAt.getTime() > cooldownMs;
};

// Method to increment attempt
otpSchema.methods.incrementAttempt = async function() {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  await this.save();
  return this.attempts;
};

// Method to mark as verified
otpSchema.methods.markVerified = async function() {
  this.verified = true;
  this.verifiedAt = new Date();
  await this.save();
  return this;
};

// Static method to create new OTP record
otpSchema.statics.createOTP = async function(data) {
  const {
    userId,
    phone,
    email,
    otp,
    type,
    channel = 'sms',
    expiryMinutes = 5,
    ipAddress,
    userAgent
  } = data;

  // Invalidate any existing unverified OTPs for same phone/email and type
  const query = { type, verified: false };
  if (phone) query.phone = phone;
  if (email) query.email = email;
  
  await this.updateMany(query, { verified: true, verifiedAt: new Date() });

  // Create new OTP record
  const otpRecord = new this({
    userId,
    phone,
    email,
    otp,
    type,
    channel,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    ipAddress,
    userAgent
  });

  await otpRecord.save();
  return otpRecord;
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = async function(identifier, otp, type) {
  const query = {
    otp,
    type,
    verified: false,
    expiresAt: { $gt: new Date() }
  };

  // Check if identifier is phone or email
  if (identifier.includes('@')) {
    query.email = identifier.toLowerCase();
  } else {
    query.phone = identifier;
  }

  const otpRecord = await this.findOne(query).sort({ createdAt: -1 });

  if (!otpRecord) {
    return null;
  }

  // Check if max attempts exceeded
  if (otpRecord.isLocked) {
    return { locked: true, record: otpRecord };
  }

  return { valid: true, record: otpRecord };
};

// Static method to get last OTP for resend check
otpSchema.statics.getLastOTP = async function(identifier, type) {
  const query = { type };
  
  if (identifier.includes('@')) {
    query.email = identifier.toLowerCase();
  } else {
    query.phone = identifier;
  }

  return await this.findOne(query).sort({ createdAt: -1 });
};

// Static method to clean up expired OTPs (called by cron or manually)
otpSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  console.log(`🧹 [OTP] Cleaned up ${result.deletedCount} expired OTP records`);
  return result.deletedCount;
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
