const mongoose = require('mongoose');

const specialistAvailabilitySchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  specialistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // === WEEKLY RECURRING SCHEDULE ===
  weeklySchedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    slots: [{
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      isBooked: {
        type: Boolean,
        default: false
      },
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConsultationSession'
      },
      serviceType: String,
      locationType: {
        type: String,
        enum: ['clinic', 'online', 'home_visit', 'club', 'other']
      }
    }]
  }],

  // === DATE-SPECIFIC OVERRIDES ===
  dateOverrides: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    reason: String,
    reasonAr: String,
    slots: [{
      startTime: String,
      endTime: String,
      isBooked: Boolean,
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConsultationSession'
      }
    }]
  }],

  // === VACATION/BLOCKED PERIODS ===
  blockedPeriods: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    reason: String,
    reasonAr: String,
    type: {
      type: String,
      enum: ['vacation', 'conference', 'personal', 'maintenance', 'other']
    }
  }],

  // === BOOKING SETTINGS ===
  bookingSettings: {
    // Session durations
    sessionDurations: [{
      type: Number, // in minutes
      default: [30, 45, 60, 90, 120]
    }],
    defaultDuration: {
      type: Number,
      default: 60
    },

    // Timing rules
    minimumNotice: {
      type: Number,
      default: 24 // hours before booking
    },
    maximumAdvanceBooking: {
      type: Number,
      default: 30 // days in advance
    },
    breakBetweenSessions: {
      type: Number,
      default: 15 // minutes
    },
    maxSessionsPerDay: {
      type: Number,
      default: 8
    },

    // Buffer times
    bufferBeforeSession: {
      type: Number,
      default: 0 // minutes
    },
    bufferAfterSession: {
      type: Number,
      default: 0 // minutes
    },

    // Auto-accept settings
    autoAcceptBookings: {
      type: Boolean,
      default: false
    },
    requireManualApproval: {
      type: Boolean,
      default: true
    }
  },

  // === CANCELLATION POLICY ===
  cancellationPolicy: {
    allowCancellation: {
      type: Boolean,
      default: true
    },
    refundableHours: {
      type: Number,
      default: 24
    },
    refundPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    lateCancellationFee: {
      type: Number,
      default: 0
    },
    noShowFee: {
      type: Number,
      default: 0
    },
    policy: String,
    policyAr: String
  },

  // === TIMEZONE ===
  timezone: {
    type: String,
    default: 'Africa/Cairo'
  },

  // === METADATA ===
  lastUpdated: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
// Note: specialistId already has unique:true which creates an index
specialistAvailabilitySchema.index({ 'dateOverrides.date': 1 });
specialistAvailabilitySchema.index({ 'blockedPeriods.startDate': 1, 'blockedPeriods.endDate': 1 });

// === METHODS ===

// Check if a slot is available
specialistAvailabilitySchema.methods.isSlotAvailable = function(date, startTime, endTime) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check if date is blocked
  const isBlocked = this.blockedPeriods.some(period => {
    return date >= period.startDate && date <= period.endDate;
  });

  if (isBlocked) return false;

  // Check for date override
  const override = this.dateOverrides.find(o => {
    const overrideDate = new Date(o.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (override) {
    if (!override.isAvailable) return false;

    const slot = override.slots.find(s =>
      s.startTime === startTime && s.endTime === endTime
    );

    return slot && !slot.isBooked;
  }

  // Check weekly schedule
  const daySchedule = this.weeklySchedule.find(s => s.day === dayOfWeek);
  if (!daySchedule || !daySchedule.isAvailable) return false;

  const slot = daySchedule.slots.find(s =>
    s.startTime === startTime && s.endTime === endTime
  );

  return slot && !slot.isBooked;
};

// Book a slot
specialistAvailabilitySchema.methods.bookSlot = async function(date, startTime, endTime, bookingId, serviceType, locationType) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check for date override first
  const overrideIndex = this.dateOverrides.findIndex(o => {
    const overrideDate = new Date(o.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (overrideIndex !== -1) {
    const slotIndex = this.dateOverrides[overrideIndex].slots.findIndex(s =>
      s.startTime === startTime && s.endTime === endTime
    );

    if (slotIndex !== -1) {
      this.dateOverrides[overrideIndex].slots[slotIndex].isBooked = true;
      this.dateOverrides[overrideIndex].slots[slotIndex].bookingId = bookingId;
      await this.save();
      return true;
    }
  }

  // Book in weekly schedule
  const dayIndex = this.weeklySchedule.findIndex(s => s.day === dayOfWeek);
  if (dayIndex === -1) return false;

  const slotIndex = this.weeklySchedule[dayIndex].slots.findIndex(s =>
    s.startTime === startTime && s.endTime === endTime
  );

  if (slotIndex === -1) return false;

  this.weeklySchedule[dayIndex].slots[slotIndex].isBooked = true;
  this.weeklySchedule[dayIndex].slots[slotIndex].bookingId = bookingId;
  this.weeklySchedule[dayIndex].slots[slotIndex].serviceType = serviceType;
  this.weeklySchedule[dayIndex].slots[slotIndex].locationType = locationType;

  await this.save();
  return true;
};

// Cancel booking
specialistAvailabilitySchema.methods.cancelBooking = async function(bookingId) {
  // Check date overrides
  for (let override of this.dateOverrides) {
    for (let slot of override.slots) {
      if (slot.bookingId?.toString() === bookingId.toString()) {
        slot.isBooked = false;
        slot.bookingId = null;
        await this.save();
        return true;
      }
    }
  }

  // Check weekly schedule
  for (let day of this.weeklySchedule) {
    for (let slot of day.slots) {
      if (slot.bookingId?.toString() === bookingId.toString()) {
        slot.isBooked = false;
        slot.bookingId = null;
        slot.serviceType = null;
        slot.locationType = null;
        await this.save();
        return true;
      }
    }
  }

  return false;
};

// Get available slots for a specific date
specialistAvailabilitySchema.methods.getAvailableSlotsForDate = function(date) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check if date is blocked
  const isBlocked = this.blockedPeriods.some(period => {
    return date >= period.startDate && date <= period.endDate;
  });

  if (isBlocked) {
    return {
      date: date,
      isAvailable: false,
      reason: 'Blocked period',
      slots: []
    };
  }

  // Check for date override
  const override = this.dateOverrides.find(o => {
    const overrideDate = new Date(o.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (override) {
    return {
      date: date,
      isAvailable: override.isAvailable,
      reason: override.reason,
      slots: override.slots.filter(s => !s.isBooked)
    };
  }

  // Use weekly schedule
  const daySchedule = this.weeklySchedule.find(s => s.day === dayOfWeek);

  if (!daySchedule || !daySchedule.isAvailable) {
    return {
      date: date,
      isAvailable: false,
      reason: 'Not available on this day',
      slots: []
    };
  }

  return {
    date: date,
    isAvailable: true,
    slots: daySchedule.slots.filter(s => !s.isBooked)
  };
};

// Block a date
specialistAvailabilitySchema.methods.blockDate = function(date, reason, reasonAr) {
  const existingOverride = this.dateOverrides.find(o => {
    const overrideDate = new Date(o.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (existingOverride) {
    existingOverride.isAvailable = false;
    existingOverride.reason = reason;
    existingOverride.reasonAr = reasonAr;
  } else {
    this.dateOverrides.push({
      date: date,
      isAvailable: false,
      reason: reason,
      reasonAr: reasonAr,
      slots: []
    });
  }

  return this;
};

// Unblock a date
specialistAvailabilitySchema.methods.unblockDate = function(date) {
  this.dateOverrides = this.dateOverrides.filter(o => {
    const overrideDate = new Date(o.date);
    return overrideDate.toDateString() !== date.toDateString();
  });

  return this;
};

// Block a period
specialistAvailabilitySchema.methods.blockPeriod = function(startDate, endDate, reason, reasonAr, type = 'vacation') {
  this.blockedPeriods.push({
    startDate,
    endDate,
    reason,
    reasonAr,
    type
  });

  return this;
};

// Unblock a period
specialistAvailabilitySchema.methods.unblockPeriod = function(periodId) {
  this.blockedPeriods = this.blockedPeriods.filter(p => p._id.toString() !== periodId.toString());
  return this;
};

// Get next available slot
specialistAvailabilitySchema.methods.getNextAvailableSlot = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check next 30 days
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);

    const daySlots = this.getAvailableSlotsForDate(checkDate);
    if (daySlots.isAvailable && daySlots.slots.length > 0) {
      return {
        date: checkDate,
        slot: daySlots.slots[0]
      };
    }
  }

  return null;
};

// === STATIC METHODS ===

// Create default availability for a specialist
specialistAvailabilitySchema.statics.createDefault = async function(specialistId) {
  const defaultSchedule = [
    { day: 'sunday', isAvailable: false, slots: [] },
    {
      day: 'monday',
      isAvailable: true,
      slots: [
        { startTime: '09:00', endTime: '10:00', isBooked: false },
        { startTime: '10:00', endTime: '11:00', isBooked: false },
        { startTime: '11:00', endTime: '12:00', isBooked: false },
        { startTime: '14:00', endTime: '15:00', isBooked: false },
        { startTime: '15:00', endTime: '16:00', isBooked: false },
        { startTime: '16:00', endTime: '17:00', isBooked: false }
      ]
    },
    {
      day: 'tuesday',
      isAvailable: true,
      slots: [
        { startTime: '09:00', endTime: '10:00', isBooked: false },
        { startTime: '10:00', endTime: '11:00', isBooked: false },
        { startTime: '11:00', endTime: '12:00', isBooked: false },
        { startTime: '14:00', endTime: '15:00', isBooked: false },
        { startTime: '15:00', endTime: '16:00', isBooked: false },
        { startTime: '16:00', endTime: '17:00', isBooked: false }
      ]
    },
    {
      day: 'wednesday',
      isAvailable: true,
      slots: [
        { startTime: '09:00', endTime: '10:00', isBooked: false },
        { startTime: '10:00', endTime: '11:00', isBooked: false },
        { startTime: '11:00', endTime: '12:00', isBooked: false },
        { startTime: '14:00', endTime: '15:00', isBooked: false },
        { startTime: '15:00', endTime: '16:00', isBooked: false },
        { startTime: '16:00', endTime: '17:00', isBooked: false }
      ]
    },
    {
      day: 'thursday',
      isAvailable: true,
      slots: [
        { startTime: '09:00', endTime: '10:00', isBooked: false },
        { startTime: '10:00', endTime: '11:00', isBooked: false },
        { startTime: '11:00', endTime: '12:00', isBooked: false },
        { startTime: '14:00', endTime: '15:00', isBooked: false },
        { startTime: '15:00', endTime: '16:00', isBooked: false },
        { startTime: '16:00', endTime: '17:00', isBooked: false }
      ]
    },
    { day: 'friday', isAvailable: false, slots: [] },
    {
      day: 'saturday',
      isAvailable: true,
      slots: [
        { startTime: '09:00', endTime: '10:00', isBooked: false },
        { startTime: '10:00', endTime: '11:00', isBooked: false },
        { startTime: '11:00', endTime: '12:00', isBooked: false }
      ]
    }
  ];

  const availability = new this({
    specialistId,
    weeklySchedule: defaultSchedule
  });

  await availability.save();
  return availability;
};

const SpecialistAvailability = mongoose.model('SpecialistAvailability', specialistAvailabilitySchema);

module.exports = SpecialistAvailability;
