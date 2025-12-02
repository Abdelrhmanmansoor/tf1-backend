const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true
  },
  titleAr: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required']
  },
  contentAr: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['general', 'urgent', 'event', 'policy', 'achievement'],
    default: 'general'
  },
  targetRoles: [{
    type: String,
    enum: ['all', 'player', 'coach', 'club', 'specialist', 'administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary']
  }],
  targetAgeGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup'
  }],
  priority: {
    type: String,
    enum: ['high', 'normal', 'low'],
    default: 'normal'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  image: String,
  views: {
    type: Number,
    default: 0
  },
  acknowledgements: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date
  }],
  requiresAcknowledgement: {
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

announcementSchema.index({ clubId: 1, status: 1 });
announcementSchema.index({ publishDate: -1, expiryDate: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
