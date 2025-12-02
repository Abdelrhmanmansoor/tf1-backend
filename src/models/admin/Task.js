const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
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
  type: {
    type: String,
    enum: ['general', 'follow-up', 'meeting-prep', 'document', 'communication', 'scheduling'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: String,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedByName: String,
  dueDate: Date,
  dueTime: String,
  completedAt: Date,
  estimatedHours: Number,
  actualHours: Number,
  relatedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },
  relatedDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  relatedInitiativeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Initiative'
  },
  subtasks: [{
    title: String,
    titleAr: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reminders: [{
    date: Date,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    endDate: Date
  },
  tags: [String],
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

taskSchema.index({ clubId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
