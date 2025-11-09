const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
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

  // === TEAM DETAILS ===
  teamName: {
    type: String,
    required: true
  },
  teamNameAr: {
    type: String
  },
  logo: {
    type: String // Team logo URL
  },
  colors: {
    primary: String,
    secondary: String
  },

  // === SPORT & CATEGORY ===
  sport: {
    type: String,
    required: true,
    index: true
  },
  ageCategory: {
    type: String,
    enum: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'U23', 'seniors', 'veterans', 'mixed'],
    index: true
  },
  level: {
    type: String,
    enum: ['beginner', 'amateur', 'semi-pro', 'professional', 'elite'],
    required: true,
    index: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    default: 'mixed'
  },

  // === SEASON ===
  season: {
    name: String, // e.g., "2024-2025"
    startDate: Date,
    endDate: Date
  },

  // === ROSTER - PLAYERS ===
  players: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubMember',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    jerseyNumber: {
      type: Number,
      min: 0,
      max: 99
    },
    position: String,
    joinedTeamDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'injured', 'suspended', 'inactive'],
      default: 'active'
    },
    isCaptain: {
      type: Boolean,
      default: false
    },
    isViceCaptain: {
      type: Boolean,
      default: false
    }
  }],

  // === COACHING STAFF ===
  coaches: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubMember',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['head_coach', 'assistant_coach', 'fitness_coach', 'goalkeeper_coach', 'technical_director'],
      required: true
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],

  // === MEDICAL & SUPPORT STAFF ===
  staff: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubMember'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['physiotherapist', 'nutritionist', 'sports_psychologist', 'doctor', 'equipment_manager']
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],

  // === TRAINING SCHEDULE ===
  trainingSchedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String, // "14:00"
    endTime: String, // "16:00"
    location: String,
    locationAr: String,
    type: {
      type: String,
      enum: ['technical', 'tactical', 'physical', 'recovery', 'friendly_match']
    }
  }],

  // === MATCH SCHEDULE ===
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],

  // === TEAM STATISTICS ===
  statistics: {
    // Match stats
    totalMatches: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    goalsFor: {
      type: Number,
      default: 0
    },
    goalsAgainst: {
      type: Number,
      default: 0
    },
    cleanSheets: {
      type: Number,
      default: 0
    },

    // Training stats
    totalTrainingSessions: {
      type: Number,
      default: 0
    },
    averageAttendance: {
      type: Number,
      default: 0
    },

    // Current form (last 5 matches)
    currentForm: [String], // ['W', 'L', 'D', 'W', 'W']

    // League standing (if applicable)
    leaguePosition: Number,
    points: Number
  },

  // === ACHIEVEMENTS ===
  achievements: [{
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    date: Date,
    type: {
      type: String,
      enum: ['championship', 'tournament', 'cup', 'league', 'award', 'milestone']
    },
    images: [String]
  }],

  // === TEAM MEDIA ===
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
    duration: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === TEAM DOCUMENTS ===
  documents: [{
    type: {
      type: String,
      enum: ['roster', 'registration', 'insurance', 'license', 'contract', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // === STATUS ===
  status: {
    type: String,
    enum: ['active', 'inactive', 'disbanded'],
    default: 'active',
    index: true
  },
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

  // === METADATA ===
  description: {
    type: String
  },
  descriptionAr: {
    type: String
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES ===
teamSchema.index({ clubId: 1, sport: 1 });
teamSchema.index({ clubId: 1, status: 1 });
teamSchema.index({ teamName: 'text', teamNameAr: 'text' });
teamSchema.index({ ageCategory: 1, level: 1 });
teamSchema.index({ 'players.userId': 1 });
teamSchema.index({ 'coaches.userId': 1 });

// === VIRTUALS ===
teamSchema.virtual('playerCount').get(function() {
  return this.players?.filter(p => p.status === 'active').length || 0;
});

teamSchema.virtual('winPercentage').get(function() {
  if (this.statistics.totalMatches === 0) return 0;
  return ((this.statistics.wins / this.statistics.totalMatches) * 100).toFixed(2);
});

teamSchema.virtual('goalDifference').get(function() {
  return this.statistics.goalsFor - this.statistics.goalsAgainst;
});

teamSchema.virtual('captain').get(function() {
  return this.players?.find(p => p.isCaptain);
});

teamSchema.virtual('headCoach').get(function() {
  return this.coaches?.find(c => c.role === 'head_coach');
});

// === METHODS ===

// Add player to team
teamSchema.methods.addPlayer = async function(memberId, userId, position, jerseyNumber) {
  // Check if player already exists
  const exists = this.players.some(p => p.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('Player already in team');
  }

  // Check jersey number uniqueness
  if (jerseyNumber) {
    const jerseyTaken = this.players.some(p => p.jerseyNumber === jerseyNumber);
    if (jerseyTaken) {
      throw new Error(`Jersey number ${jerseyNumber} is already taken`);
    }
  }

  this.players.push({
    memberId,
    userId,
    position,
    jerseyNumber,
    joinedTeamDate: new Date(),
    status: 'active'
  });

  // Update club member's team assignment
  const ClubMember = mongoose.model('ClubMember');
  const member = await ClubMember.findById(memberId);
  if (member) {
    member.assignToTeam(this._id, 'player', this.createdBy);
    await member.save();
  }

  await this.save();
  return this;
};

// Remove player from team
teamSchema.methods.removePlayer = async function(userId) {
  const playerIndex = this.players.findIndex(p => p.userId.toString() === userId.toString());
  if (playerIndex === -1) {
    throw new Error('Player not found in team');
  }

  const player = this.players[playerIndex];
  this.players.splice(playerIndex, 1);

  // Update club member's team assignment
  const ClubMember = mongoose.model('ClubMember');
  const member = await ClubMember.findById(player.memberId);
  if (member) {
    member.removeFromTeam(this._id, this.createdBy);
    await member.save();
  }

  await this.save();
  return this;
};

// Assign captain
teamSchema.methods.assignCaptain = function(userId) {
  // Remove current captain
  this.players.forEach(p => {
    p.isCaptain = false;
    if (p.userId.toString() === userId.toString()) {
      p.isCaptain = true;
    }
  });

  return this;
};

// Add coach to team
teamSchema.methods.addCoach = async function(memberId, userId, role) {
  // Check if coach already exists
  const exists = this.coaches.some(c => c.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('Coach already assigned to team');
  }

  this.coaches.push({
    memberId,
    userId,
    role,
    assignedDate: new Date()
  });

  // Update club member's team assignment
  const ClubMember = mongoose.model('ClubMember');
  const member = await ClubMember.findById(memberId);
  if (member) {
    member.assignToTeam(this._id, role, this.createdBy);
    await member.save();
  }

  await this.save();
  return this;
};

// Remove coach from team
teamSchema.methods.removeCoach = async function(userId) {
  const coachIndex = this.coaches.findIndex(c => c.userId.toString() === userId.toString());
  if (coachIndex === -1) {
    throw new Error('Coach not found in team');
  }

  const coach = this.coaches[coachIndex];
  this.coaches.splice(coachIndex, 1);

  // Update club member's team assignment
  const ClubMember = mongoose.model('ClubMember');
  const member = await ClubMember.findById(coach.memberId);
  if (member) {
    member.removeFromTeam(this._id, this.createdBy);
    await member.save();
  }

  await this.save();
  return this;
};

// Add staff member
teamSchema.methods.addStaff = function(memberId, userId, role) {
  // Check if staff already exists
  const exists = this.staff.some(s => s.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('Staff member already assigned to team');
  }

  this.staff.push({
    memberId,
    userId,
    role,
    assignedDate: new Date()
  });

  return this;
};

// Update training schedule
teamSchema.methods.updateTrainingSchedule = function(schedule) {
  this.trainingSchedule = schedule;
  return this;
};

// Update match statistics
teamSchema.methods.updateMatchStats = function(matchResult) {
  this.statistics.totalMatches += 1;

  if (matchResult.result === 'win') {
    this.statistics.wins += 1;
    this.statistics.currentForm.push('W');
  } else if (matchResult.result === 'draw') {
    this.statistics.draws += 1;
    this.statistics.currentForm.push('D');
  } else {
    this.statistics.losses += 1;
    this.statistics.currentForm.push('L');
  }

  // Keep only last 5 matches in form
  if (this.statistics.currentForm.length > 5) {
    this.statistics.currentForm.shift();
  }

  this.statistics.goalsFor += matchResult.goalsFor || 0;
  this.statistics.goalsAgainst += matchResult.goalsAgainst || 0;

  if (matchResult.goalsAgainst === 0) {
    this.statistics.cleanSheets += 1;
  }

  // Calculate points (3 for win, 1 for draw)
  if (matchResult.result === 'win') {
    this.statistics.points = (this.statistics.points || 0) + 3;
  } else if (matchResult.result === 'draw') {
    this.statistics.points = (this.statistics.points || 0) + 1;
  }

  return this;
};

// Update player status
teamSchema.methods.updatePlayerStatus = function(userId, status) {
  const player = this.players.find(p => p.userId.toString() === userId.toString());
  if (player) {
    player.status = status;
  }
  return this;
};

// Get active players
teamSchema.methods.getActivePlayers = function() {
  return this.players.filter(p => p.status === 'active');
};

// Get available players (active and not injured)
teamSchema.methods.getAvailablePlayers = function() {
  return this.players.filter(p => p.status === 'active' || p.status === 'inactive');
};

// === STATIC METHODS ===

// Get all teams for a club
teamSchema.statics.getClubTeams = async function(clubId, filters = {}) {
  const query = { clubId, isDeleted: false };

  if (filters.sport) query.sport = filters.sport;
  if (filters.ageCategory) query.ageCategory = filters.ageCategory;
  if (filters.level) query.level = filters.level;
  if (filters.status) query.status = filters.status;

  return this.find(query)
    .populate('players.userId', 'fullName profilePicture')
    .populate('coaches.userId', 'fullName profilePicture')
    .populate('staff.userId', 'fullName profilePicture')
    .sort({ ageCategory: 1, teamName: 1 });
};

// Get teams for a specific player
teamSchema.statics.getPlayerTeams = async function(userId) {
  return this.find({
    'players.userId': userId,
    isDeleted: false,
    status: 'active'
  })
  .populate('clubId', 'clubName logo')
  .sort({ createdAt: -1 });
};

// Get teams for a specific coach
teamSchema.statics.getCoachTeams = async function(userId) {
  return this.find({
    'coaches.userId': userId,
    isDeleted: false,
    status: 'active'
  })
  .populate('clubId', 'clubName logo')
  .sort({ createdAt: -1 });
};

// === HOOKS ===

// Before save - ensure only one captain
teamSchema.pre('save', function(next) {
  const captains = this.players?.filter(p => p.isCaptain) || [];
  if (captains.length > 1) {
    // Keep only the last one as captain
    this.players.forEach((p, index) => {
      if (p.isCaptain && index < this.players.length - 1) {
        p.isCaptain = false;
      }
    });
  }

  next();
});

// After save - update club profile
teamSchema.post('save', async function(doc) {
  const ClubProfile = mongoose.model('ClubProfile');
  const club = await ClubProfile.findOne({ userId: doc.clubId });

  if (club && !club.teams.includes(doc._id)) {
    club.teams.push(doc._id);
    await club.save();
  }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
