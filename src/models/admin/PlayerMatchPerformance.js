const mongoose = require('mongoose');

/**
 * PlayerMatchPerformance Model
 * Tracks detailed player performance in each match
 * Linked to Match and Player through PlayerAgeGroupAssignment
 */
const playerMatchPerformanceSchema = new mongoose.Schema({
  // Match reference
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'Match ID is required'],
    index: true
  },
  
  // Player reference
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Player ID is required'],
    index: true
  },
  
  // Age Group reference
  ageGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup',
    required: true,
    index: true
  },
  
  // Player status in match
  status: {
    type: String,
    enum: ['starting', 'substitute', 'not-selected', 'injured', 'suspended', 'benched'],
    required: true,
    default: 'not-selected'
  },
  
  // Position played
  position: {
    type: String
  },
  positionAr: {
    type: String
  },
  
  // Jersey number
  jerseyNumber: {
    type: Number,
    min: 1,
    max: 99
  },
  
  // Playing time
  minutesPlayed: {
    type: Number,
    default: 0,
    min: 0,
    max: 120
  },
  
  // Performance statistics
  stats: {
    goals: {
      type: Number,
      default: 0,
      min: 0
    },
    assists: {
      type: Number,
      default: 0,
      min: 0
    },
    shots: {
      type: Number,
      default: 0,
      min: 0
    },
    shotsOnTarget: {
      type: Number,
      default: 0,
      min: 0
    },
    passes: {
      type: Number,
      default: 0,
      min: 0
    },
    passesCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    tackles: {
      type: Number,
      default: 0,
      min: 0
    },
    interceptions: {
      type: Number,
      default: 0,
      min: 0
    },
    fouls: {
      type: Number,
      default: 0,
      min: 0
    },
    foulsDrawn: {
      type: Number,
      default: 0,
      min: 0
    },
    offsides: {
      type: Number,
      default: 0,
      min: 0
    },
    corners: {
      type: Number,
      default: 0,
      min: 0
    },
    saves: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Disciplinary
  cards: {
    yellow: {
      type: Number,
      default: 0,
      min: 0,
      max: 2
    },
    red: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    }
  },
  
  // Substitution info
  substitution: {
    in: {
      minute: Number,
      replacedPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    out: {
      minute: Number,
      replacementPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        enum: ['tactical', 'injury', 'performance', 'disciplinary']
      }
    }
  },
  
  // Rating (1-10)
  rating: {
    coach: {
      type: Number,
      min: 1,
      max: 10
    },
    supervisor: {
      type: Number,
      min: 1,
      max: 10
    },
    average: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  
  // Man of the Match
  manOfTheMatch: {
    type: Boolean,
    default: false
  },
  
  // Notes and feedback
  coachNotes: {
    type: String,
    maxlength: 1000
  },
  coachNotesAr: {
    type: String,
    maxlength: 1000
  },
  
  supervisorNotes: {
    type: String,
    maxlength: 1000
  },
  supervisorNotesAr: {
    type: String,
    maxlength: 1000
  },
  
  // Injury during match
  injury: {
    occurred: {
      type: Boolean,
      default: false
    },
    minute: Number,
    type: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe']
    },
    expectedRecoveryDays: Number
  },
  
  // Who recorded this
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true
});

// Compound indexes
playerMatchPerformanceSchema.index({ matchId: 1, playerId: 1 }, { unique: true });
playerMatchPerformanceSchema.index({ playerId: 1, createdAt: -1 });
playerMatchPerformanceSchema.index({ ageGroupId: 1, createdAt: -1 });
playerMatchPerformanceSchema.index({ status: 1 });

// Virtual for pass completion percentage
playerMatchPerformanceSchema.virtual('passCompletionPercentage').get(function() {
  if (!this.stats.passes || this.stats.passes === 0) return 0;
  return Math.round((this.stats.passesCompleted / this.stats.passes) * 100);
});

// Virtual for shot accuracy
playerMatchPerformanceSchema.virtual('shotAccuracy').get(function() {
  if (!this.stats.shots || this.stats.shots === 0) return 0;
  return Math.round((this.stats.shotsOnTarget / this.stats.shots) * 100);
});

// Methods
playerMatchPerformanceSchema.methods.calculateAverageRating = function() {
  const ratings = [];
  if (this.rating.coach) ratings.push(this.rating.coach);
  if (this.rating.supervisor) ratings.push(this.rating.supervisor);
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((a, b) => a + b, 0);
  this.rating.average = Math.round((sum / ratings.length) * 10) / 10;
  return this.rating.average;
};

playerMatchPerformanceSchema.methods.recordGoal = function() {
  this.stats.goals += 1;
  return this.save();
};

playerMatchPerformanceSchema.methods.recordAssist = function() {
  this.stats.assists += 1;
  return this.save();
};

playerMatchPerformanceSchema.methods.recordYellowCard = function(minute) {
  if (this.cards.yellow < 2) {
    this.cards.yellow += 1;
  }
  return this.save();
};

playerMatchPerformanceSchema.methods.recordRedCard = function(minute) {
  this.cards.red = 1;
  if (this.cards.yellow === 1) {
    // Second yellow = red
    this.cards.yellow = 2;
  }
  return this.save();
};

// Statics
playerMatchPerformanceSchema.statics.getPlayerStats = async function(playerId, options = {}) {
  const { season, ageGroupId, limit = 10 } = options;
  
  const query = {
    playerId,
    status: { $in: ['starting', 'substitute'] },
    isDeleted: false
  };
  
  if (ageGroupId) query.ageGroupId = ageGroupId;
  if (season) query.createdAt = { $gte: season.start, $lte: season.end };
  
  const performances = await this.find(query)
    .populate('matchId', 'date opponent result status')
    .sort({ createdAt: -1 })
    .limit(limit);
  
  // Calculate aggregated stats
  const aggregated = {
    matchesPlayed: performances.length,
    matchesStarted: performances.filter(p => p.status === 'starting').length,
    totalMinutes: performances.reduce((sum, p) => sum + p.minutesPlayed, 0),
    totalGoals: performances.reduce((sum, p) => sum + (p.stats.goals || 0), 0),
    totalAssists: performances.reduce((sum, p) => sum + (p.stats.assists || 0), 0),
    averageRating: 0,
    yellowCards: performances.reduce((sum, p) => sum + (p.cards.yellow || 0), 0),
    redCards: performances.reduce((sum, p) => sum + (p.cards.red || 0), 0),
    manOfTheMatchAwards: performances.filter(p => p.manOfTheMatch).length,
    performances
  };
  
  // Calculate average rating
  const ratingsSum = performances.reduce((sum, p) => sum + (p.rating.average || 0), 0);
  const ratingsCount = performances.filter(p => p.rating.average > 0).length;
  aggregated.averageRating = ratingsCount > 0 
    ? Math.round((ratingsSum / ratingsCount) * 10) / 10 
    : 0;
  
  return aggregated;
};

playerMatchPerformanceSchema.statics.getMatchLineup = async function(matchId) {
  const lineup = await this.find({
    matchId,
    status: { $in: ['starting', 'substitute'] },
    isDeleted: false
  })
    .populate('playerId', 'firstName lastName avatar')
    .sort({ status: 1, jerseyNumber: 1 });
  
  return {
    starting: lineup.filter(p => p.status === 'starting'),
    substitutes: lineup.filter(p => p.status === 'substitute')
  };
};

playerMatchPerformanceSchema.statics.getTopScorers = async function(ageGroupId, limit = 10) {
  return await this.aggregate([
    {
      $match: {
        ageGroupId: new mongoose.Types.ObjectId(ageGroupId),
        isDeleted: false,
        'stats.goals': { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$playerId',
        totalGoals: { $sum: '$stats.goals' },
        totalAssists: { $sum: '$stats.assists' },
        matchesPlayed: { $sum: 1 }
      }
    },
    { $sort: { totalGoals: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' }
  ]);
};

// Middleware: Auto-calculate average rating before save
playerMatchPerformanceSchema.pre('save', function(next) {
  if (this.isModified('rating.coach') || this.isModified('rating.supervisor')) {
    this.calculateAverageRating();
  }
  next();
});

module.exports = mongoose.model('PlayerMatchPerformance', playerMatchPerformanceSchema);


