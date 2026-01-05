const express = require('express');
const router = express.Router();
const {
  authenticateAdminKey,
  checkPermission,
} = require('../middleware/adminAuth');

// Import controllers
const dashboardController = require('../controllers/dashboardController');
const postsController = require('../controllers/postsController');
const mediaController = require('../controllers/mediaController');
const usersController = require('../controllers/usersController');
const settingsController = require('../controllers/settingsController');

// Apply authentication middleware to all routes
router.use(authenticateAdminKey);

// ==================== DASHBOARD ROUTES ====================
router.get(
  '/overview',
  checkPermission('view_dashboard'),
  dashboardController.getDashboardOverview
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
  dashboardController.getAdminKeys
);

router.post(
  '/admin-keys/create',
  checkPermission('manage_system_settings'),
  dashboardController.createAdminKey
);

router.post(
  '/admin-keys/:keyId/revoke',
  checkPermission('manage_system_settings'),
  dashboardController.revokeAdminKey
);

// ==================== POSTS MANAGEMENT ROUTES ====================
router.get(
  '/posts',
  checkPermission('manage_posts'),
  postsController.getPosts
);

router.get(
  '/posts/:postId',
  checkPermission('manage_posts'),
  postsController.getPost
);

router.post(
  '/posts/create',
  checkPermission('manage_posts'),
  postsController.createPost
);

router.put(
  '/posts/:postId',
  checkPermission('manage_posts'),
  postsController.updatePost
);

router.delete(
  '/posts/:postId',
  checkPermission('manage_posts'),
  postsController.deletePost
);

router.post(
  '/posts/:postId/toggle-status',
  checkPermission('manage_posts'),
  postsController.togglePostStatus
);

router.post(
  '/posts/bulk-delete',
  checkPermission('manage_posts'),
  postsController.bulkDeletePosts
);

// ==================== MEDIA MANAGEMENT ROUTES ====================
router.get(
  '/media',
  checkPermission('manage_media'),
  mediaController.getMedia
);

router.get(
  '/media/:mediaId',
  checkPermission('manage_media'),
  mediaController.getMediaDetails
);

router.post(
  '/media/upload',
  checkPermission('manage_media'),
  // Add multer middleware here
  mediaController.uploadMedia
);

router.delete(
  '/media/:mediaId',
  checkPermission('manage_media'),
  mediaController.deleteMedia
);

router.post(
  '/media/bulk-delete',
  checkPermission('manage_media'),
  mediaController.bulkDeleteMedia
);

router.get(
  '/media/storage/stats',
  checkPermission('manage_media'),
  mediaController.getStorageStats
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

module.exports = router;
