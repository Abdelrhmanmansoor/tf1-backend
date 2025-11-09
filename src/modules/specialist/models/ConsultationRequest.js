const mongoose = require('mongoose');

const consultationRequestSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  specialistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === REQUEST DETAILS ===
  serviceType: {
    type: String,
    enum: ['individual_consultation', 'group_session', 'initial_assessment',
           'follow_up', 'long_term_program', 'emergency_consultation',
           'online_consultation', 'home_visit', 'comprehensive_assessment'],
    required: true
  },

  specialization: {
    type: String,
    enum: ['sports_physiotherapy', 'sports_nutrition', 'fitness_training',
           'sports_psychology', 'injury_rehabilitation', 'sports_massage'],
    required: true
  },

  // === SCHEDULING ===
  preferredDates: [{
    date: Date,
    startTime: String,
    endTime: String,
    priority: {
      type: Number,
      min: 1,
      max: 3
    }
  }],

  duration: {
    type: Number, // in minutes
    default: 60
  },

  location: {
    type: {
      type: String,
      enum: ['clinic', 'online', 'home_visit', 'club', 'client_location', 'other']
    },
    address: String,
    addressAr: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    notes: String
  },

  // === CLIENT INFORMATION ===
  clientInfo: {
    reason: {
      type: String,
      required: true
    },
    reasonAr: String,
    symptoms: String,
    symptomsAr: String,
    goals: String,
    goalsAr: String,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'medium'
    },
    medicalHistory: String, // encrypted
    currentCondition: String,
    previousTreatments: String,
    allergies: String,
    medications: String
  },

  // === PRICING ===
  proposedPrice: {
    type: Number
  },
  negotiatedPrice: {
    type: Number
  },
  finalPrice: {
    type: Number
  },
  currency: {
    type: String,
    default: 'EGP'
  },

  // === STATUS ===
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'negotiating', 'confirmed',
           'completed', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },

  // === RESPONSE FROM SPECIALIST ===
  specialistResponse: {
    respondedAt: Date,
    message: String,
    messageAr: String,
    suggestedDate: Date,
    suggestedTime: String,
    suggestedDuration: Number,
    suggestedPrice: Number,
    alternativeOptions: [{
      date: Date,
      time: String,
      duration: Number
    }]
  },

  // === NEGOTIATION HISTORY ===
  negotiationHistory: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    proposedDate: Date,
    proposedTime: String,
    proposedPrice: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // === CONFIRMATION ===
  confirmedDate: Date,
  confirmedTime: String,
  confirmedDuration: Number,
  confirmedLocation: {
    type: String,
    address: String
  },

  // === CANCELLATION ===
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    reasonAr: String,
    refundIssued: Boolean,
    refundAmount: Number
  },

  // === COMPLETION ===
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConsultationSession'
  },
  completedAt: Date,

  // === METADATA ===
  expiresAt: {
    type: Date
  },
  source: {
    type: String,
    enum: ['direct_request', 'club_referral', 'coach_referral', 'platform_search'],
    default: 'direct_request'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // === NOTES ===
  specialistNotes: String,
  adminNotes: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
consultationRequestSchema.index({ specialistId: 1, status: 1 });
consultationRequestSchema.index({ clientId: 1, status: 1 });
consultationRequestSchema.index({ createdAt: -1 });
consultationRequestSchema.index({ expiresAt: 1 });

// === VIRTUALS ===
consultationRequestSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

consultationRequestSchema.virtual('daysSinceRequest').get(function() {
  const diff = new Date() - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// === METHODS ===

// Accept request
consultationRequestSchema.methods.accept = function(specialistId, message, suggestedDate, suggestedTime, suggestedPrice) {
  this.status = 'accepted';
  this.specialistResponse = {
    respondedAt: new Date(),
    message,
    suggestedDate,
    suggestedTime,
    suggestedPrice
  };
  return this;
};

// Reject request
consultationRequestSchema.methods.reject = function(specialistId, reason) {
  this.status = 'rejected';
  this.specialistResponse = {
    respondedAt: new Date(),
    message: reason
  };
  return this;
};

// Start negotiation
consultationRequestSchema.methods.negotiate = function(userId, message, proposedDate, proposedTime, proposedPrice) {
  this.status = 'negotiating';
  this.negotiationHistory.push({
    fromUserId: userId,
    message,
    proposedDate,
    proposedTime,
    proposedPrice,
    timestamp: new Date()
  });
  return this;
};

// Confirm booking
consultationRequestSchema.methods.confirm = async function(date, time, duration, price, location) {
  this.status = 'confirmed';
  this.confirmedDate = date;
  this.confirmedTime = time;
  this.confirmedDuration = duration;
  this.finalPrice = price;
  this.confirmedLocation = location;

  await this.save();
  return this;
};

// Cancel request
consultationRequestSchema.methods.cancel = function(userId, reason, reasonAr, refundAmount = 0) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    reason,
    reasonAr,
    refundIssued: refundAmount > 0,
    refundAmount
  };
  return this;
};

// Complete request (create session)
consultationRequestSchema.methods.complete = function(sessionId) {
  this.status = 'completed';
  this.sessionId = sessionId;
  this.completedAt = new Date();
  return this;
};

// === STATIC METHODS ===

// Get pending requests for specialist
consultationRequestSchema.statics.getPendingRequests = async function(specialistId) {
  return this.find({
    specialistId,
    status: 'pending',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: new Date() } }
    ]
  })
  .populate('clientId', 'fullName profilePicture email phoneNumber')
  .sort({ createdAt: -1 });
};

// Get client's requests
consultationRequestSchema.statics.getClientRequests = async function(clientId) {
  return this.find({ clientId })
    .populate('specialistId', 'fullName profilePicture')
    .sort({ createdAt: -1 });
};

// === HOOKS ===

// Before save - set expiration
consultationRequestSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // Expires in 7 days
    this.expiresAt = expiry;
  }

  // Auto-expire if past expiration
  if (this.status === 'pending' && this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'expired';
  }

  next();
});

const ConsultationRequest = mongoose.model('ConsultationRequest', consultationRequestSchema);

module.exports = ConsultationRequest;
