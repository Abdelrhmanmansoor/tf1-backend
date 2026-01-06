const jwt = require('jsonwebtoken');
const User = require('../modules/shared/models/User');
const logger = require('../utils/logger');

// Store online users
const onlineUsers = new Map(); // userId -> socketId

module.exports = io => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.warn('Socket.io authentication failed: Token not provided', {
          ip: socket.handshake.address,
        });
        return next(new Error('Authentication error: Token not provided'));
      }

      // Validate JWT secret is set
      if (!process.env.JWT_ACCESS_SECRET) {
        logger.error('JWT_ACCESS_SECRET is not configured');
        return next(new Error('Authentication error: Server configuration error'));
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          logger.warn('Socket.io authentication failed: Token expired', {
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: Token expired'));
        }
        if (jwtError.name === 'JsonWebTokenError') {
          logger.warn('Socket.io authentication failed: Invalid token', {
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication error: Invalid token'));
        }
        throw jwtError;
      }

      if (!decoded || !decoded.userId) {
        logger.warn('Socket.io authentication failed: Invalid token payload', {
          ip: socket.handshake.address,
        });
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Get user - use userId from the JWT payload
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        logger.warn('Socket.io authentication failed: User not found', {
          userId: decoded.userId,
          ip: socket.handshake.address,
        });
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isVerified) {
        logger.warn('Socket.io authentication failed: Email not verified', {
          userId: user._id,
          ip: socket.handshake.address,
        });
        return next(new Error('Authentication error: Email not verified'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket.io authentication error', {
        error: error.message,
        stack: error.stack,
        ip: socket.handshake.address,
      });
      next(new Error('Authentication error: Internal server error'));
    }
  });

  io.on('connection', socket => {
    const userId = socket.user._id.toString();

    logger.info(`User connected via Socket.io`, {
      userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      role: socket.user.role,
    });

    // Join user to their personal room
    socket.join(userId);

    // Add to online users
    onlineUsers.set(userId, socket.id);

    // Emit online status to all users
    io.emit('user_online', {
      userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      profileImage: socket.user.profileImage,
    });

    // ===================================
    // TYPING INDICATORS
    // ===================================

    socket.on('typing_start', async ({ conversationId }) => {
      try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId,
        });

        if (conversation) {
          // Emit to other participants
          conversation.participants.forEach(p => {
            if (p.userId.toString() !== userId) {
              io.to(p.userId.toString()).emit('user_typing', {
                conversationId,
                userId,
                firstName: socket.user.firstName,
              });
            }
          });
        }
      } catch (error) {
        logger.error('Error in typing_start event', {
          error: error.message,
          userId,
          conversationId,
        });
      }
    });

    socket.on('typing_stop', async ({ conversationId }) => {
      try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.userId': userId,
        });

        if (conversation) {
          // Emit to other participants
          conversation.participants.forEach(p => {
            if (p.userId.toString() !== userId) {
              io.to(p.userId.toString()).emit('user_stopped_typing', {
                conversationId,
                userId,
              });
            }
          });
        }
      } catch (error) {
        logger.error('Error in typing_stop event', {
          error: error.message,
          userId,
          conversationId,
        });
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
          'participants.userId': userId,
        });

        if (conversation) {
          socket.join(`conversation_${conversationId}`);
          logger.debug(`User joined conversation`, {
            userId,
            conversationId,
          });

          // Notify others in conversation
          socket
            .to(`conversation_${conversationId}`)
            .emit('user_joined_conversation', {
              conversationId,
              userId,
              firstName: socket.user.firstName,
            });
        }
      } catch (error) {
        logger.error('Error joining conversation', {
          error: error.message,
          userId,
          conversationId,
        });
      }
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation_${conversationId}`);
      logger.debug(`User left conversation`, {
        userId,
        conversationId,
      });

      // Notify others
      socket
        .to(`conversation_${conversationId}`)
        .emit('user_left_conversation', {
          conversationId,
          userId,
        });
    });

    // ===================================
    // VOICE/VIDEO CALL SIGNALING
    // ===================================

    socket.on(
      'call_user',
      async ({ conversationId, targetUserId, signalData, callType }) => {
        io.to(targetUserId).emit('incoming_call', {
          conversationId,
          from: userId,
          fromUser: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            profileImage: socket.user.profileImage,
          },
          signalData,
          callType, // 'voice' or 'video'
        });
      }
    );

    socket.on('answer_call', ({ to, signalData }) => {
      io.to(to).emit('call_answered', {
        from: userId,
        signalData,
      });
    });

    socket.on('reject_call', ({ to }) => {
      io.to(to).emit('call_rejected', {
        from: userId,
      });
    });

    socket.on('end_call', ({ to }) => {
      io.to(to).emit('call_ended', {
        from: userId,
      });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('ice_candidate', {
        from: userId,
        candidate,
      });
    });

    // ===================================
    // JOB EVENTS (LIVE UPDATES)
    // ===================================

    socket.on('subscribe_job_events', () => {
      socket.join('job_events_channel');
      logger.debug('User subscribed to job events', {
        userId,
        firstName: socket.user.firstName,
      });
    });

    socket.on('unsubscribe_job_events', () => {
      socket.leave('job_events_channel');
      logger.debug('User unsubscribed from job events', {
        userId,
        firstName: socket.user.firstName,
      });
    });

    // ===================================
    // DISCONNECT
    // ===================================

    socket.on('disconnect', () => {
      logger.info('User disconnected from Socket.io', {
        userId,
        firstName: socket.user?.firstName,
        lastName: socket.user?.lastName,
      });

      // Remove from online users
      onlineUsers.delete(userId);

      // Emit offline status
      io.emit('user_offline', {
        userId,
        lastSeen: new Date(),
      });

      // Update user's last seen
      User.findByIdAndUpdate(userId, {
        lastSeen: new Date(),
      }).catch(err => {
        logger.error('Error updating last seen on disconnect', {
          error: err.message,
          userId,
        });
      });
    });

    // ===================================
    // ERROR HANDLING
    // ===================================

    socket.on('error', error => {
      logger.error('Socket.io error', {
        error: error.message,
        stack: error.stack,
        userId,
      });
    });
  });

  // Return helper functions
  return {
    getOnlineUsers: () => Array.from(onlineUsers.keys()),
    isUserOnline: userId => onlineUsers.has(userId),
    getSocketId: userId => onlineUsers.get(userId),
    getIO: () => io,
    emitJobEvent: (eventType, event) => {
      io.to('job_events_channel').emit('job_event', {
        type: eventType,
        data: event,
        timestamp: new Date()
      });
    }
  };
};
