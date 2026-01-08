const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Job application related
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    unique: true,
    index: true
  },

  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },

  // Participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['publisher', 'applicant'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Conversation metadata
  subject: {
    type: String,
    required: true,
    trim: true
  },

  description: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
    index: true
  },

  // Last message
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    sentAt: Date
  },

  lastMessageAt: {
    type: Date,
    index: true
  },

  // Unread message counts per participant
  unreadCounts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }],

  // Tags for organization
  tags: [String],

  // Interview details (if applicable)
  interviewDetails: {
    scheduledDate: Date,
    scheduledTime: String,
    location: String,
    meetingLink: String,
    interviewStatus: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: null
    }
  },

  // Application status updates
  statusHistory: [{
    status: String,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.ObjectId
  }],

  // Archival info
  archivedAt: Date,
  archivedBy: mongoose.Schema.Types.ObjectId,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'conversations'
});

// Indexes
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ applicationId: 1, status: 1 });
// Removed duplicate index on jobId to avoid Mongoose warning
conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ lastMessageAt: -1 });

// Methods
conversationSchema.methods.addParticipant = function(userId, role) {
  const exists = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!exists) {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date()
    });
  }
  return this.save();
};

conversationSchema.methods.updateLastMessage = function(content, senderId) {
  this.lastMessage = {
    content,
    senderId,
    sentAt: new Date()
  };
  this.lastMessageAt = new Date();
  return this.save();
};

conversationSchema.methods.markAsRead = function(userId) {
  const unreadEntry = this.unreadCounts.find(u => u.userId.toString() === userId.toString());
  if (unreadEntry) {
    unreadEntry.unreadCount = 0;
  } else {
    this.unreadCounts.push({
      userId,
      unreadCount: 0
    });
  }
  return this.save();
};

conversationSchema.methods.incrementUnread = function(userId) {
  let unreadEntry = this.unreadCounts.find(u => u.userId.toString() === userId.toString());
  if (unreadEntry) {
    unreadEntry.unreadCount += 1;
  } else {
    this.unreadCounts.push({
      userId,
      unreadCount: 1
    });
  }
  return this.save();
};

conversationSchema.methods.archive = function(archivedBy) {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archivedBy = archivedBy;
  return this.save();
};

conversationSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

conversationSchema.statics.createConversation = async function(
  applicationId,
  jobId,
  publisherId,
  applicantId,
  subject
) {
  try {
    const conversation = new this({
      applicationId,
      jobId,
      subject,
      participants: [
        { userId: publisherId, role: 'publisher' },
        { userId: applicantId, role: 'applicant' }
      ]
    });

    await conversation.save();
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// Use a distinct model name to avoid conflict with existing global Conversation model
module.exports = mongoose.models.ApplicationConversation || mongoose.model('ApplicationConversation', conversationSchema);
