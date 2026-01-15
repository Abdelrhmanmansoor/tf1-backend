const express = require('express');
const router = express.Router();
const featureController = require('../controllers/featureController');
const { authenticate, authorize } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const { body, param, query } = require('express-validator');

// Admin routes (require admin role)
const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(authorize('admin', 'administrator'));

// Get all features (Admin)
adminRouter.get('/', featureController.getAllFeatures);

// Get usage statistics (Admin)
adminRouter.get('/usage-stats', featureController.getUsageStats);

// Seed initial features (Admin - development)
adminRouter.post('/seed', featureController.seedFeatures);

// Check if feature is enabled for publisher (Internal use)
adminRouter.get('/check/:featureKey', featureController.checkFeature);

// Get single feature (Admin)
adminRouter.get('/:id', param('id').isMongoId(), validateRequest, featureController.getFeature);

// Create feature (Admin)
adminRouter.post(
  '/',
  [
    body('feature').notEmpty().withMessage('Feature key is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('category')
      .isIn([
        'notifications',
        'messaging',
        'interviews',
        'automation',
        'analytics',
        'integrations',
        'templates',
        'api',
        'ui',
        'security',
        'other',
      ])
      .withMessage('Invalid category'),
    body('requiredTier')
      .isIn(['free', 'basic', 'pro', 'enterprise', 'custom'])
      .withMessage('Invalid tier'),
  ],
  validateRequest,
  featureController.createFeature
);

// Update feature (Admin)
adminRouter.patch(
  '/:id',
  param('id').isMongoId(),
  validateRequest,
  featureController.updateFeature
);

// Delete feature (Admin)
adminRouter.delete(
  '/:id',
  param('id').isMongoId(),
  validateRequest,
  featureController.deleteFeature
);

// Toggle feature globally (Admin)
adminRouter.patch(
  '/:id/toggle',
  param('id').isMongoId(),
  validateRequest,
  featureController.toggleFeature
);

// Enable feature for specific publisher (Admin)
adminRouter.post(
  '/:id/enable-for-publisher',
  [
    param('id').isMongoId(),
    body('publisherId').isMongoId().withMessage('Valid publisher ID is required'),
    body('expiresAt').optional().isISO8601(),
    body('customConfig').optional().isObject(),
  ],
  validateRequest,
  featureController.enableForPublisher
);

// Disable feature for specific publisher (Admin)
adminRouter.post(
  '/:id/disable-for-publisher',
  [
    param('id').isMongoId(),
    body('publisherId').isMongoId().withMessage('Valid publisher ID is required'),
  ],
  validateRequest,
  featureController.disableForPublisher
);

// Remove publisher override (Admin)
adminRouter.delete(
  '/:id/remove-publisher/:publisherId',
  [param('id').isMongoId(), param('publisherId').isMongoId()],
  validateRequest,
  featureController.removePublisherOverride
);

// Update feature health (Admin)
adminRouter.post(
  '/:id/health',
  [
    param('id').isMongoId(),
    body('isHealthy').isBoolean(),
    body('errorRate').optional().isFloat({ min: 0, max: 100 }),
    body('responseTime').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  featureController.updateHealth
);

// Publisher routes (features available to current publisher)
const publisherRouter = express.Router();
publisherRouter.use(authenticate);
publisherRouter.use(authorize('job-publisher', 'club'));

// Get enabled features for current publisher
publisherRouter.get('/', featureController.getPublisherFeatures);

// Export routers
module.exports = {
  adminRouter,
  publisherRouter,
};
