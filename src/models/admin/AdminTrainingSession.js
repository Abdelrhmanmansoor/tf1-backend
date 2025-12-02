const mongoose = require('mongoose');

const adminTrainingSessionSchema = new mongoose.Schema({
  ageGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleAr: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  descriptionAr: {
    type: String,
    trim: true
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['technical', 'tactical', 'physical', 'mental', 'recovery', 'match-prep'],
    default: 'technical'
  },
  objectives: [{
    type: String,
    trim: true
  }],
  equipment: [{
    type: String,
    trim: true
  }],
  attendance: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present'
    },
    notes: String
  }],
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

adminTrainingSessionSchema.index({ ageGroup: 1, date: 1 });
adminTrainingSessionSchema.index({ coach: 1 });
adminTrainingSessionSchema.index({ club: 1 });

module.exports = mongoose.model('AdminTrainingSession', adminTrainingSessionSchema);
