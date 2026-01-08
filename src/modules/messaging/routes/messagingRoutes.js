const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messagingController');
const { authenticate } = require('../../../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Conversations
router.get('/conversations', messagingController.getConversations);
router.post('/conversation/:applicationId', messagingController.startOrGetConversation);
router.get('/conversation/:conversationId', messagingController.getConversation);

// Messages
router.post('/send', messagingController.sendMessage);
router.put('/:messageId', messagingController.editMessage);
router.delete('/:messageId', messagingController.deleteMessage);

// Interview scheduling
router.put('/conversation/:conversationId/schedule-interview', messagingController.scheduleInterview);

module.exports = router;
