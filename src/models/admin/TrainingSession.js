const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema({
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
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coachName: String,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 90
  },
  location: {
    type: String,
    required: true
  },
  locationAr: String,
  type: {
    type: String,
    enum: ['regular', 'special', 'fitness', 'tactical', 'recovery'],
    default: 'regular'
  },
  objectives: [String],
  objectivesAr: [String],
  attendees: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    playerName: String,
    attended: {
      type: Boolean,
      default: false
    },
    notes: String
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: String,
  notesAr: String,
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

trainingSessionSchema.index({ ageGroupId: 1, date: 1 });
trainingSessionSchema.index({ clubId: 1, status: 1 });
trainingSessionSchema.index({ coachId: 1, date: 1 });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);
