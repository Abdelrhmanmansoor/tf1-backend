const mongoose = require('mongoose');
const crypto = require('crypto');

const teamMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,
  email: String,
  accessKey: {
    type: String,
    unique: true,
    sparse: true
  },
  permissions: [{
    module: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      enum: ['view', 'create', 'edit', 'delete', 'manage', 'export', 'import']
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const leaderTeamSchema = new mongoose.Schema({
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  leaderName: String,
  leaderEmail: String,
  leaderAccessKey: {
    type: String,
    unique: true
  },
  teamMembers: [teamMemberSchema],
  settings: {
    allowTeamInvites: {
      type: Boolean,
      default: true
    },
    requireAccessKey: {
      type: Boolean,
      default: true
    },
    sessionTimeout: {
      type: Number,
      default: 480
    },
    maxTeamMembers: {
      type: Number,
      default: 50
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

leaderTeamSchema.methods.generateAccessKey = function() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
};

leaderTeamSchema.methods.addTeamMember = async function(userId, name, email, permissions = []) {
  const accessKey = this.generateAccessKey();
  
  this.teamMembers.push({
    userId,
    name,
    email,
    accessKey,
    permissions,
    isActive: true,
    addedAt: new Date()
  });
  
  return accessKey;
};

leaderTeamSchema.methods.updateMemberPermissions = function(memberId, permissions) {
  const member = this.teamMembers.id(memberId);
  if (member) {
    member.permissions = permissions;
    return true;
  }
  return false;
};

leaderTeamSchema.methods.removeMember = function(memberId) {
  const member = this.teamMembers.id(memberId);
  if (member) {
    member.isActive = false;
    return true;
  }
  return false;
};

leaderTeamSchema.index({ 'teamMembers.userId': 1 });

module.exports = mongoose.model('LeaderTeam', leaderTeamSchema);
