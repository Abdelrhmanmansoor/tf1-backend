const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../modules/shared/models/User');
// const Notification = require('../modules/shared/models/Notification'); // TODO: Create Notification model

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

// Get all conversations for authenticated user
exports.getConversations = async (req, res) => {
  try {
    const { archived = false, page = 1, limit = 20 } = req.query;

    const result = await Conversation.getUserConversations(req.user._id, {
      archived: archived === 'true',
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Add unread count for each conversation
    const conversationsWithUnread = result.conversations.map(conv => {
      const unreadCount = conv.unreadCounts.get(req.user._id.toString()) || 0;

      return {
        ...conv.toObject(),
        unreadCount,
        // Remove other users' unread counts for privacy
        unreadCounts: undefined
      };
    });

    res.json({
      success: true,
      conversations: conversationsWithUnread,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

// Get conversation by ID
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    })
      .populate('participants.userId', 'firstName lastName avatar role')
      .populate('lastMessage.senderId', 'firstName lastName avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const unreadCount = conversation.unreadCounts.get(req.user._id.toString()) || 0;

    res.json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        unreadCount,
        unreadCounts: undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

// Create new conversation (direct or group)
exports.createConversation = async (req, res) => {
  try {
    const { type, participantIds, participantRoles, name, nameAr } = req.body;

    if (type === 'direct') {
      // Direct conversation: must have exactly 2 participants
      if (!participantIds || participantIds.length !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Direct conversation requires exactly one other participant'
        });
      }

      const otherUserId = participantIds[0];

      // Get other user's role if not provided
      let otherUserRole = participantRoles ? participantRoles[0] : null;
      if (!otherUserRole) {
        const User = require('../modules/shared/models/User');
        const otherUser = await User.findById(otherUserId).select('role');
        if (!otherUser) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        otherUserRole = otherUser.role;
      }

      // Check if conversation already exists
      let conversation = await Conversation.findOrCreateDirectConversation(
        req.user._id,
        otherUserId,
        req.user.role,
        otherUserRole
      );

      await conversation.populate('participants.userId', 'firstName lastName avatar role');

      return res.status(201).json({
        success: true,
        message: 'Conversation ready',
        conversation
      });
    } else if (type === 'group') {
      // Group conversation
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      if (!participantIds || participantIds.length < 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one other participant is required'
        });
      }

      // Build participants array
      const participants = [
        {
          userId: req.user._id,
          role: req.user.role,
          joinedAt: new Date(),
          isActive: true,
          lastReadAt: new Date(),
          isMuted: false
        }
      ];

      // If participantRoles not provided, fetch roles from User model
      let roles = participantRoles;
      if (!roles || roles.length !== participantIds.length) {
        const User = require('../modules/shared/models/User');
        const users = await User.find({ _id: { $in: participantIds } }).select('_id role');
        roles = participantIds.map(userId => {
          const user = users.find(u => u._id.toString() === userId.toString());
          return user ? user.role : 'player'; // Default to 'player' if not found
        });
      }

      participantIds.forEach((userId, index) => {
        participants.push({
          userId,
          role: roles[index],
          joinedAt: new Date(),
          isActive: true,
          lastReadAt: new Date(),
          isMuted: false
        });
      });

      const conversation = await Conversation.create({
        type: 'group',
        name,
        nameAr,
        participants,
        createdBy: req.user._id,
        admins: [req.user._id]
      });

      await conversation.populate('participants.userId', 'firstName lastName avatar role');

      // Create system message
      await Message.createSystemMessage(
        conversation._id,
        'group_created',
        `${req.user.firstName} created the group`
      );

      // Emit Socket.io event to all participants
      const io = req.app.get('io');
      participants.forEach(p => {
        if (p.userId.toString() !== req.user._id.toString()) {
          io.to(p.userId.toString()).emit('new_conversation', conversation);
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Group conversation created',
        conversation
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation type'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message
    });
  }
};

// Update conversation (name, avatar for group chats)
exports.updateConversation = async (req, res) => {
  try {
    const { name, nameAr, avatar } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only update group conversations'
      });
    }

    // Check if user is admin
    if (!conversation.admins.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group details'
      });
    }

    if (name) conversation.name = name;
    if (nameAr) conversation.nameAr = nameAr;
    if (avatar) conversation.avatar = avatar;

    await conversation.save();

    // Create system message
    await Message.createSystemMessage(
      conversation._id,
      'group_updated',
      `${req.user.firstName} updated the group details`
    );

    // Emit Socket.io event
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('conversation_updated', conversation);
    });

    res.json({
      success: true,
      message: 'Conversation updated',
      conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating conversation',
      error: error.message
    });
  }
};

// Delete/leave conversation
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (conversation.type === 'direct') {
      // For direct conversations, just soft delete
      await conversation.softDelete();
    } else {
      // For group conversations, remove user from participants
      await conversation.removeParticipant(req.user._id, req.user._id);

      // Create system message
      await Message.createSystemMessage(
        conversation._id,
        'user_left',
        `${req.user.firstName} left the group`
      );

      // Emit Socket.io event
      const io = req.app.get('io');
      conversation.participants.forEach(p => {
        io.to(p.userId.toString()).emit('participant_left', {
          conversationId: conversation._id,
          userId: req.user._id
        });
      });
    }

    res.json({
      success: true,
      message: 'Left conversation successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error leaving conversation',
      error: error.message
    });
  }
};

// Mute/unmute conversation
exports.toggleMute = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.toggleMute(req.user._id);

    const participant = conversation.participants.find(p => p.userId.toString() === req.user._id.toString());

    res.json({
      success: true,
      message: participant.isMuted ? 'Conversation muted' : 'Conversation unmuted',
      isMuted: participant.isMuted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling mute',
      error: error.message
    });
  }
};

// Archive conversation
exports.archiveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.archive();

    res.json({
      success: true,
      message: 'Conversation archived'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error archiving conversation',
      error: error.message
    });
  }
};

// Unarchive conversation
exports.unarchiveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.unarchive();

    res.json({
      success: true,
      message: 'Conversation unarchived'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unarchiving conversation',
      error: error.message
    });
  }
};

// Add participant to group
exports.addParticipant = async (req, res) => {
  try {
    const { userId, role } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false,
      type: 'group'
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    await conversation.addParticipant(userId, role, req.user._id);

    // Create system message
    const addedUser = await User.findById(userId);
    await Message.createSystemMessage(
      conversation._id,
      'participant_added',
      `${req.user.firstName} added ${addedUser.firstName} to the group`
    );

    await conversation.populate('participants.userId', 'firstName lastName avatar role');

    // Emit Socket.io event
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('participant_added', {
        conversationId: conversation._id,
        participant: {
          userId: addedUser._id,
          firstName: addedUser.firstName,
          lastName: addedUser.lastName,
          avatar: addedUser.avatar,
          role: addedUser.role
        }
      });
    });

    res.json({
      success: true,
      message: 'Participant added',
      conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding participant',
      error: error.message
    });
  }
};

// Remove participant from group
exports.removeParticipant = async (req, res) => {
  try {
    const { userId } = req.params;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false,
      type: 'group'
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Group conversation not found'
      });
    }

    const removedUser = await User.findById(userId);
    await conversation.removeParticipant(userId, req.user._id);

    // Create system message
    await Message.createSystemMessage(
      conversation._id,
      'participant_removed',
      `${req.user.firstName} removed ${removedUser.firstName} from the group`
    );

    // Emit Socket.io event
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('participant_removed', {
        conversationId: conversation._id,
        userId
      });
    });

    // Notify removed user
    io.to(userId).emit('removed_from_group', {
      conversationId: conversation._id
    });

    res.json({
      success: true,
      message: 'Participant removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing participant',
      error: error.message
    });
  }
};

// ============================================
// MESSAGE MANAGEMENT
// ============================================

// Get messages in a conversation
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50, before } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const result = await Message.getConversationMessages(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      before
    });

    res.json({
      success: true,
      messages: result.messages,
      total: result.total,
      page: result.page,
      hasMore: result.hasMore
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { content, contentAr, messageType = 'text', attachments, replyTo } = req.body;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Create message
    const message = await Message.create({
      conversationId: req.params.id,
      senderId: req.user._id,
      senderRole: req.user.role,
      messageType,
      content,
      contentAr,
      attachments: attachments || [],
      replyTo,
      sentAt: new Date()
    });

    await message.populate('senderId', 'firstName lastName avatar role');

    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'content senderId sentAt',
        populate: {
          path: 'senderId',
          select: 'firstName lastName avatar'
        }
      });
    }

    // Update conversation's last message
    await conversation.updateLastMessage(message);

    // Increment unread count for other participants
    await conversation.incrementUnreadCount(req.user._id);

    // Emit Socket.io event to all participants (real-time)
    const io = req.app.get('io');
    conversation.participants.forEach(participant => {
      if (participant.userId.toString() !== req.user._id.toString()) {
        io.to(participant.userId.toString()).emit('newMessage', {
          conversationId: conversation._id,
          data: message
        });

        // Check if participant has muted this conversation
        if (!participant.isMuted) {
          // TODO: Create notification when Notification model is implemented
          /*
          Notification.create({
            userId: participant.userId,
            userRole: participant.role,
            type: 'message_received',
            title: `New message from ${req.user.firstName}`,
            titleAr: `رسالة جديدة من ${req.user.firstName}`,
            message: content.substring(0, 100),
            messageAr: contentAr ? contentAr.substring(0, 100) : content.substring(0, 100),
            relatedTo: {
              entityType: 'conversation',
              entityId: conversation._id
            },
            actionUrl: `/messages/${conversation._id}`,
            priority: 'normal'
          }).catch(err => console.error('Error creating notification:', err));
          */
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findOne({
      _id: req.params.messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.editMessage(content, req.user._id);

    // Emit Socket.io event
    const conversation = await Conversation.findById(message.conversationId);
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('message_edited', {
        conversationId: message.conversationId,
        messageId: message._id,
        newContent: content,
        isEdited: true
      });
    });

    res.json({
      success: true,
      message: 'Message updated',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error editing message',
      error: error.message
    });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.softDelete(req.user._id);

    // Emit Socket.io event
    const conversation = await Conversation.findById(message.conversationId);
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('message_deleted', {
        conversationId: message.conversationId,
        messageId: message._id
      });
    });

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting message',
      error: error.message
    });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findOne({
      _id: req.params.messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant of the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      'participants.userId': req.user._id
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await message.addReaction(req.user._id, emoji);

    // Emit Socket.io event
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('message_reaction', {
        conversationId: message.conversationId,
        messageId: message._id,
        userId: req.user._id,
        emoji,
        reactions: message.reactions
      });
    });

    res.json({
      success: true,
      message: 'Reaction added',
      reactions: message.reactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding reaction',
      error: error.message
    });
  }
};

// Remove reaction from message
exports.removeReaction = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.removeReaction(req.user._id);

    // Emit Socket.io event
    const conversation = await Conversation.findById(message.conversationId);
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      io.to(p.userId.toString()).emit('message_reaction_removed', {
        conversationId: message.conversationId,
        messageId: message._id,
        userId: req.user._id,
        reactions: message.reactions
      });
    });

    res.json({
      success: true,
      message: 'Reaction removed',
      reactions: message.reactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing reaction',
      error: error.message
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.userId': req.user._id,
      isDeleted: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark conversation as read
    await conversation.markAsRead(req.user._id);

    // Mark all unread messages as read
    const messages = await Message.find({
      conversationId: req.params.id,
      isDeleted: false,
      senderId: { $ne: req.user._id }
    });

    for (const message of messages) {
      if (!message.isReadBy(req.user._id)) {
        await message.markAsRead(req.user._id);
      }
    }

    // Emit Socket.io event to sender
    const io = req.app.get('io');
    conversation.participants.forEach(p => {
      if (p.userId.toString() !== req.user._id.toString()) {
        io.to(p.userId.toString()).emit('messages_read', {
          conversationId: conversation._id,
          readBy: req.user._id,
          readAt: new Date()
        });
      }
    });

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking as read',
      error: error.message
    });
  }
};

// Get unread count across all conversations
exports.getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.userId': req.user._id,
      isDeleted: false,
      isArchived: false
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
      const unread = conv.unreadCounts.get(req.user._id.toString()) || 0;
      totalUnread += unread;
    });

    res.json({
      success: true,
      unreadCount: totalUnread
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
};

module.exports = exports;
