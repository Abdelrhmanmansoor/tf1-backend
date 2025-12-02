const mongoose = require('mongoose');

const initiativeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Initiative title is required'],
    trim: true
  },
  titleAr: {
    type: String,
    trim: true
  },
  description: String,
  descriptionAr: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    enum: ['digital', 'infrastructure', 'talent', 'community', 'marketing', 'operations'],
    default: 'operations'
  },
  status: {
    type: String,
    enum: ['planning', 'in-progress', 'completed', 'on-hold', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  startDate: Date,
  deadline: Date,
  completedDate: Date,
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ownerName: String,
  team: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: String
  }],
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  milestones: [{
    title: String,
    titleAr: String,
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date
  }],
  risks: [{
    description: String,
    descriptionAr: String,
    severity: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    mitigation: String
  }],
  outcomes: [String],
  outcomesAr: [String],
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

initiativeSchema.index({ clubId: 1, status: 1 });
initiativeSchema.index({ priority: 1, deadline: 1 });

module.exports = mongoose.model('Initiative', initiativeSchema);
