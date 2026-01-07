const mongoose = require('mongoose');

/**
 * PlayerAgeGroupAssignment Model
 * Manages the assignment of players to age groups and teams
 * This creates the critical link between Player and AgeGroup
 */
const playerAgeGroupAssignmentSchema = new mongoose.Schema({
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
    required: [true, 'Age group ID is required'],
    index: true
  },
  
  // Team reference (if teams within age groups exist)
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  
  // Assigned Coach
  assignedCoachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Club reference
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Player Position in this age group
  position: {
    type: String,
    trim: true
  },
  positionAr: {
    type: String,
    trim: true
  },
  
  // Jersey Number
  jerseyNumber: {
    type: Number,
    min: 1,
    max: 99
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'suspended', 'graduated'],
    default: 'active',
    index: true
  },
  
  // Dates
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  
  // Who assigned this player
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notes from supervisor/coach
  notes: {
    type: String,
    maxlength: 1000
  },
  notesAr: {
    type: String,
    maxlength: 1000
  },
  
  // Performance tracking flags
  isCaptain: {
    type: Boolean,
    default: false
  },
  isViceCaptain: {
    type: Boolean,
    default: false
  },
  
  // Transfer history
  transferredFrom: {
    ageGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup'
    },
    date: Date,
    reason: String
  },
  
  // Attendance tracking
  attendanceRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
  
}, {
  timestamps: true
});

// Compound indexes for efficient queries
playerAgeGroupAssignmentSchema.index({ playerId: 1, status: 1 });
playerAgeGroupAssignmentSchema.index({ ageGroupId: 1, status: 1 });
playerAgeGroupAssignmentSchema.index({ clubId: 1, status: 1 });
playerAgeGroupAssignmentSchema.index({ teamId: 1, status: 1 });

// Unique constraint: One active assignment per player
playerAgeGroupAssignmentSchema.index(
  { playerId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active', isDeleted: false }
  }
);

// Unique jersey number per age group
playerAgeGroupAssignmentSchema.index(
  { ageGroupId: 1, jerseyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active', isDeleted: false, jerseyNumber: { $exists: true } }
  }
);

// Virtual populate for player details
playerAgeGroupAssignmentSchema.virtual('player', {
  ref: 'User',
  localField: 'playerId',
  foreignField: '_id',
  justOne: true
});

// Virtual populate for age group details
playerAgeGroupAssignmentSchema.virtual('ageGroup', {
  ref: 'AgeGroup',
  localField: 'ageGroupId',
  foreignField: '_id',
  justOne: true
});

// Methods
playerAgeGroupAssignmentSchema.methods.deactivate = async function(reason) {
  this.status = 'inactive';
  this.leftAt = new Date();
  if (reason) {
    this.notes = (this.notes || '') + `\nDeactivated: ${reason}`;
  }
  return await this.save();
};

playerAgeGroupAssignmentSchema.methods.transfer = async function(newAgeGroupId, transferredBy, reason) {
  // Save current age group to history
  this.transferredFrom = {
    ageGroupId: this.ageGroupId,
    date: new Date(),
    reason: reason || 'Transfer'
  };
  
  // Update to new age group
  this.ageGroupId = newAgeGroupId;
  this.assignedBy = transferredBy;
  this.notes = (this.notes || '') + `\nTransferred: ${reason}`;
  
  return await this.save();
};

// Statics
playerAgeGroupAssignmentSchema.statics.getActiveAssignment = async function(playerId) {
  return await this.findOne({
    playerId,
    status: 'active',
    isDeleted: false
  })
    .populate('ageGroupId')
    .populate('teamId')
    .populate('assignedCoachId', 'firstName lastName avatar');
};

playerAgeGroupAssignmentSchema.statics.getAgeGroupPlayers = async function(ageGroupId, options = {}) {
  const { status = 'active', includeInactive = false } = options;
  
  const query = {
    ageGroupId,
    isDeleted: false
  };
  
  if (!includeInactive) {
    query.status = status;
  }
  
  return await this.find(query)
    .populate('playerId', 'firstName lastName avatar email')
    .populate('assignedCoachId', 'firstName lastName')
    .sort({ jerseyNumber: 1, joinedAt: 1 });
};

playerAgeGroupAssignmentSchema.statics.getTeamPlayers = async function(teamId) {
  return await this.find({
    teamId,
    status: 'active',
    isDeleted: false
  })
    .populate('playerId', 'firstName lastName avatar')
    .sort({ jerseyNumber: 1 });
};

// Middleware: Update age group player count on save
playerAgeGroupAssignmentSchema.post('save', async function() {
  if (this.isModified('status') || this.isModified('ageGroupId')) {
    const AgeGroup = mongoose.model('AgeGroup');
    
    // Update new age group count
    const activeCount = await this.constructor.countDocuments({
      ageGroupId: this.ageGroupId,
      status: 'active',
      isDeleted: false
    });
    
    await AgeGroup.findByIdAndUpdate(this.ageGroupId, {
      playersCount: activeCount
    });
    
    // If transferred, update old age group count
    if (this.transferredFrom?.ageGroupId) {
      const oldActiveCount = await this.constructor.countDocuments({
        ageGroupId: this.transferredFrom.ageGroupId,
        status: 'active',
        isDeleted: false
      });
      
      await AgeGroup.findByIdAndUpdate(this.transferredFrom.ageGroupId, {
        playersCount: oldActiveCount
      });
    }
  }
});

module.exports = mongoose.model('PlayerAgeGroupAssignment', playerAgeGroupAssignmentSchema);

