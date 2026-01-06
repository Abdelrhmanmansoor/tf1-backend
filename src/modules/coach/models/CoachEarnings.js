const mongoose = require('mongoose');

const coachEarningsSchema = new mongoose.Schema({
  // Link to coach
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Link to session (if applicable)
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingSession'
  },

  // Link to student/player
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Link to club (if session was at a club)
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClubProfile'
  },

  // Earning details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EGP'
  },

  // Platform fee (if any in future)
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true
  },

  // Payment details
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_payment', 'card', 'club_payment', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  paidAt: {
    type: Date
  },

  // Transaction details
  transactionId: String,
  transactionReference: String,

  // Service details
  serviceType: {
    type: String,
    enum: ['individual_session', 'group_session', 'monthly_package', 'consultation', 'custom'],
    required: true
  },
  serviceDescription: String,
  sessionDate: Date,
  sessionDuration: Number, // in minutes

  // Additional info
  notes: String,
  receiptUrl: String,

  // Month/Year for reporting
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  year: {
    type: Number
  },

  // Status
  isDeleted: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Indexes for reporting
coachEarningsSchema.index({ coachId: 1, year: 1, month: 1 });
coachEarningsSchema.index({ coachId: 1, paymentStatus: 1 });
coachEarningsSchema.index({ coachId: 1, createdAt: -1 });
coachEarningsSchema.index({ sessionId: 1 });
coachEarningsSchema.index({ studentId: 1 }); // Single field index for studentId

// Pre-save middleware to calculate month/year and netAmount
coachEarningsSchema.pre('save', function(next) {
  if (!this.month || !this.year) {
    const date = this.paidAt || this.createdAt || new Date();
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
  }

  // Calculate net amount (amount - platform fee)
  if (this.isModified('amount') || this.isModified('platformFee')) {
    this.netAmount = this.amount - (this.platformFee || 0);
  }

  next();
});

// Static method to get coach's total earnings
coachEarningsSchema.statics.getTotalEarnings = async function(coachId, filters = {}) {
  const query = { coachId, paymentStatus: 'completed', isDeleted: false };

  if (filters.startDate) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
  }
  if (filters.month) {
    query.month = filters.month;
  }
  if (filters.year) {
    query.year = filters.year;
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        totalPlatformFees: { $sum: '$platformFee' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || {
    totalAmount: 0,
    totalNetAmount: 0,
    totalPlatformFees: 0,
    count: 0
  };
};

// Static method to get monthly earnings breakdown
coachEarningsSchema.statics.getMonthlyBreakdown = async function(coachId, year) {
  const result = await this.aggregate([
    {
      $match: {
        coachId: new mongoose.Types.ObjectId(coachId),
        year: year,
        paymentStatus: 'completed',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$month',
        totalAmount: { $sum: '$amount' },
        netAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Fill in missing months with zeros
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalAmount: 0,
    netAmount: 0,
    count: 0
  }));

  result.forEach(item => {
    monthlyData[item._id - 1] = {
      month: item._id,
      totalAmount: item.totalAmount,
      netAmount: item.netAmount,
      count: item.count
    };
  });

  return monthlyData;
};

// Static method to get earnings by payment method
coachEarningsSchema.statics.getEarningsByPaymentMethod = async function(coachId, filters = {}) {
  const query = { coachId, paymentStatus: 'completed', isDeleted: false };

  if (filters.startDate) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        netAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result;
};

// Static method to get earnings by service type
coachEarningsSchema.statics.getEarningsByServiceType = async function(coachId, filters = {}) {
  const query = { coachId, paymentStatus: 'completed', isDeleted: false };

  if (filters.startDate) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$serviceType',
        totalAmount: { $sum: '$amount' },
        netAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result;
};

// Static method to create earning from training session
coachEarningsSchema.statics.createFromSession = async function(session) {
  const earning = new this({
    coachId: session.coachId,
    sessionId: session._id,
    studentId: session.studentId,
    clubId: session.clubId,
    amount: session.price,
    currency: session.currency || 'EGP',
    platformFee: 0, // No platform fee currently
    paymentMethod: session.paymentMethod || 'cash',
    paymentStatus: 'completed',
    paidAt: session.completedAt || new Date(),
    serviceType: session.sessionType === 'group' ? 'group_session' : 'individual_session',
    serviceDescription: `Training session on ${session.date}`,
    sessionDate: session.date,
    sessionDuration: session.duration
  });

  await earning.save();
  return earning;
};

module.exports = mongoose.model('CoachEarnings', coachEarningsSchema);
