const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  starts_at: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true,
    trim: true
  },
  max_players: {
    type: Number,
    required: true,
    min: 2
  },
  team_size: {
    type: Number,
    required: true,
    min: 1
  },
  mode: {
    type: String,
    enum: ['player_pool', 'teams'],
    required: true
  },
  state: {
    type: String,
    enum: ['draft', 'open', 'full', 'in_progress', 'finished', 'canceled'],
    default: 'draft'
  },
  visibility: {
    type: String,
    default: 'public'
  },
  current_players: {
    type: Number,
    default: 0
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

// Indexes for performance
matchSchema.index({ state: 1 });
matchSchema.index({ created_by: 1 });
matchSchema.index({ starts_at: 1 });

module.exports = mongoose.model('MSMatch', matchSchema, 'ms_matches');
