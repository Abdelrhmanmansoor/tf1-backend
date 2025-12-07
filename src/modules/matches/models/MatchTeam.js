const mongoose = require('mongoose');

const matchTeamSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    required: true
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSTeam',
    required: true
  },
  role: {
    type: String,
    enum: ['home', 'away'],
    required: true
  }
});

// Ensure unique team per match
matchTeamSchema.index({ match_id: 1, team_id: 1 }, { unique: true });
matchTeamSchema.index({ match_id: 1 });

module.exports = mongoose.model('MSMatchTeam', matchTeamSchema, 'ms_match_teams');
