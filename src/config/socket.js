const jwt = require('jsonwebtoken');
const User = require('../modules/shared/models/User');

// Store online users
const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Get user - use userId from the JWT payload
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isVerified) {
        return next(new Error('Authentication error: Email not verified'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    console.log(`✅ User connected: ${socket.user.firstName} (${userId})`);

    // Join user to their personal room
    socket.join(userId);

    // Add to online users
    onlineUsers.set(userId, socket.id);

    // Emit online status to all users
    io.emit('user_online', {
      userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      profileImage: socket.user.profileImage
    });

    // ===================================
    // TYPING INDICATORS
    // ===================================

    socket.on('typing_start', async ({ conversationId }) => {
      try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId
        });

        if (conversation) {
          // Emit to other participants
          conversation.participants.forEach(p => {
            if (p.userId.toString() !== userId) {
              io.to(p.userId.toString()).emit('user_typing', {
                conversationId,
                userId,
                firstName: socket.user.firstName
              });
            }
          });
        }
      } catch (error) {
        console.error('Error in typing_start:', error);
      }
    });

    socket.on('typing_stop', async ({ conversationId }) => {
      try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId
        });

        if (conversation) {
          // Emit to other participants
          conversation.participants.forEach(p => {
            if (p.userId.toString() !== userId) {
              io.to(p.userId.toString()).emit('user_stopped_typing', {
                conversationId,
                userId
              });
            }
          });
        }
      } catch (error) {
        console.error('Error in typing_stop:', error);
      }
    });

    // ===================================
    // ONLINE STATUS CHECK
    // ===================================

    socket.on('check_online_status', ({ userIds }) => {
      const onlineStatuses = {};
      userIds.forEach(id => {
        onlineStatuses[id] = onlineUsers.has(id);
      });

      socket.emit('online_statuses', onlineStatuses);
    });

    // ===================================
    // JOIN CONVERSATION ROOM
    // ===================================

    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId
        });

        if (conversation) {
          socket.join(`conversation_${conversationId}`);
          console.log(`User ${userId} joined conversation ${conversationId}`);

          // Notify others in conversation
          socket.to(`conversation_${conversationId}`).emit('user_joined_conversation', {
            conversationId,
            userId,
            firstName: socket.user.firstName
          });
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);

      // Notify others
      socket.to(`conversation_${conversationId}`).emit('user_left_conversation', {
        conversationId,
        userId
      });
    });

    // ===================================
    // VOICE/VIDEO CALL SIGNALING
    // ===================================

    socket.on('call_user', async ({ conversationId, targetUserId, signalData, callType }) => {
      io.to(targetUserId).emit('incoming_call', {
        conversationId,
        from: userId,
        fromUser: {
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          profileImage: socket.user.profileImage
        },
        signalData,
        callType // 'voice' or 'video'
      });
    });

    socket.on('answer_call', ({ to, signalData }) => {
      io.to(to).emit('call_answered', {
        from: userId,
        signalData
      });
    });

    socket.on('reject_call', ({ to }) => {
      io.to(to).emit('call_rejected', {
        from: userId
      });
    });

    socket.on('end_call', ({ to }) => {
      io.to(to).emit('call_ended', {
        from: userId
      });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('ice_candidate', {
        from: userId,
        candidate
      });
    });

    // ===================================
    // DISCONNECT
    // ===================================

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.firstName} (${userId})`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Emit offline status
      io.emit('user_offline', {
        userId,
        lastSeen: new Date()
      });

      // Update user's last seen
      User.findByIdAndUpdate(userId, {
        lastSeen: new Date()
      }).catch(err => console.error('Error updating last seen:', err));
    });

    // ===================================
    // ERROR HANDLING
    // ===================================

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Return helper function to get online users
  return {
    getOnlineUsers: () => Array.from(onlineUsers.keys()),
    isUserOnline: (userId) => onlineUsers.has(userId),
    getSocketId: (userId) => onlineUsers.get(userId)
  };
};
