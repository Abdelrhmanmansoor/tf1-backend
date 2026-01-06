const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  logo_url: {
    type: String,
    default: null
  },
  captain_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
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

// Index for performance
teamSchema.index({ name: 1 }, { unique: true }); // Unique index on name
teamSchema.index({ captain_id: 1 });
teamSchema.index({ created_by: 1 });

module.exports = mongoose.model('MSTeam', teamSchema, 'ms_teams');
