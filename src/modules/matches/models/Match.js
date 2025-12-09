const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  sport: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  max_players: {
    type: Number,
    required: true,
    min: 2
  },
  current_players: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'full', 'finished'],
    default: 'open'
  },
  // Legacy fields for backward compatibility
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser'
  },
  starts_at: {
    type: Date
  },
  venue: {
    type: String,
    trim: true
  },
  team_size: {
    type: Number,
    min: 1
  },
  mode: {
    type: String,
    enum: ['player_pool', 'teams']
  },
  state: {
    type: String,
    enum: ['draft', 'open', 'full', 'in_progress', 'finished', 'canceled']
  },
  visibility: {
    type: String
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
matchSchema.index({ status: 1 });
matchSchema.index({ owner_id: 1 });
matchSchema.index({ created_by: 1 });
matchSchema.index({ date: 1 });
matchSchema.index({ sport: 1 });
matchSchema.index({ city: 1 });
matchSchema.index({ level: 1 });

module.exports = mongoose.model('MSMatch', matchSchema, 'ms_matches');
