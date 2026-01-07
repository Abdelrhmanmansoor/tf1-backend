const mongoose = require('mongoose');

/**
 * AgeCategoryAnnouncement Model
 * Manages announcements for age groups
 * Can be targeted to all players or specific players
 */
const ageCategoryAnnouncementSchema = new mongoose.Schema({
  // Age Group reference
  ageGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgeGroup',
    required: [true, 'Age group ID is required'],
    index: true
  },
  
  // Club reference
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Creator (supervisor/coach)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  titleAr: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: 2000
  },
  contentAr: {
    type: String,
    maxlength: 2000
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Type
  type: {
    type: String,
    enum: ['general', 'match', 'training', 'event', 'disciplinary', 'achievement', 'emergency'],
    default: 'general',
    index: true
  },
  
  // Target specific players (empty = all players in age group)
  targetPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Read tracking
  readBy: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Related references
  relatedMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  
  relatedTraining: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingSession'
  },
  
  // Attachments (URLs)
  attachments: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'link']
    },
    name: String
  }],
  
  // Scheduling
  publishAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  
  // Pin to top
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Require acknowledgment
  requireAcknowledgment: {
    type: Boolean,
    default: false
  },
  
  acknowledgments: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date
  }],
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
  
}, {
  timestamps: true
});

// Indexes
ageCategoryAnnouncementSchema.index({ ageGroupId: 1, createdAt: -1 });
ageCategoryAnnouncementSchema.index({ clubId: 1, createdAt: -1 });
ageCategoryAnnouncementSchema.index({ priority: 1, createdAt: -1 });
ageCategoryAnnouncementSchema.index({ status: 1, publishAt: 1 });
ageCategoryAnnouncementSchema.index({ expiresAt: 1 });

// Virtual for read count
ageCategoryAnnouncementSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for acknowledgment count
ageCategoryAnnouncementSchema.virtual('acknowledgmentCount').get(function() {
  return this.acknowledgments ? this.acknowledgments.length : 0;
});

// Virtual for isExpired
ageCategoryAnnouncementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Methods
ageCategoryAnnouncementSchema.methods.markAsRead = async function(playerId) {
  // Check if already read
  const alreadyRead = this.readBy.some(
    r => r.playerId.toString() === playerId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      playerId,
      readAt: new Date()
    });
    await this.save();
  }
  
  return this;
};

ageCategoryAnnouncementSchema.methods.acknowledge = async function(playerId) {
  // Check if already acknowledged
  const alreadyAcknowledged = this.acknowledgments.some(
    a => a.playerId.toString() === playerId.toString()
  );
  
  if (!alreadyAcknowledged) {
    this.acknowledgments.push({
      playerId,
      acknowledgedAt: new Date()
    });
    await this.save();
  }
  
  return this;
};

ageCategoryAnnouncementSchema.methods.isReadBy = function(playerId) {
  return this.readBy.some(
    r => r.playerId.toString() === playerId.toString()
  );
};

ageCategoryAnnouncementSchema.methods.isAcknowledgedBy = function(playerId) {
  return this.acknowledgments.some(
    a => a.playerId.toString() === playerId.toString()
  );
};

ageCategoryAnnouncementSchema.methods.archive = async function() {
  this.status = 'archived';
  return await this.save();
};

// Statics
ageCategoryAnnouncementSchema.statics.getPlayerAnnouncements = async function(
  playerId,
  ageGroupId,
  options = {}
) {
  const { includeRead = true, limit = 20, type } = options;
  
  const now = new Date();
  
  const query = {
    ageGroupId,
    status: 'published',
    publishAt: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ],
    $or: [
      { targetPlayers: { $size: 0 } },
      { targetPlayers: playerId }
    ],
    isDeleted: false
  };
  
  if (type) query.type = type;
  
  let announcements = await this.find(query)
    .populate('createdBy', 'firstName lastName avatar')
    .populate('relatedMatch', 'opponent date time')
    .populate('relatedTraining', 'date time location')
    .sort({ isPinned: -1, priority: -1, createdAt: -1 })
    .limit(limit);
  
  // Add read status
  announcements = announcements.map(announcement => {
    const obj = announcement.toObject();
    obj.read = announcement.isReadBy(playerId);
    obj.acknowledged = announcement.requireAcknowledgment 
      ? announcement.isAcknowledgedBy(playerId) 
      : null;
    return obj;
  });
  
  if (!includeRead) {
    announcements = announcements.filter(a => !a.read);
  }
  
  return announcements;
};

ageCategoryAnnouncementSchema.statics.getUnreadCount = async function(playerId, ageGroupId) {
  const now = new Date();
  
  const announcements = await this.find({
    ageGroupId,
    status: 'published',
    publishAt: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ],
    $or: [
      { targetPlayers: { $size: 0 } },
      { targetPlayers: playerId }
    ],
    isDeleted: false
  });
  
  return announcements.filter(a => !a.isReadBy(playerId)).length;
};

ageCategoryAnnouncementSchema.statics.broadcastToAgeGroup = async function(data) {
  const {
    ageGroupId,
    clubId,
    createdBy,
    title,
    titleAr,
    content,
    contentAr,
    priority = 'medium',
    type = 'general',
    targetPlayers = [],
    attachments = [],
    relatedMatch,
    relatedTraining,
    expiresAt,
    requireAcknowledgment = false,
    isPinned = false
  } = data;
  
  const announcement = await this.create({
    ageGroupId,
    clubId,
    createdBy,
    title,
    titleAr,
    content,
    contentAr,
    priority,
    type,
    targetPlayers,
    attachments,
    relatedMatch,
    relatedTraining,
    expiresAt,
    requireAcknowledgment,
    isPinned,
    status: 'published',
    publishAt: new Date()
  });
  
  // TODO: Send push notifications to players
  // await sendNotificationToPlayers(announcement);
  
  return announcement;
};

// Middleware: Clean up expired announcements (auto-archive)
ageCategoryAnnouncementSchema.pre('find', function() {
  // Optionally auto-archive expired announcements
  // This is commented out to avoid performance issues
  // You can run this as a scheduled job instead
});

module.exports = mongoose.model('AgeCategoryAnnouncement', ageCategoryAnnouncementSchema);

