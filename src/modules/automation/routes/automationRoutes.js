const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const { authenticate, authorize } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const { body, param, query } = require('express-validator');

// Validation rules
const createRuleValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('trigger.event')
    .notEmpty()
    .isIn([
      'APPLICATION_SUBMITTED',
      'APPLICATION_STAGE_CHANGED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'INTERVIEW_CANCELLED',
      'MESSAGE_RECEIVED',
      'JOB_PUBLISHED',
      'JOB_DEADLINE_APPROACHING',
      'APPLICATION_UPDATED',
      'FEEDBACK_SUBMITTED',
    ])
    .withMessage('Invalid trigger event'),
  body('trigger.conditions').optional().isArray(),
  body('actions').isArray().withMessage('Actions must be an array'),
  body('actions').notEmpty().withMessage('At least one action is required'),
];

const updateRuleValidation = [
  param('id').isMongoId(),
  body('name').optional().notEmpty(),
  body('trigger').optional().isObject(),
  body('actions').optional().isArray(),
];

const testRuleValidation = [
  body('ruleId').isMongoId().withMessage('Valid rule ID is required'),
  body('testData').isObject().withMessage('Test data must be an object'),
];

// All routes require authentication and publisher role
router.use(authenticate);
router.use(authorize('job-publisher', 'club'));

// Get automation rules
router.get('/', automationController.getRules);

// Get automation statistics
router.get('/statistics', automationController.getStatistics);

// Get system templates
router.get('/templates', automationController.getTemplates);

// Clone system template
router.post(
  '/templates/:id/clone',
  param('id').isMongoId(),
  validateRequest,
  automationController.cloneTemplate
);

// Get execution logs
router.get('/logs', automationController.getLogs);

// Test automation rule (dry run)
router.post('/test', testRuleValidation, validateRequest, automationController.testRule);

// Get single rule
router.get('/:id', param('id').isMongoId(), validateRequest, automationController.getRule);

// Create automation rule
router.post('/', createRuleValidation, validateRequest, automationController.createRule);

// Update automation rule
router.patch('/:id', updateRuleValidation, validateRequest, automationController.updateRule);

// Delete automation rule
router.delete('/:id', param('id').isMongoId(), validateRequest, automationController.deleteRule);

// Toggle automation rule
router.post(
  '/:id/toggle',
  param('id').isMongoId(),
  validateRequest,
  automationController.toggleRule
);

module.exports = router;
