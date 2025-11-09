const mongoose = require('mongoose');

const coachAvailabilitySchema = new mongoose.Schema({
  // Link to coach
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Weekly recurring schedule
  weeklySchedule: [{
    day: {
      type: String,
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    slots: [{
      startTime: {
        type: String, // "09:00"
        required: true
      },
      endTime: {
        type: String, // "17:00"
        required: true
      },
      isBooked: {
        type: Boolean,
        default: false
      },
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingSession'
      }
    }]
  }],

  // Specific date overrides (vacations, special unavailability)
  dateOverrides: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    reason: String, // "Vacation", "Personal", "Holiday"
    reasonAr: String,
    slots: [{
      startTime: String,
      endTime: String,
      isBooked: Boolean,
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingSession'
      }
    }]
  }],

  // Booking settings
  bookingSettings: {
    // Advance booking notice (in hours)
    minimumNotice: {
      type: Number,
      default: 24 // 24 hours
    },
    // Maximum advance booking (in days)
    maximumAdvance: {
      type: Number,
      default: 30 // 30 days
    },
    // Session duration options (in minutes)
    sessionDurations: [{
      type: Number,
      default: [60, 90, 120]
    }],
    // Default session duration
    defaultDuration: {
      type: Number,
      default: 60
    },
    // Break time between sessions (in minutes)
    breakBetweenSessions: {
      type: Number,
      default: 15
    },
    // Maximum sessions per day
    maxSessionsPerDay: {
      type: Number,
      default: 8
    },
    // Allow back-to-back sessions
    allowBackToBack: {
      type: Boolean,
      default: false
    }
  },

  // Cancellation policy
  cancellationPolicy: {
    allowCancellation: {
      type: Boolean,
      default: true
    },
    minimumNoticePeriod: {
      type: Number, // in hours
      default: 24
    },
    chargeCancellationFee: {
      type: Boolean,
      default: false
    },
    cancellationFeePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    policyText: String,
    policyTextAr: String
  },

  // Timezone
  timezone: {
    type: String,
    default: 'Africa/Cairo'
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Indexes
coachAvailabilitySchema.index({ coachId: 1, 'weeklySchedule.day': 1 });
coachAvailabilitySchema.index({ coachId: 1, 'dateOverrides.date': 1 });

// Method to check if a time slot is available
coachAvailabilitySchema.methods.isSlotAvailable = function(date, startTime, endTime) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check date overrides first
  const dateOverride = this.dateOverrides.find(override => {
    const overrideDate = new Date(override.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (dateOverride) {
    if (!dateOverride.isAvailable) return false;

    // Check slots in override
    return dateOverride.slots.some(slot => {
      return slot.startTime === startTime &&
             slot.endTime === endTime &&
             !slot.isBooked;
    });
  }

  // Check weekly schedule
  const daySchedule = this.weeklySchedule.find(schedule => schedule.day === dayOfWeek);

  if (!daySchedule || !daySchedule.isAvailable) return false;

  // Check if requested time falls within any available slot
  return daySchedule.slots.some(slot => {
    return startTime >= slot.startTime &&
           endTime <= slot.endTime &&
           !slot.isBooked;
  });
};

// Method to book a slot
coachAvailabilitySchema.methods.bookSlot = async function(date, startTime, endTime, sessionId) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check date overrides first
  const dateOverride = this.dateOverrides.find(override => {
    const overrideDate = new Date(override.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (dateOverride) {
    const slot = dateOverride.slots.find(s => s.startTime === startTime && s.endTime === endTime);
    if (slot) {
      slot.isBooked = true;
      slot.bookingId = sessionId;
      await this.save();
      return true;
    }
  }

  // Book in weekly schedule
  const daySchedule = this.weeklySchedule.find(schedule => schedule.day === dayOfWeek);
  if (daySchedule) {
    const slot = daySchedule.slots.find(s => s.startTime === startTime && s.endTime === endTime);
    if (slot) {
      slot.isBooked = true;
      slot.bookingId = sessionId;
      await this.save();
      return true;
    }
  }

  return false;
};

// Method to cancel a booking
coachAvailabilitySchema.methods.cancelBooking = async function(sessionId) {
  // Check all slots in weekly schedule
  for (let daySchedule of this.weeklySchedule) {
    for (let slot of daySchedule.slots) {
      if (slot.bookingId && slot.bookingId.toString() === sessionId.toString()) {
        slot.isBooked = false;
        slot.bookingId = null;
        await this.save();
        return true;
      }
    }
  }

  // Check date overrides
  for (let dateOverride of this.dateOverrides) {
    for (let slot of dateOverride.slots) {
      if (slot.bookingId && slot.bookingId.toString() === sessionId.toString()) {
        slot.isBooked = false;
        slot.bookingId = null;
        await this.save();
        return true;
      }
    }
  }

  return false;
};

// Method to get available slots for a specific date
coachAvailabilitySchema.methods.getAvailableSlotsForDate = function(date) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

  // Check date override first
  const dateOverride = this.dateOverrides.find(override => {
    const overrideDate = new Date(override.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (dateOverride) {
    if (!dateOverride.isAvailable) return [];
    return dateOverride.slots.filter(slot => !slot.isBooked);
  }

  // Get from weekly schedule
  const daySchedule = this.weeklySchedule.find(schedule => schedule.day === dayOfWeek);

  if (!daySchedule || !daySchedule.isAvailable) return [];

  return daySchedule.slots.filter(slot => !slot.isBooked);
};

// Method to block a date (vacation, etc.)
coachAvailabilitySchema.methods.blockDate = async function(date, reason, reasonAr) {
  const existingOverride = this.dateOverrides.find(override => {
    const overrideDate = new Date(override.date);
    return overrideDate.toDateString() === date.toDateString();
  });

  if (existingOverride) {
    existingOverride.isAvailable = false;
    existingOverride.reason = reason;
    existingOverride.reasonAr = reasonAr;
  } else {
    this.dateOverrides.push({
      date,
      isAvailable: false,
      reason,
      reasonAr,
      slots: []
    });
  }

  await this.save();
};

// Method to unblock a date
coachAvailabilitySchema.methods.unblockDate = async function(date) {
  this.dateOverrides = this.dateOverrides.filter(override => {
    const overrideDate = new Date(override.date);
    return overrideDate.toDateString() !== date.toDateString();
  });
  await this.save();
};

module.exports = mongoose.model('CoachAvailability', coachAvailabilitySchema);
