const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  senderRole: {
    type: String,
    enum: ['player', 'coach', 'club', 'specialist'],
    required: true
  },

  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'audio', 'system'],
    default: 'text',
    required: true
  },

  // Content
  content: {
    type: String,
    trim: true
  },
  contentAr: {
    type: String,
    trim: true
  },

  // Attachments
  attachments: [
    {
      fileType: {
        type: String,
        enum: ['image', 'video', 'audio', 'document']
      },
      fileName: String,
      fileUrl: {
        type: String,
        required: true
      },
      fileSize: Number,
      mimeType: String,
      thumbnail: String // For videos
    }
  ],

  // Read tracking
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Reactions
  reactions: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Reply/thread
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Edit/delete
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [
    {
      content: String,
      editedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // System messages
  systemMessageType: {
    type: String,
    enum: ['user_joined', 'user_left', 'session_booked', 'payment_received', 'session_rescheduled', 'session_cancelled', 'group_created', 'participant_added', 'participant_removed']
  },

  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ conversationId: 1, isDeleted: 1, sentAt: -1 });

// Virtuals
messageSchema.virtual('replyToMessage', {
  ref: 'Message',
  localField: 'replyTo',
  foreignField: '_id',
  justOne: true
});

// Statics

// Get messages for a conversation
messageSchema.statics.getConversationMessages = async function(conversationId, options = {}) {
  const { page = 1, limit = 50, before } = options;

  const query = {
    conversationId,
    isDeleted: false
  };

  // Pagination: load messages before a certain timestamp (for infinite scroll)
  if (before) {
    query.sentAt = { $lt: new Date(before) };
  }

  const messages = await this.find(query)
    .populate('senderId', 'firstName lastName avatar role')
    .populate({
      path: 'replyTo',
      select: 'content senderId sentAt',
      populate: {
        path: 'senderId',
        select: 'firstName lastName avatar'
      }
    })
    .sort({ sentAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await this.countDocuments({ conversationId, isDeleted: false });

  return {
    messages: messages.reverse(), // Reverse to show oldest first
    total,
    page,
    hasMore: total > page * limit
  };
};

// Create system message
messageSchema.statics.createSystemMessage = async function(conversationId, systemMessageType, content) {
  const message = await this.create({
    conversationId,
    senderId: null,
    senderRole: 'system',
    messageType: 'system',
    systemMessageType,
    content,
    sentAt: new Date()
  });

  // Update conversation's last message
  const Conversation = mongoose.model('Conversation');
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      content,
      senderId: null,
      sentAt: message.sentAt,
      messageType: 'system'
    }
  });

  return message;
};

// Methods

// Mark as read by a user
messageSchema.methods.markAsRead = function(userId) {
  // Check if already read by this user
  const alreadyRead = this.readBy.some(r => r.userId.toString() === userId.toString());

  if (!alreadyRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
  }

  return this.save();
};

// Add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Check if user already reacted
  const existingReaction = this.reactions.find(r => r.userId.toString() === userId.toString());

  if (existingReaction) {
    // Update emoji if different
    if (existingReaction.emoji !== emoji) {
      existingReaction.emoji = emoji;
      existingReaction.createdAt = new Date();
    }
  } else {
    // Add new reaction
    this.reactions.push({
      userId,
      emoji,
      createdAt: new Date()
    });
  }

  return this.save();
};

// Remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
  return this.save();
};

// Edit message
messageSchema.methods.editMessage = function(newContent, userId) {
  // Only sender can edit
  if (this.senderId.toString() !== userId.toString()) {
    throw new Error('Only the sender can edit this message');
  }

  // Can only edit text messages
  if (this.messageType !== 'text') {
    throw new Error('Only text messages can be edited');
  }

  // Store edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });

  this.content = newContent;
  this.isEdited = true;

  return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function(userId) {
  // Only sender can delete
  if (this.senderId && this.senderId.toString() !== userId.toString()) {
    throw new Error('Only the sender can delete this message');
  }

  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.content = 'This message was deleted';

  return this.save();
};

// Check if message is read by a specific user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(r => r.userId.toString() === userId.toString());
};

// Pre-save hook to validate
messageSchema.pre('save', function(next) {
  // System messages don't need a senderId
  if (this.messageType === 'system') {
    this.senderId = null;
  }

  // Text messages must have content
  if (this.messageType === 'text' && !this.content && !this.isDeleted) {
    return next(new Error('Text messages must have content'));
  }

  // Attachment messages must have attachments
  if (['image', 'video', 'file', 'audio'].includes(this.messageType) && this.attachments.length === 0 && !this.isDeleted) {
    return next(new Error('Attachment messages must have attachments'));
  }

  next();
});

module.exports = mongoose.model('Message', messageSchema);
