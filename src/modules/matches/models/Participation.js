const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchUser',
    required: true
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'waitlisted', 'checked_in', 'no_show'],
    default: 'confirmed'
  },
  joined_at: {
    type: Date,
    default: Date.now
  }
});

// UNIQUE constraint: one user can only join a match once
participationSchema.index({ match_id: 1, user_id: 1 }, { unique: true });
participationSchema.index({ match_id: 1 });
participationSchema.index({ user_id: 1 });

module.exports = mongoose.model('Participation', participationSchema);
