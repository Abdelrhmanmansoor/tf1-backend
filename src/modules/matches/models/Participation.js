const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  status: {
    type: String,
    enum: ['joined'],
    default: 'joined'
  },
  joined_at: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// UNIQUE constraint: one user can only join a match once
participationSchema.index({ match_id: 1, user_id: 1 }, { unique: true });
participationSchema.index({ match_id: 1 });
participationSchema.index({ user_id: 1 });

module.exports = mongoose.model('MSParticipation', participationSchema, 'ms_match_participants');
