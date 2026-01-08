const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Link to conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Sender
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },

  // Message type
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'notification'],
    default: 'text'
  },

  // Attachments
  attachments: [{
    type: String, // URL or file path
    url: String,
    filename: String,
    mimeType: String,
    size: Number
  }],

  // Read by recipients
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: Date
  }],

  // Is deleted
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,

  // Edit history
  isEdited: {
    type: Boolean,
    default: false
  },

  editedAt: Date,
  editHistory: [{
    content: String,
    editedAt: Date
  }],

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
  collection: 'messages'
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ 'readBy.userId': 1 });

// Methods
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.find(r => r.userId.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
  }
  return this.save();
};

messageSchema.methods.edit = function(newContent) {
  this.editHistory = this.editHistory || [];
  this.editHistory.push({
    content: this.content,
    editedAt: this.updatedAt
  });
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);
