const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  ageGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup',
    required: true
  },
  ageGroupName: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  opponent: {
    type: String,
    required: true
  },
  opponentAr: String,
  opponentLogo: String,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  locationAr: String,
  homeAway: {
    type: String,
    enum: ['home', 'away', 'neutral'],
    default: 'home'
  },
  competition: {
    type: String,
    default: 'friendly'
  },
  competitionAr: String,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  result: {
    our: {
      type: Number,
      default: 0
    },
    opponent: {
      type: Number,
      default: 0
    }
  },
  lineup: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    playerName: String,
    position: String,
    number: Number,
    starter: {
      type: Boolean,
      default: false
    }
  }],
  events: [{
    type: {
      type: String,
      enum: ['goal', 'assist', 'yellow_card', 'red_card', 'substitution', 'injury']
    },
    playerId: mongoose.Schema.Types.ObjectId,
    playerName: String,
    minute: Number,
    notes: String
  }],
  notes: String,
  notesAr: String,
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

matchSchema.index({ ageGroupId: 1, date: 1 });
matchSchema.index({ clubId: 1, status: 1 });

module.exports = mongoose.model('Match', matchSchema);
