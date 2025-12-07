const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchUser',
    required: true
  },
  role: {
    type: String,
    enum: ['captain', 'player'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'pending'],
    default: 'active'
  },
  joined_at: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index to ensure no duplicate team memberships
teamMemberSchema.index({ team_id: 1, user_id: 1 }, { unique: true });
teamMemberSchema.index({ user_id: 1 });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
