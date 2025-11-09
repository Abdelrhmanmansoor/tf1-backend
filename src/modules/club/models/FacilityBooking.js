const mongoose = require('mongoose');

const facilityBookingSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === FACILITY DETAILS ===
  facilityName: {
    type: String,
    required: true
  },
  facilityNameAr: {
    type: String
  },
  facilityType: {
    type: String,
    enum: ['outdoor_field', 'indoor_court', 'gym', 'swimming_pool', 'tennis_court',
           'basketball_court', 'volleyball_court', 'track', 'martial_arts_hall',
           'dance_studio', 'yoga_studio', 'meeting_room', 'other'],
    required: true,
    index: true
  },
  facilityId: {
    type: String, // Internal facility identifier
    index: true
  },

  // === FACILITY SPECIFICATIONS ===
  specifications: {
    size: String, // e.g., "100m x 60m"
    capacity: Number,
    surfaceType: String, // grass, artificial turf, hardwood, etc.
    hasLighting: Boolean,
    isIndoor: Boolean,
    amenities: [String] // locker rooms, showers, etc.
  },

  // === BOOKING DETAILS ===
  bookedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userType: {
      type: String,
      enum: ['member', 'external', 'team', 'admin']
    },
    name: String,
    email: String,
    phoneNumber: String
  },

  // === BOOKING TYPE ===
  bookingType: {
    type: String,
    enum: ['internal', 'external', 'team_training', 'event', 'maintenance'],
    required: true,
    index: true
  },

  // === DATE & TIME ===
  bookingDate: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String, // "14:00"
    required: true
  },
  endTime: {
    type: String, // "16:00"
    required: true
  },
  duration: {
    type: Number // in minutes
  },

  // === PURPOSE ===
  purpose: {
    type: String,
    enum: ['training', 'match', 'tournament', 'event', 'practice', 'class', 'meeting', 'maintenance', 'other'],
    required: true
  },
  description: {
    type: String
  },
  descriptionAr: {
    type: String
  },

  // === RECURRENCE (for recurring bookings) ===
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly']
    },
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    endDate: Date,
    occurrences: Number
  },
  parentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FacilityBooking'
  },

  // === STATUS ===
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_use', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
    index: true
  },

  // === APPROVAL WORKFLOW (for external bookings) ===
  approval: {
    requiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    rejectionReasonAr: String
  },

  // === TEAM ASSIGNMENT (if booking is for a team) ===
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },

  // === EVENT ASSIGNMENT (if booking is for an event) ===
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },

  // === PARTICIPANTS ===
  expectedParticipants: {
    type: Number
  },
  participantList: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String
  }],

  // === EQUIPMENT & RESOURCES ===
  equipmentRequested: [{
    item: String,
    itemAr: String,
    quantity: Number,
    provided: Boolean
  }],

  // === NOTES & SPECIAL REQUESTS ===
  notes: {
    type: String
  },
  notesAr: {
    type: String
  },
  specialRequests: [{
    request: String,
    requestAr: String,
    fulfilled: Boolean
  }],

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

  // === CHECK-IN/CHECK-OUT ===
  checkIn: {
    time: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  checkOut: {
    time: Date,
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    facilityCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'damaged']
    },
    damageReport: String
  },

  // === NOTIFICATIONS ===
  notifications: {
    confirmationSent: Boolean,
    reminderSent: Boolean,
    cancellationSent: Boolean
  },

  // === STATUS FLAGS ===
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // === CONFLICT DETECTION ===
  hasConflict: {
    type: Boolean,
    default: false
  },
  conflictWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FacilityBooking'
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
facilityBookingSchema.index({ clubId: 1, bookingDate: 1 });
facilityBookingSchema.index({ clubId: 1, facilityType: 1, bookingDate: 1 });
facilityBookingSchema.index({ clubId: 1, status: 1 });
facilityBookingSchema.index({ 'bookedBy.userId': 1, bookingDate: 1 });
facilityBookingSchema.index({ teamId: 1, bookingDate: 1 });
facilityBookingSchema.index({ facilityId: 1, bookingDate: 1, startTime: 1 });

// === VIRTUALS ===
facilityBookingSchema.virtual('isPast').get(function() {
  return new Date() > this.bookingDate;
});

facilityBookingSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.bookingDate;
});

facilityBookingSchema.virtual('isToday').get(function() {
  const today = new Date();
  const bookingDate = new Date(this.bookingDate);
  return today.toDateString() === bookingDate.toDateString();
});

facilityBookingSchema.virtual('durationInHours').get(function() {
  if (!this.duration) return 0;
  return (this.duration / 60).toFixed(1);
});

// === METHODS ===

// Calculate duration
facilityBookingSchema.methods.calculateDuration = function() {
  if (!this.startTime || !this.endTime) return 0;

  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  this.duration = endMinutes - startMinutes;
  return this.duration;
};

// Check for conflicts
facilityBookingSchema.methods.checkConflicts = async function() {
  const conflicts = await mongoose.model('FacilityBooking').find({
    clubId: this.clubId,
    facilityId: this.facilityId,
    bookingDate: this.bookingDate,
    status: { $in: ['confirmed', 'in_use', 'pending'] },
    isDeleted: false,
    _id: { $ne: this._id }, // exclude self
    $or: [
      // Booking starts during existing booking
      {
        $and: [
          { startTime: { $lte: this.startTime } },
          { endTime: { $gt: this.startTime } }
        ]
      },
      // Booking ends during existing booking
      {
        $and: [
          { startTime: { $lt: this.endTime } },
          { endTime: { $gte: this.endTime } }
        ]
      },
      // Booking completely contains existing booking
      {
        $and: [
          { startTime: { $gte: this.startTime } },
          { endTime: { $lte: this.endTime } }
        ]
      }
    ]
  });

  this.hasConflict = conflicts.length > 0;
  this.conflictWith = conflicts.map(c => c._id);

  return conflicts;
};

// Approve booking
facilityBookingSchema.methods.approve = async function(approvedBy) {
  // Check for conflicts first
  const conflicts = await this.checkConflicts();
  if (conflicts.length > 0) {
    throw new Error('Cannot approve booking due to time conflicts');
  }

  this.status = 'confirmed';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();

  await this.save();
  return this;
};

// Reject booking
facilityBookingSchema.methods.reject = async function(rejectedBy, reason, reasonAr) {
  this.status = 'rejected';
  this.approval.rejectedBy = rejectedBy;
  this.approval.rejectedAt = new Date();
  this.approval.rejectionReason = reason;
  this.approval.rejectionReasonAr = reasonAr;

  await this.save();
  return this;
};

// Cancel booking
facilityBookingSchema.methods.cancel = async function(cancelledBy, reason, reasonAr) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy,
    cancelledAt: new Date(),
    reason,
    reasonAr
  };

  await this.save();
  return this;
};

// Check in
facilityBookingSchema.methods.checkInFacility = function(checkedInBy) {
  this.status = 'in_use';
  this.checkIn = {
    time: new Date(),
    checkedInBy
  };
  return this;
};

// Check out
facilityBookingSchema.methods.checkOutFacility = function(checkedOutBy, condition, damageReport) {
  this.status = 'completed';
  this.checkOut = {
    time: new Date(),
    checkedOutBy,
    facilityCondition: condition,
    damageReport
  };
  return this;
};

// === STATIC METHODS ===

// Get bookings for a facility on a specific date
facilityBookingSchema.statics.getFacilitySchedule = async function(clubId, facilityId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    clubId,
    facilityId,
    bookingDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['confirmed', 'in_use', 'pending'] },
    isDeleted: false
  })
  .populate('bookedBy.userId', 'fullName')
  .populate('teamId', 'teamName')
  .sort({ startTime: 1 });
};

// Get available time slots for a facility
facilityBookingSchema.statics.getAvailableSlots = async function(clubId, facilityId, date, slotDuration = 60) {
  const bookings = await this.getFacilitySchedule(clubId, facilityId, date);

  // Define operating hours (can be made configurable)
  const openingHour = 6; // 6 AM
  const closingHour = 23; // 11 PM

  const availableSlots = [];
  let currentTime = openingHour * 60; // in minutes

  while (currentTime < closingHour * 60) {
    const slotStart = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`;
    const slotEnd = `${String(Math.floor((currentTime + slotDuration) / 60)).padStart(2, '0')}:${String((currentTime + slotDuration) % 60).padStart(2, '0')}`;

    // Check if slot conflicts with existing bookings
    const hasConflict = bookings.some(booking => {
      return (slotStart < booking.endTime && slotEnd > booking.startTime);
    });

    if (!hasConflict) {
      availableSlots.push({ startTime: slotStart, endTime: slotEnd });
    }

    currentTime += slotDuration;
  }

  return availableSlots;
};

// Get club bookings with filters
facilityBookingSchema.statics.getClubBookings = async function(clubId, filters = {}) {
  const query = { clubId, isDeleted: false };

  if (filters.facilityType) query.facilityType = filters.facilityType;
  if (filters.facilityId) query.facilityId = filters.facilityId;
  if (filters.status) query.status = filters.status;
  if (filters.bookingType) query.bookingType = filters.bookingType;
  if (filters.teamId) query.teamId = filters.teamId;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.bookingDate = {};
    if (filters.startDate) query.bookingDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.bookingDate.$lte = new Date(filters.endDate);
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const bookings = await this.find(query)
    .populate('bookedBy.userId', 'fullName email phoneNumber')
    .populate('teamId', 'teamName')
    .populate('eventId', 'title type')
    .sort({ bookingDate: -1, startTime: 1 })
    .limit(limit)
    .skip(skip);

  const total = await this.countDocuments(query);

  return {
    bookings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBookings: total,
      limit
    }
  };
};

// Get pending bookings
facilityBookingSchema.statics.getPendingBookings = async function(clubId) {
  return this.find({
    clubId,
    status: 'pending',
    isDeleted: false
  })
  .populate('bookedBy.userId', 'fullName email phoneNumber')
  .sort({ createdAt: -1 });
};

// Get user bookings
facilityBookingSchema.statics.getUserBookings = async function(userId) {
  return this.find({
    'bookedBy.userId': userId,
    isDeleted: false,
    status: { $in: ['pending', 'confirmed', 'in_use'] }
  })
  .populate('clubId', 'clubName logo')
  .sort({ bookingDate: 1 });
};

// Get facility utilization statistics
facilityBookingSchema.statics.getFacilityUtilization = async function(clubId, facilityId, startDate, endDate) {
  const bookings = await this.find({
    clubId,
    facilityId,
    bookingDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['confirmed', 'completed', 'in_use'] },
    isDeleted: false
  });

  const totalMinutes = bookings.reduce((sum, booking) => sum + (booking.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(2);

  // Calculate days between start and end
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const operatingHoursPerDay = 17; // 6 AM to 11 PM
  const totalAvailableHours = days * operatingHoursPerDay;

  const utilizationRate = ((totalHours / totalAvailableHours) * 100).toFixed(2);

  // Group by booking type
  const byType = {};
  bookings.forEach(booking => {
    byType[booking.bookingType] = (byType[booking.bookingType] || 0) + 1;
  });

  return {
    totalBookings: bookings.length,
    totalHours: parseFloat(totalHours),
    utilizationRate: parseFloat(utilizationRate),
    byType,
    averageBookingDuration: bookings.length > 0 ? (totalMinutes / bookings.length).toFixed(0) : 0
  };
};

// === HOOKS ===

// Before save - calculate duration and check conflicts
facilityBookingSchema.pre('save', async function(next) {
  // Calculate duration
  if (!this.duration) {
    this.calculateDuration();
  }

  // Check conflicts if status is confirmed or pending
  if (this.isModified('startTime') || this.isModified('endTime') || this.isModified('bookingDate')) {
    if (this.status === 'confirmed' || this.status === 'pending') {
      await this.checkConflicts();
    }
  }

  next();
});

// After save - update club statistics
facilityBookingSchema.post('save', async function(doc) {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: doc.clubId });

  if (club) {
    const totalBookings = await mongoose.model('FacilityBooking').countDocuments({
      clubId: doc.clubId,
      isDeleted: false
    });

    club.activityStats.totalBookings = totalBookings;
    await club.save();
  }
});

const FacilityBooking = mongoose.model('FacilityBooking', facilityBookingSchema);

module.exports = FacilityBooking;
