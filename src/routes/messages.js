const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===================================
// CONVERSATION ROUTES
// ===================================

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for authenticated user
 * @access  Private
 * @query   archived (boolean), page, limit
 */
router.get('/conversations', messageController.getConversations);

/**
 * @route   POST /api/v1/messages/conversations
 * @desc    Create new conversation (direct or group)
 * @access  Private
 */
router.post('/conversations', messageController.createConversation);

/**
 * @route   GET /api/v1/messages/conversations/:id
 * @desc    Get conversation details by ID
 * @access  Private
 */
router.get('/conversations/:id', messageController.getConversationById);

/**
 * @route   PUT /api/v1/messages/conversations/:id
 * @desc    Update conversation (name, avatar for groups)
 * @access  Private (Admin only for groups)
 */
router.put('/conversations/:id', messageController.updateConversation);

/**
 * @route   DELETE /api/v1/messages/conversations/:id
 * @desc    Delete/leave conversation
 * @access  Private
 */
router.delete('/conversations/:id', messageController.deleteConversation);

/**
 * @route   PUT /api/v1/messages/conversations/:id/mute
 * @desc    Mute/unmute conversation
 * @access  Private
 */
router.put('/conversations/:id/mute', messageController.toggleMute);

/**
 * @route   PUT /api/v1/messages/conversations/:id/archive
 * @desc    Archive conversation
 * @access  Private
 */
router.put('/conversations/:id/archive', messageController.archiveConversation);

/**
 * @route   PUT /api/v1/messages/conversations/:id/unarchive
 * @desc    Unarchive conversation
 * @access  Private
 */
router.put('/conversations/:id/unarchive', messageController.unarchiveConversation);

/**
 * @route   POST /api/v1/messages/conversations/:id/participants
 * @desc    Add participant to group conversation
 * @access  Private (Admin only)
 */
router.post('/conversations/:id/participants', messageController.addParticipant);

/**
 * @route   DELETE /api/v1/messages/conversations/:id/participants/:userId
 * @desc    Remove participant from group conversation
 * @access  Private (Admin only)
 */
router.delete('/conversations/:id/participants/:userId', messageController.removeParticipant);

// ===================================
// MESSAGE ROUTES
// ===================================

/**
 * @route   GET /api/v1/messages/conversations/:id/messages
 * @desc    Get messages in a conversation
 * @access  Private
 * @query   page, limit, before (timestamp)
 */
router.get('/conversations/:id/messages', messageController.getMessages);

/**
 * @route   POST /api/v1/messages/conversations/:id/messages
 * @desc    Send message in conversation
 * @access  Private
 */
router.post('/conversations/:id/messages', messageController.sendMessage);

/**
 * @route   PUT /api/v1/messages/:messageId
 * @desc    Edit message
 * @access  Private (Sender only)
 */
router.put('/:messageId', messageController.editMessage);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete message
 * @access  Private (Sender only)
 */
router.delete('/:messageId', messageController.deleteMessage);

/**
 * @route   POST /api/v1/messages/:messageId/react
 * @desc    Add reaction to message
 * @access  Private
 */
router.post('/:messageId/react', messageController.addReaction);

/**
 * @route   DELETE /api/v1/messages/:messageId/react
 * @desc    Remove reaction from message
 * @access  Private
 */
router.delete('/:messageId/react', messageController.removeReaction);

/**
 * @route   PUT/POST /api/v1/messages/conversations/:id/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put('/conversations/:id/read', messageController.markAsRead);
router.post('/conversations/:id/read', messageController.markAsRead);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get total unread messages count
 * @access  Private
 */
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;
