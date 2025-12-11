const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  allowedRoles: [{
    type: String,
    enum: ['player', 'coach', 'club', 'specialist', 'administrator', 'sports-administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary'],
  }],
  maxUses: {
    type: Number,
    default: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  usedBy: [{
    email: String,
    usedAt: Date,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: Date,
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

registrationCodeSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (this.usedCount >= this.maxUses) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

registrationCodeSchema.methods.use = function (email) {
  this.usedCount += 1;
  this.usedBy.push({ email, usedAt: new Date() });
  return this.save();
};

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema);
