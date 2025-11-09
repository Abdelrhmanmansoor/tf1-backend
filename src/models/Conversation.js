const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true,
    default: 'direct'
  },

  // Participants
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['player', 'coach', 'club', 'specialist'],
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      isActive: {
        type: Boolean,
        default: true
      },
      lastReadAt: {
        type: Date,
        default: Date.now
      },
      isMuted: {
        type: Boolean,
        default: false
      }
    }
  ],

  // Group chat specific fields
  name: {
    type: String,
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  avatar: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Last message preview
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: Date,
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'system']
    }
  },

  // Unread counts per participant
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },

  // Related entities (optional links)
  relatedTo: {
    entityType: {
      type: String,
      enum: ['training_session', 'consultation', 'job', 'club', 'training_request']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },

  isArchived: {
    type: Boolean,
    default: false
  },

  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });
conversationSchema.index({ isDeleted: 1, isArchived: 1 });

// Virtual for message count (can be populated)
conversationSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversationId',
  count: true
});

// Statics

// Find or create a direct conversation between two users
conversationSchema.statics.findOrCreateDirectConversation = async function(user1Id, user2Id, user1Role, user2Role) {
  // Check if conversation already exists
  let conversation = await this.findOne({
    type: 'direct',
    isDeleted: false,
    'participants.userId': { $all: [user1Id, user2Id] },
    'participants': { $size: 2 }
  });

  if (!conversation) {
    // Create new conversation
    conversation = await this.create({
      type: 'direct',
      participants: [
        {
          userId: user1Id,
          role: user1Role,
          isActive: true,
          lastReadAt: new Date()
        },
        {
          userId: user2Id,
          role: user2Role,
          isActive: true,
          lastReadAt: new Date()
        }
      ]
    });
  }

  return conversation;
};

// Get conversations for a user
conversationSchema.statics.getUserConversations = async function(userId, options = {}) {
  const { archived = false, page = 1, limit = 20 } = options;

  const query = {
    'participants.userId': userId,
    isDeleted: false,
    isArchived: archived
  };

  const conversations = await this.find(query)
    .populate('participants.userId', 'firstName lastName profileImage')
    .populate('lastMessage.senderId', 'firstName lastName profileImage')
    .sort({ 'lastMessage.sentAt': -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    conversations,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Methods

// Update last message
conversationSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    content: message.content,
    senderId: message.senderId,
    sentAt: message.sentAt,
    messageType: message.messageType
  };

  return this.save();
};

// Increment unread count for participants (except sender)
conversationSchema.methods.incrementUnreadCount = function(senderId) {
  this.participants.forEach(participant => {
    if (participant.userId.toString() !== senderId.toString()) {
      const currentCount = this.unreadCounts.get(participant.userId.toString()) || 0;
      this.unreadCounts.set(participant.userId.toString(), currentCount + 1);
    }
  });

  return this.save();
};

// Mark as read for a user
conversationSchema.methods.markAsRead = function(userId) {
  this.unreadCounts.set(userId.toString(), 0);

  // Update lastReadAt for participant
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
  }

  return this.save();
};

// Add participant (for group chats)
conversationSchema.methods.addParticipant = function(userId, role, addedBy) {
  if (this.type !== 'group') {
    throw new Error('Can only add participants to group conversations');
  }

  // Check if user is admin
  if (!this.admins.includes(addedBy)) {
    throw new Error('Only admins can add participants');
  }

  // Check if already a participant
  const exists = this.participants.some(p => p.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('User is already a participant');
  }

  this.participants.push({
    userId,
    role,
    joinedAt: new Date(),
    isActive: true,
    lastReadAt: new Date(),
    isMuted: false
  });

  this.unreadCounts.set(userId.toString(), 0);

  return this.save();
};

// Remove participant (for group chats)
conversationSchema.methods.removeParticipant = function(userId, removedBy) {
  if (this.type !== 'group') {
    throw new Error('Can only remove participants from group conversations');
  }

  // Check if user is admin or removing themselves
  if (!this.admins.includes(removedBy) && removedBy.toString() !== userId.toString()) {
    throw new Error('Only admins can remove participants');
  }

  this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
  this.unreadCounts.delete(userId.toString());

  return this.save();
};

// Toggle mute
conversationSchema.methods.toggleMute = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.isMuted = !participant.isMuted;
  }

  return this.save();
};

// Archive conversation
conversationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Unarchive conversation
conversationSchema.methods.unarchive = function() {
  this.isArchived = false;
  return this.save();
};

// Soft delete
conversationSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
