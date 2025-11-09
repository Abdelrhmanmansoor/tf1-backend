const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // === EVENT DETAILS ===
  title: {
    type: String,
    required: true
  },
  titleAr: {
    type: String
  },
  description: {
    type: String
  },
  descriptionAr: {
    type: String
  },

  // === EVENT TYPE ===
  type: {
    type: String,
    enum: ['training', 'official_match', 'friendly_match', 'tournament', 'training_camp',
           'social_event', 'meeting', 'celebration', 'trial', 'workshop', 'other'],
    required: true,
    index: true
  },

  // === SPORT & TEAM ===
  sport: {
    type: String,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },

  // === DATE & TIME ===
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // "14:00"
    required: true
  },
  endTime: {
    type: String // "16:00"
  },
  duration: {
    type: Number // in minutes
  },
  timezone: {
    type: String,
    default: 'Africa/Cairo'
  },

  // === LOCATION ===
  location: {
    type: {
      type: String,
      enum: ['club_facility', 'external'],
      default: 'club_facility'
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility'
    },
    facilityName: String,
    facilityNameAr: String,
    address: String,
    addressAr: String,
    city: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    }
  },

  // === PARTICIPANTS ===
  targetAudience: {
    type: String,
    enum: ['specific_team', 'age_group', 'all_members', 'players_only', 'coaches_only',
           'staff_only', 'public', 'invitation_only'],
    default: 'all_members'
  },
  ageGroup: {
    type: String
  },
  maxParticipants: {
    type: Number
  },

  // Registered participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'confirmed', 'cancelled'],
      default: 'registered'
    },
    role: {
      type: String,
      enum: ['participant', 'organizer', 'coach', 'referee', 'volunteer']
    }
  }],

  // === ATTENDANCE TRACKING ===
  attendance: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true
    },
    checkInTime: Date,
    notes: String
  }],

  // === EVENT STATUS ===
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled',
    index: true
  },
  cancellationReason: {
    type: String
  },
  cancellationReasonAr: {
    type: String
  },
  postponedTo: {
    type: Date
  },

  // === RECURRENCE (for recurring events) ===
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly']
    },
    interval: Number, // every X days/weeks/months
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    endDate: Date,
    occurrences: Number // or stop after X occurrences
  },

  // === MATCH DETAILS (if type is match) ===
  matchDetails: {
    opponent: String,
    opponentAr: String,
    opponentLogo: String,
    homeTeam: {
      type: String,
      enum: ['us', 'opponent', 'neutral']
    },
    competition: String, // League, Cup, etc.
    competitionAr: String,
    referee: String,
    venue: String,
    venueAr: String,
    isHome: Boolean,

    // Match result
    result: {
      ourScore: Number,
      opponentScore: Number,
      outcome: {
        type: String,
        enum: ['win', 'draw', 'loss', 'pending']
      }
    }
  },

  // === RESOURCES & EQUIPMENT ===
  resources: [{
    item: String,
    itemAr: String,
    quantity: Number,
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // === NOTIFICATIONS ===
  notifications: {
    sendReminder: {
      type: Boolean,
      default: true
    },
    reminderBefore: {
      type: Number,
      default: 24 // hours before event
    },
    notificationsSent: [{
      type: {
        type: String,
        enum: ['created', 'reminder', 'updated', 'cancelled']
      },
      sentAt: Date,
      recipientCount: Number
    }]
  },

  // === MEDIA ===
  photos: [{
    url: String,
    caption: String,
    captionAr: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  videos: [{
    url: String,
    thumbnail: String,
    title: String,
    titleAr: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === NOTES & REMARKS ===
  notes: [{
    note: String,
    noteAr: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

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
  isPublic: {
    type: Boolean,
    default: false
  },
  requiresRegistration: {
    type: Boolean,
    default: false
  },

  // === STATISTICS ===
  stats: {
    views: {
      type: Number,
      default: 0
    },
    registrations: {
      type: Number,
      default: 0
    },
    attendanceRate: {
      type: Number,
      default: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
eventSchema.index({ clubId: 1, startDate: 1 });
eventSchema.index({ clubId: 1, type: 1 });
eventSchema.index({ clubId: 1, status: 1 });
eventSchema.index({ teamId: 1, startDate: 1 });
eventSchema.index({ title: 'text', titleAr: 'text' });
eventSchema.index({ 'participants.userId': 1 });
eventSchema.index({ startDate: 1, endDate: 1 });

// === VIRTUALS ===
eventSchema.virtual('participantCount').get(function() {
  return this.participants?.length || 0;
});

eventSchema.virtual('attendanceCount').get(function() {
  return this.attendance?.filter(a => a.status === 'present').length || 0;
});

eventSchema.virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  return this.participantCount >= this.maxParticipants;
});

eventSchema.virtual('isPast').get(function() {
  return new Date() > this.endDate;
});

eventSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.startDate;
});

eventSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// === METHODS ===

// Register participant
eventSchema.methods.registerParticipant = function(userId, role = 'participant') {
  // Check if already registered
  const exists = this.participants.some(p => p.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('User already registered for this event');
  }

  // Check capacity
  if (this.maxParticipants && this.participantCount >= this.maxParticipants) {
    throw new Error('Event is full');
  }

  this.participants.push({
    userId,
    registeredAt: new Date(),
    status: 'registered',
    role
  });

  this.stats.registrations = this.participants.length;

  return this;
};

// Unregister participant
eventSchema.methods.unregisterParticipant = function(userId) {
  const index = this.participants.findIndex(p => p.userId.toString() === userId.toString());
  if (index === -1) {
    throw new Error('User not registered for this event');
  }

  this.participants.splice(index, 1);
  this.stats.registrations = this.participants.length;

  return this;
};

// Mark attendance
eventSchema.methods.markAttendance = function(userId, status, checkInTime) {
  // Check if user is registered
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) {
    throw new Error('User not registered for this event');
  }

  // Check if already marked
  const existing = this.attendance.findIndex(a => a.userId.toString() === userId.toString());

  if (existing !== -1) {
    // Update existing attendance
    this.attendance[existing].status = status;
    this.attendance[existing].checkInTime = checkInTime || new Date();
  } else {
    // Add new attendance
    this.attendance.push({
      userId,
      status,
      checkInTime: checkInTime || new Date()
    });
  }

  // Calculate attendance rate
  this.calculateAttendanceRate();

  return this;
};

// Calculate attendance rate
eventSchema.methods.calculateAttendanceRate = function() {
  if (this.participants.length === 0) {
    this.stats.attendanceRate = 0;
    return 0;
  }

  const presentCount = this.attendance.filter(a => a.status === 'present').length;
  this.stats.attendanceRate = ((presentCount / this.participants.length) * 100).toFixed(2);

  return this.stats.attendanceRate;
};

// Cancel event
eventSchema.methods.cancel = function(reason, reasonAr) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancellationReasonAr = reasonAr;
  return this;
};

// Postpone event
eventSchema.methods.postpone = function(newDate, reason) {
  this.status = 'postponed';
  this.postponedTo = newDate;
  this.cancellationReason = reason;
  return this;
};

// Start event
eventSchema.methods.start = function() {
  this.status = 'ongoing';
  return this;
};

// Complete event
eventSchema.methods.complete = function(matchResult) {
  this.status = 'completed';

  if (matchResult && this.matchDetails) {
    this.matchDetails.result = matchResult;
  }

  // Update team statistics if it's a match
  if (this.type === 'official_match' && this.teamId && matchResult) {
    const Team = mongoose.model('Team');
    Team.findById(this.teamId).then(team => {
      if (team) {
        team.updateMatchStats({
          result: matchResult.outcome,
          goalsFor: matchResult.ourScore,
          goalsAgainst: matchResult.opponentScore
        });
        team.save();
      }
    });
  }

  return this;
};

// Add note
eventSchema.methods.addNote = function(note, noteAr, addedBy) {
  this.notes.push({
    note,
    noteAr,
    addedBy,
    addedAt: new Date()
  });
  return this;
};

// === STATIC METHODS ===

// Get events for a club
eventSchema.statics.getClubEvents = async function(clubId, filters = {}) {
  const query = { clubId, isDeleted: false };

  if (filters.type) query.type = filters.type;
  if (filters.sport) query.sport = filters.sport;
  if (filters.teamId) query.teamId = filters.teamId;
  if (filters.status) query.status = filters.status;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.startDate = {};
    if (filters.startDate) query.startDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.startDate.$lte = new Date(filters.endDate);
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const events = await this.find(query)
    .populate('teamId', 'teamName sport')
    .populate('createdBy', 'fullName')
    .sort({ startDate: filters.sortOrder === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip(skip);

  const total = await this.countDocuments(query);

  return {
    events,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalEvents: total,
      limit
    }
  };
};

// Get upcoming events
eventSchema.statics.getUpcomingEvents = async function(clubId, days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    clubId,
    isDeleted: false,
    status: 'scheduled',
    startDate: { $gte: now, $lte: futureDate }
  })
  .populate('teamId', 'teamName sport')
  .sort({ startDate: 1 });
};

// Get events for a team
eventSchema.statics.getTeamEvents = async function(teamId, filters = {}) {
  const query = { teamId, isDeleted: false };

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;

  return this.find(query)
    .populate('clubId', 'clubName logo')
    .sort({ startDate: -1 });
};

// Get events for a user
eventSchema.statics.getUserEvents = async function(userId) {
  return this.find({
    'participants.userId': userId,
    isDeleted: false,
    status: { $in: ['scheduled', 'ongoing'] }
  })
  .populate('clubId', 'clubName logo')
  .populate('teamId', 'teamName sport')
  .sort({ startDate: 1 });
};

// === HOOKS ===

// Before save - calculate duration and validate
eventSchema.pre('save', function(next) {
  // Calculate duration if not set
  if (!this.duration && this.startDate && this.endDate) {
    const diff = this.endDate - this.startDate;
    this.duration = Math.floor(diff / (1000 * 60)); // minutes
  }

  // Validate end date is after start date
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }

  next();
});

// After save - update club statistics
eventSchema.post('save', async function(doc) {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: doc.clubId });

  if (club) {
    const totalEvents = await mongoose.model('Event').countDocuments({
      clubId: doc.clubId,
      isDeleted: false
    });

    const upcomingEvents = await mongoose.model('Event').countDocuments({
      clubId: doc.clubId,
      isDeleted: false,
      status: 'scheduled',
      startDate: { $gte: new Date() }
    });

    club.activityStats.totalEvents = totalEvents;
    club.activityStats.upcomingEvents = upcomingEvents;

    await club.save();
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
