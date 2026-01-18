const mongoose = require('mongoose');

const clubMemberSchema = new mongoose.Schema({
  // === BASIC INFORMATION ===
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === MEMBER TYPE & ROLE ===
  memberType: {
    type: String,
    enum: ['player', 'coach', 'specialist', 'staff', 'honorary'],
    required: true,
    index: true
  },
  memberRole: {
    type: String,
    enum: ['owner', 'general_manager', 'admin_manager', 'regular_member', 'guest'],
    default: 'regular_member',
    index: true
  },

  // === MEMBERSHIP DETAILS ===
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended', 'former'],
    default: 'pending',
    index: true
  },
  joinDate: {
    type: Date
  },
  approvalDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  membershipNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // === SPORT & POSITION (for players/coaches) ===
  sport: {
    type: String,
    index: true
  },
  position: {
    type: String // player position or coaching specialization
  },
  level: {
    type: String,
    enum: ['beginner', 'amateur', 'semi-pro', 'professional', 'elite']
  },

  // === TEAM ASSIGNMENT ===
  assignedTeams: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    role: {
      type: String,
      enum: ['player', 'coach', 'assistant_coach', 'specialist', 'captain']
    },
    assignedDate: Date
  }],

  // === PERMISSIONS (for staff/admins) ===
  permissions: {
    manageMembers: {
      type: Boolean,
      default: false
    },
    manageTeams: {
      type: Boolean,
      default: false
    },
    manageEvents: {
      type: Boolean,
      default: false
    },
    manageFacilities: {
      type: Boolean,
      default: false
    },
    manageJobs: {
      type: Boolean,
      default: false
    },
    viewFinancials: {
      type: Boolean,
      default: false
    },
    sendAnnouncements: {
      type: Boolean,
      default: false
    },
    editClubProfile: {
      type: Boolean,
      default: false
    }
  },

  // === MEMBERSHIP HISTORY ===
  history: [{
    action: {
      type: String,
      enum: ['joined', 'activated', 'deactivated', 'suspended', 'role_changed',
             'team_assigned', 'team_removed', 'permissions_updated', 'removed']
    },
    date: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    details: String
  }],

  // === ACTIVITY STATISTICS ===
  activityStats: {
    totalEventsAttended: {
      type: Number,
      default: 0
    },
    totalTrainingSessions: {
      type: Number,
      default: 0
    },
    totalMatchesPlayed: {
      type: Number,
      default: 0
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastActivityDate: {
      type: Date
    }
  },

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
    },
    isPrivate: {
      type: Boolean,
      default: true
    }
  }],

  // === EMERGENCY CONTACT (optional) ===
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String,
    email: String
  },

  // === DOCUMENTS ===
  documents: [{
    type: {
      type: String,
      enum: ['id_card', 'medical_certificate', 'consent_form', 'contract', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date
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

  // === APPLICATION DATA (if member came through application) ===
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication'
  },
  applicationDate: {
    type: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
clubMemberSchema.index({ clubId: 1, userId: 1 }, { unique: true });
clubMemberSchema.index({ clubId: 1, status: 1 });
clubMemberSchema.index({ clubId: 1, memberType: 1 });
clubMemberSchema.index({ clubId: 1, memberRole: 1 });
clubMemberSchema.index({ 'assignedTeams.teamId': 1 });
clubMemberSchema.index({ joinDate: -1 });
clubMemberSchema.index({ createdAt: -1 });

// === VIRTUALS ===
clubMemberSchema.virtual('membershipDuration').get(function() {
  if (!this.joinDate) return 0;
  const endDate = this.endDate || new Date();
  const duration = endDate - this.joinDate;
  return Math.floor(duration / (1000 * 60 * 60 * 24)); // days
});

clubMemberSchema.virtual('isAdmin').get(function() {
  return ['owner', 'general_manager', 'admin_manager'].includes(this.memberRole);
});

// === METHODS ===

// Generate unique membership number
clubMemberSchema.methods.generateMembershipNumber = async function() {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: this.clubId });

  if (!club) return null;

  const count = await mongoose.model('ClubMember').countDocuments({
    clubId: this.clubId,
    membershipNumber: { $exists: true }
  });

  const prefix = club.clubName?.substring(0, 3).toUpperCase() || 'CLB';
  const year = new Date().getFullYear();
  const number = String(count + 1).padStart(4, '0');

  this.membershipNumber = `${prefix}-${year}-${number}`;
  return this.membershipNumber;
};

// Add history entry
clubMemberSchema.methods.addHistory = function(action, performedBy, reason, details) {
  this.history.push({
    action,
    date: new Date(),
    performedBy,
    reason,
    details
  });
};

// Activate membership
clubMemberSchema.methods.activate = async function(performedBy) {
  this.status = 'active';
  this.approvalDate = new Date();
  this.joinDate = this.joinDate || new Date();

  if (!this.membershipNumber) {
    await this.generateMembershipNumber();
  }

  this.addHistory('activated', performedBy, 'Membership activated');
  await this.save();

  // Update club member stats
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: this.clubId });
  if (club) {
    await club.updateMemberStats();
  }

  return this;
};

// Deactivate membership
clubMemberSchema.methods.deactivate = async function(performedBy, reason) {
  this.status = 'inactive';
  this.endDate = new Date();
  this.addHistory('deactivated', performedBy, reason);
  await this.save();

  // Update club member stats
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: this.clubId });
  if (club) {
    await club.updateMemberStats();
  }

  return this;
};

// Assign to team
clubMemberSchema.methods.assignToTeam = function(teamId, role, performedBy) {
  const existingAssignment = this.assignedTeams.find(
    t => t.teamId.toString() === teamId.toString()
  );

  if (!existingAssignment) {
    this.assignedTeams.push({
      teamId,
      role,
      assignedDate: new Date()
    });
    this.addHistory('team_assigned', performedBy, `Assigned to team as ${role}`);
  }

  return this;
};

// Remove from team
clubMemberSchema.methods.removeFromTeam = function(teamId, performedBy) {
  this.assignedTeams = this.assignedTeams.filter(
    t => t.teamId.toString() !== teamId.toString()
  );
  this.addHistory('team_removed', performedBy, 'Removed from team');
  return this;
};

// Update permissions
clubMemberSchema.methods.updatePermissions = function(newPermissions, performedBy) {
  Object.keys(newPermissions).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(this.permissions, key)) {
      this.permissions[key] = newPermissions[key];
    }
  });
  this.addHistory('permissions_updated', performedBy, 'Permissions updated');
  return this;
};

// Check if member has permission
clubMemberSchema.methods.hasPermission = function(permission) {
  // Owners have all permissions
  if (this.memberRole === 'owner') return true;

  // General managers have most permissions
  if (this.memberRole === 'general_manager') {
    return permission !== 'editClubProfile';
  }

  // Check specific permission
  return this.permissions[permission] === true;
};

// Update activity stats
clubMemberSchema.methods.updateActivityStats = async function() {
  // This would aggregate from Event, TrainingSession models
  // For now, just update last activity date
  this.activityStats.lastActivityDate = new Date();
  await this.save();
  return this.activityStats;
};

// === STATIC METHODS ===

// Get all members of a club with filters
clubMemberSchema.statics.getClubMembers = async function(clubId, filters = {}) {
  const query = { clubId, isDeleted: false };

  if (filters.memberType) query.memberType = filters.memberType;
  if (filters.status) query.status = filters.status;
  if (filters.sport) query.sport = filters.sport;
  if (filters.memberRole) query.memberRole = filters.memberRole;

  return this.find(query)
    .populate('userId', 'fullName email phoneNumber profilePicture')
    .populate('assignedTeams.teamId', 'teamName sport')
    .sort({ joinDate: -1 });
};

// Get pending membership requests
clubMemberSchema.statics.getPendingRequests = async function(clubId) {
  return this.find({ clubId, status: 'pending', isDeleted: false })
    .populate('userId', 'fullName email phoneNumber profilePicture roles')
    .sort({ createdAt: -1 });
};

// Get member statistics for a club
clubMemberSchema.statics.getMemberStatistics = async function(clubId) {
  // CRITICAL PERFORMANCE FIX: Run all queries in parallel using Promise.all
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [stats, typeStats, newThisMonth] = await Promise.all([
    // Get status statistics
    this.aggregate([
      { $match: { clubId: new mongoose.Types.ObjectId(clubId), isDeleted: false } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]).catch(err => {
      console.warn('[getMemberStatistics] Status stats error:', err.message);
      return []; // Fallback
    }),

    // Get type statistics
    this.aggregate([
      { $match: { clubId: new mongoose.Types.ObjectId(clubId), status: 'active', isDeleted: false } },
      { $group: {
        _id: '$memberType',
        count: { $sum: 1 }
      }}
    ]).catch(err => {
      console.warn('[getMemberStatistics] Type stats error:', err.message);
      return []; // Fallback
    }),

    // Get new members this month
    this.countDocuments({
      clubId,
      joinDate: { $gte: startOfMonth },
      isDeleted: false
    }).catch(err => {
      console.warn('[getMemberStatistics] New members error:', err.message);
      return 0; // Fallback
    })
  ]);

  return {
    byStatus: stats,
    byType: typeStats,
    newThisMonth
  };
};

// === HOOKS ===

// Before save - validate team assignments
clubMemberSchema.pre('save', async function(next) {
  if (this.isModified('assignedTeams')) {
    // Remove duplicate team assignments
    const uniqueTeams = [];
    const seenTeamIds = new Set();

    this.assignedTeams.forEach(assignment => {
      const teamIdStr = assignment.teamId.toString();
      if (!seenTeamIds.has(teamIdStr)) {
        seenTeamIds.add(teamIdStr);
        uniqueTeams.push(assignment);
      }
    });

    this.assignedTeams = uniqueTeams;
  }

  next();
});

const ClubMember = mongoose.model('ClubMember', clubMemberSchema);

module.exports = ClubMember;
