const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true
  },
  titleAr: {
    type: String,
    trim: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['board', 'team', 'one-on-one', 'training', 'review', 'external'],
    default: 'team'
  },
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
    default: 60
  },
  location: String,
  locationAr: String,
  isOnline: {
    type: Boolean,
    default: false
  },
  meetingLink: String,
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    role: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'tentative'],
      default: 'pending'
    },
    responseDate: Date,
    notes: String
  }],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  organizerName: String,
  agenda: String,
  agendaAr: String,
  agendaItems: [{
    topic: String,
    topicAr: String,
    duration: Number,
    presenter: String
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  notes: String,
  notesAr: String,
  minutes: String,
  minutesAr: String,
  actionItems: [{
    description: String,
    descriptionAr: String,
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assigneeName: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  reminderSent: {
    type: Boolean,
    default: false
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

meetingSchema.index({ clubId: 1, date: 1 });
meetingSchema.index({ organizer: 1, status: 1 });
meetingSchema.index({ 'attendees.userId': 1, date: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
