const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Program name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['training', 'competition', 'development', 'rehabilitation', 'fitness'],
    default: 'training'
  },
  description: String,
  descriptionAr: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  participants: {
    type: Number,
    default: 0
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  coaches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ageGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup'
  }],
  objectives: [String],
  objectivesAr: [String],
  schedule: [{
    day: String,
    time: String,
    activity: String,
    activityAr: String
  }],
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
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

programSchema.index({ clubId: 1, status: 1 });
programSchema.index({ type: 1, startDate: 1 });

module.exports = mongoose.model('Program', programSchema);
