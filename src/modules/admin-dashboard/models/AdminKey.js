const mongoose = require('mongoose');
const crypto = require('crypto');

const adminKeySchema = new mongoose.Schema(
  {
    keyName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hashedKey: {
      type: String,
      required: true,
      select: false,
    },
    keyPrefix: {
      type: String,
      required: true,
      // To easily identify which key was used for authentication
    },
    description: {
      type: String,
      required: false,
    },
    permissions: {
      type: [String],
      enum: [
        'view_dashboard',
        'manage_posts',
        'manage_media',
        'manage_users',
        'view_logs',
        'manage_system_settings',
        'manage_backups',
        'manage_api_integrations',
        'delete_logs',
        'export_data',
      ],
      default: [
        'view_dashboard',
        'manage_posts',
        'manage_media',
        'manage_users',
        'view_logs',
        'manage_system_settings',
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      required: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: false,
      // If null, key never expires
    },
    ipWhitelist: {
      type: [String],
      required: false,
      // If empty, all IPs are allowed
    },
    rateLimit: {
      maxRequests: {
        type: Number,
        default: 1000, // requests per hour
      },
      windowMs: {
        type: Number,
        default: 3600000, // 1 hour
      },
    },
    rotation: {
      rotatedAt: Date,
      rotationSchedule: {
        type: String,
        enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
        required: false,
      },
      nextRotationDate: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    metadata: {
      purpose: String,
      customData: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'admin_keys',
  }
);

// Index for active keys
adminKeySchema.index({ isActive: 1, expiresAt: 1 });
adminKeySchema.index({ keyPrefix: 1 });

// Static method to generate a new admin key
adminKeySchema.statics.generateKey = function () {
  const keyLength = 32;
  const randomKey = crypto.randomBytes(keyLength).toString('hex');
  const prefix = randomKey.substring(0, 8);
  const hash = crypto
    .createHash('sha256')
    .update(randomKey)
    .digest('hex');

  return {
    rawKey: randomKey,
    hashedKey: hash,
    keyPrefix: prefix,
  };
};

// Instance method to verify key
adminKeySchema.methods.verifyKey = function (rawKey) {
  const hash = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  return hash === this.hashedKey;
};

// Check if key is expired
adminKeySchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Check if IP is whitelisted
adminKeySchema.methods.isIPAllowed = function (ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
    return true;
  }
  return this.ipWhitelist.includes(ip);
};

// Check if key has permission
adminKeySchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

// Update last used timestamp
adminKeySchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

// Static method to find active key by prefix
adminKeySchema.statics.findByPrefix = function (prefix) {
  return this.findOne({
    keyPrefix: prefix,
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  }).select('+hashedKey');
};

// Get all active keys info (without hashed keys)
adminKeySchema.statics.getActiveKeys = function () {
  return this.find({
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  })
    .select('-hashedKey')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

// Revoke a key
adminKeySchema.methods.revoke = function () {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('AdminKey', adminKeySchema);
