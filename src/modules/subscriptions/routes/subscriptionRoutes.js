const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../../../middleware/auth');
const { body, param } = require('express-validator');
const { validateRequest } = require('../../../middleware/validation');

// Publisher routes
router.use(authenticate);

// Get available tiers (public info)
router.get('/tiers', subscriptionController.getTiers);

// Publisher-specific routes
router.use(authorize('job-publisher', 'club'));

// Get my subscription
router.get('/', subscriptionController.getMySubscription);

// Get usage
router.get('/usage', subscriptionController.getUsage);

// Upgrade subscription
router.post(
  '/upgrade',
  [
    body('tier').isIn(['basic', 'pro', 'enterprise']).withMessage('Invalid tier'),
    body('billingCycle').optional().isIn(['monthly', 'yearly']),
  ],
  validateRequest,
  subscriptionController.upgradeSubscription
);

// Downgrade subscription
router.post(
  '/downgrade',
  [
    body('tier').isIn(['free', 'basic', 'pro']).withMessage('Invalid tier'),
    body('reason').optional().isString(),
  ],
  validateRequest,
  subscriptionController.downgradeSubscription
);

// Cancel subscription
router.post(
  '/cancel',
  [body('reason').optional().isString()],
  validateRequest,
  subscriptionController.cancelSubscription
);

// Reactivate subscription
router.post('/reactivate', subscriptionController.reactivateSubscription);

// Admin routes
const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(authorize('admin', 'administrator'));

// Get all subscriptions
adminRouter.get('/', subscriptionController.getAllSubscriptions);

// Change publisher tier
adminRouter.patch(
  '/:publisherId/tier',
  [
    param('publisherId').isMongoId(),
    body('tier').isIn(['free', 'basic', 'pro', 'enterprise']),
  ],
  validateRequest,
  subscriptionController.changePublisherTier
);

module.exports = { router, adminRouter };
