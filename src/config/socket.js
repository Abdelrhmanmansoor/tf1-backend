const jwt = require('jsonwebtoken');
const User = require('../modules/shared/models/User');
const logger = require('../utils/logger');

// Store online users
const onlineUsers = new Map(); // userId -> socketId

module.exports = io => {
  // Authentication middleware for Socket.io
  // IMPORTANT: This only affects WebSocket connections, NOT REST API
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.debug('Socket.io: No token provided, allowing anonymous connection', {
          ip: socket.handshake.address,
        });
        // Allow connection but mark as unauthenticated
        socket.user = null;
        socket.isAuthenticated = false;
        return next();
      }

      // Validate JWT secret is set
      if (!process.env.JWT_ACCESS_SECRET) {
        logger.error('JWT_ACCESS_SECRET is not configured');
        socket.user = null;
        socket.isAuthenticated = false;
        return next(); // Allow connection anyway
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          logger.debug('Socket.io: Token expired, allowing connection as unauthenticated', {
            ip: socket.handshake.address,
          });
          socket.user = null;
          socket.isAuthenticated = false;
          return next(); // Allow connection but unauthenticated
        }
        if (jwtError.name === 'JsonWebTokenError') {
          logger.debug('Socket.io: Invalid token, allowing connection as unauthenticated', {
            ip: socket.handshake.address,
          });
          socket.user = null;
          socket.isAuthenticated = false;
          return next(); // Allow connection but unauthenticated
        }
        throw jwtError;
      }

      if (!decoded || !decoded.userId) {
        logger.debug('Socket.io: Invalid token payload, allowing as unauthenticated', {
          ip: socket.handshake.address,
        });
        socket.user = null;
        socket.isAuthenticated = false;
        return next();
      }

      // Get user - use userId from the JWT payload
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        logger.debug('Socket.io: User not found, allowing as unauthenticated', {
          userId: decoded.userId,
          ip: socket.handshake.address,
        });
        socket.user = null;
        socket.isAuthenticated = false;
        return next();
      }

      if (!user.isVerified) {
        logger.debug('Socket.io: Email not verified, allowing as unauthenticated', {
          userId: user._id,
          ip: socket.handshake.address,
        });
        socket.user = null;
        socket.isAuthenticated = false;
        return next();
      }

      // Attach user to socket as authenticated
      socket.user = user;
      socket.isAuthenticated = true;
      next();
    } catch (error) {
      logger.error('Socket.io authentication error', {
        error: error.message,
        stack: error.stack,
        ip: socket.handshake.address,
      });
      // Allow connection anyway as unauthenticated
      socket.user = null;
      socket.isAuthenticated = false;
      next();
    }
  });

  io.on('connection', socket => {
    // Handle both authenticated and unauthenticated connections
    if (!socket.isAuthenticated || !socket.user) {
      logger.debug('Socket.io: Unauthenticated connection established', {
        ip: socket.handshake.address,
      });

      // Allow limited functionality for unauthenticated users
      socket.on('disconnect', () => {
        logger.debug('Unauthenticated socket disconnected');
      });

      return; // Don't set up authenticated event handlers
    }

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
