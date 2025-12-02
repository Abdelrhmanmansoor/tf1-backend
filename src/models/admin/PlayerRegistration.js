const mongoose = require('mongoose');

const playerRegistrationSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  playerNameAr: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
  },
  parentName: {
    type: String,
    required: true,
    trim: true
  },
  parentNameAr: {
    type: String,
    trim: true
  },
  parentPhone: {
    type: String,
    required: true
  },
  parentEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  nationalId: {
    type: String,
    trim: true
  },
  requestedAgeGroup: {
    type: String,
    required: true
  },
  requestedAgeGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup'
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  },
  position: {
    type: String,
    trim: true
  },
  previousExperience: {
    type: String,
    trim: true
  },
  medicalConditions: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  documents: [{
    type: {
      type: String,
      enum: ['birth_certificate', 'national_id', 'medical_report', 'photo', 'other']
    },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review', 'waitlist'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  rejectionReasonAr: {
    type: String
  },
  assignedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup'
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  source: {
    type: String,
    enum: ['public_form', 'admin_entry', 'referral', 'transfer'],
    default: 'public_form'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

playerRegistrationSchema.index({ clubId: 1, status: 1 });
playerRegistrationSchema.index({ requestedAgeGroupId: 1, status: 1 });
playerRegistrationSchema.index({ submittedAt: -1 });
playerRegistrationSchema.index({ parentPhone: 1 });

playerRegistrationSchema.pre('save', async function(next) {
  if (this.isNew && !this.registrationNumber) {
    const count = await this.constructor.countDocuments({ clubId: this.clubId });
    const year = new Date().getFullYear();
    this.registrationNumber = `REG-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

playerRegistrationSchema.methods.approve = function(userId, notes, assignedTeamId) {
  this.status = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = userId;
  this.approvalNotes = notes;
  if (assignedTeamId) {
    this.assignedTeam = assignedTeamId;
  }
  return this;
};

playerRegistrationSchema.methods.reject = function(userId, reason, reasonAr) {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = userId;
  this.rejectionReason = reason;
  this.rejectionReasonAr = reasonAr;
  return this;
};

playerRegistrationSchema.statics.getByClub = function(clubId, status, options = {}) {
  const query = { clubId, isDeleted: false };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('requestedAgeGroupId', 'name nameAr ageRange')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ submittedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50);
};

playerRegistrationSchema.statics.getPending = function(clubId) {
  return this.find({ 
    clubId, 
    status: 'pending',
    isDeleted: false 
  })
  .populate('requestedAgeGroupId', 'name nameAr ageRange')
  .sort({ submittedAt: -1 });
};

module.exports = mongoose.model('PlayerRegistration', playerRegistrationSchema);
