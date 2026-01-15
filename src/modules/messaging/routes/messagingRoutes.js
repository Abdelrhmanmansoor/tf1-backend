const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messagingController');
const { authenticate } = require('../../../middleware/auth');
const { handleValidationErrors } = require('../../../middleware/validation');
const { body, param } = require('express-validator');

// All routes require authentication
router.use(authenticate);

// Get unread count
router.get('/unread-count', messagingController.getUnreadCount);

// Get message threads
router.get('/threads', messagingController.getThreads);

// Create new thread
router.post(
  '/threads',
  [
    body('applicationId').isMongoId().withMessage('Valid application ID is required'),
    body('jobId').isMongoId().withMessage('Valid job ID is required'),
    body('applicantId').isMongoId().withMessage('Valid applicant ID is required'),
  ],
  handleValidationErrors,
  messagingController.createThread
);

// Get single thread
router.get(
  '/threads/:id',
  param('id').isMongoId(),
  handleValidationErrors,
  messagingController.getThread
);

// Send message in thread
router.post(
  '/threads/:id/messages',
  [
    param('id').isMongoId(),
    body('content').notEmpty().withMessage('Message content is required'),
    body('messageType').optional().isIn(['text', 'system', 'template', 'file']),
  ],
  handleValidationErrors,
  messagingController.sendMessage
);

// Edit message
router.patch(
  '/threads/:id/messages/:messageId',
  [
    param('id').isMongoId(),
    param('messageId').isMongoId(),
    body('content').notEmpty().withMessage('Message content is required'),
  ],
  handleValidationErrors,
  messagingController.editMessage
);

// Delete message
router.delete(
  '/threads/:id/messages/:messageId',
  [param('id').isMongoId(), param('messageId').isMongoId()],
  handleValidationErrors,
  messagingController.deleteMessage
);

// Close thread
router.patch(
  '/threads/:id/close',
  [param('id').isMongoId(), body('reason').optional().isString()],
  handleValidationErrors,
  messagingController.closeThread
);

// Mark message as read
router.patch(
  '/messages/:messageId/read',
  param('messageId').isMongoId(),
  handleValidationErrors,
  messagingController.markAsRead
);

// Get message templates
router.get('/templates', messagingController.getTemplates);

// Send message using template
router.post(
  '/templates/:templateId/send',
  [
    param('templateId').isMongoId(),
    body('threadId').isMongoId().withMessage('Valid thread ID is required'),
    body('variables').optional().isObject(),
  ],
  handleValidationErrors,
  messagingController.sendTemplateMessage
);

module.exports = router;
