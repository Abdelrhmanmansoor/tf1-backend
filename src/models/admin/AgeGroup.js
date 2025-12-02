const mongoose = require('mongoose');

const ageGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Age group name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  ageRange: {
    min: {
      type: Number,
      required: true,
      min: 4,
      max: 25
    },
    max: {
      type: Number,
      required: true,
      min: 4,
      max: 30
    }
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coachName: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  playersCount: {
    type: Number,
    default: 0
  },
  maxPlayers: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  sport: {
    type: String,
    default: 'football'
  },
  trainingSchedule: [{
    day: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    time: String,
    duration: {
      type: Number,
      default: 90
    },
    location: String
  }],
  description: String,
  descriptionAr: String,
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

ageGroupSchema.index({ clubId: 1, status: 1 });
ageGroupSchema.index({ coachId: 1 });

module.exports = mongoose.model('AgeGroup', ageGroupSchema);
