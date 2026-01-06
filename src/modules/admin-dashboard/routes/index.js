const express = require('express');
const router = express.Router();
const {
  authenticateAdminKey,
  checkPermission,
} = require('../middleware/adminAuthDev');  // Use development middleware (no MongoDB required)

// Import controllers
const dashboardController = require('../controllers/dashboardController');
const comprehensiveStatsController = require('../controllers/comprehensiveStatsController');
const usersController = require('../controllers/usersController');
const settingsController = require('../controllers/settingsController');
const siteContentController = require('../controllers/siteContentController');

// Import security middleware
const security = require('../middleware/security');

// Mock controller response helper
const mockResponse = (req, res, endpoint) => {
  res.status(200).json({
    success: true,
    message: `Endpoint: ${endpoint}`,
    data: { /* mock data */ },
    note: 'Using mock data - MongoDB not connected'
  });
};

// Apply security middleware to all routes
router.use(security.securityHeaders);
router.use(security.validateInput);
router.use(security.checkIPWhitelist);
router.use(security.apiLimiter);

// Apply authentication middleware to all routes
router.use(authenticateAdminKey);

// ==================== DASHBOARD ROUTES ====================
router.get(
  '/overview',
  checkPermission('view_dashboard'),
  dashboardController.getDashboardOverview
);

// Comprehensive statistics endpoint - THE SCARY ONE
router.get(
  '/stats/comprehensive',
  checkPermission('view_dashboard'),
  comprehensiveStatsController.getComprehensiveStats
);

// ==================== ACTIVITY LOGS ROUTES ====================
router.get(
  '/logs',
  checkPermission('view_logs'),
  dashboardController.getActivityLogs
);

router.get(
  '/logs/export',
  checkPermission('export_data'),
  dashboardController.exportLogs
);

// ==================== ADMIN KEY MANAGEMENT ROUTES ====================
router.get(
  '/admin-keys',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: [
        { id: 'key1', keyName: 'Test Key', isActive: true, createdAt: new Date().toISOString() }
      ]
    });
  }
);

router.post(
  '/admin-keys/create',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Admin key created',
      data: { id: 'key_' + Date.now(), rawKey: 'sk_admin_...' }
    });
  }
);

router.post(
  '/admin-keys/:keyId/revoke',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Admin key revoked',
      data: { revokedId: req.params.keyId }
    });
  }
);

// ==================== POSTS MANAGEMENT ROUTES ====================
router.get(
  '/posts',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: [{ id: 'post1', title: 'Sample Post', status: 'published' }]
    });
  }
);

router.get(
  '/posts/:postId',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: { id: req.params.postId, title: 'Sample', status: 'published' }
    });
  }
);

router.post(
  '/posts/create',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Post created',
      data: { id: 'post_' + Date.now() }
    });
  }
);

router.put(
  '/posts/:postId',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Post updated',
      data: { id: req.params.postId }
    });
  }
);

router.delete(
  '/posts/:postId',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Post deleted',
      data: { deletedId: req.params.postId }
    });
  }
);

router.post(
  '/posts/:postId/toggle-status',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Post status toggled'
    });
  }
);

router.post(
  '/posts/bulk-delete',
  checkPermission('manage_posts'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Posts deleted in bulk'
    });
  }
);

// ==================== MEDIA MANAGEMENT ROUTES ====================
router.get(
  '/media',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  }
);

router.get(
  '/media/:mediaId',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: { id: req.params.mediaId }
    });
  }
);

router.post(
  '/media/upload',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Media uploaded'
    });
  }
);

router.delete(
  '/media/:mediaId',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Media deleted'
    });
  }
);

router.post(
  '/media/bulk-delete',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Media deleted in bulk'
    });
  }
);

router.get(
  '/media/storage/stats',
  checkPermission('manage_media'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: { used: '500MB', total: '10GB' }
    });
  }
);

// ==================== USERS MANAGEMENT ROUTES ====================
router.get(
  '/users',
  checkPermission('manage_users'),
  usersController.getUsers
);

router.get(
  '/users/:userId',
  checkPermission('manage_users'),
  usersController.getUserDetails
);

router.put(
  '/users/:userId',
  checkPermission('manage_users'),
  usersController.updateUser
);

router.post(
  '/users/:userId/deactivate',
  checkPermission('manage_users'),
  usersController.deactivateUser
);

router.get(
  '/users/statistics/overview',
  checkPermission('manage_users'),
  usersController.getUserStatistics
);

// ==================== SYSTEM SETTINGS ROUTES ====================
router.get(
  '/settings',
  checkPermission('manage_system_settings'),
  settingsController.getSystemSettings
);

router.put(
  '/settings',
  checkPermission('manage_system_settings'),
  settingsController.updateSystemSettings
);

router.get(
  '/settings/health',
  checkPermission('manage_system_settings'),
  settingsController.getSystemHealth
);

// ==================== BACKUP ROUTES ====================
router.get(
  '/backups',
  checkPermission('manage_backups'),
  settingsController.getBackups
);

router.post(
  '/backups/create',
  checkPermission('manage_backups'),
  settingsController.createBackup
);

router.delete(
  '/backups/:backupName',
  checkPermission('manage_backups'),
  settingsController.deleteBackup
);

router.get(
  '/backups/:backupName/download',
  checkPermission('manage_backups'),
  settingsController.downloadBackup
);

// ==================== SITE CONTENT MANAGEMENT ROUTES ====================
router.get(
  '/site-content',
  checkPermission('manage_system_settings'),
  siteContentController.getSiteContent
);

router.put(
  '/site-content',
  checkPermission('manage_system_settings'),
  security.strictLimiter,
  siteContentController.updateSiteContent
);

router.delete(
  '/site-content/:id',
  checkPermission('manage_system_settings'),
  security.strictLimiter,
  siteContentController.deleteSiteContent
);

router.post(
  '/site-content/bulk-update',
  checkPermission('manage_system_settings'),
  security.strictLimiter,
  siteContentController.bulkUpdateSiteContent
);

module.exports = router;
