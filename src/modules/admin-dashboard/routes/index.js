const express = require('express');
const router = express.Router();
const {
  authenticateAdminKey,
  checkPermission,
} = require('../middleware/adminAuthDev');  // Use development middleware (no MongoDB required)

// Mock controller response helper
const mockResponse = (req, res, endpoint) => {
  res.status(200).json({
    success: true,
    message: `Endpoint: ${endpoint}`,
    data: { /* mock data */ },
    note: 'Using mock data - MongoDB not connected'
  });
};

// Apply authentication middleware to all routes
router.use(authenticateAdminKey);

// ==================== DASHBOARD ROUTES ====================
router.get(
  '/overview',
  checkPermission('view_dashboard'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Dashboard Overview',
      data: {
        totalActions: 1250,
        successfulActions: 1200,
        failedActions: 50,
        systemStatus: { database: '⚠️ Not Connected', api: '✅ Active', socketio: '✅ Active' }
      },
      timestamp: new Date().toISOString()
    });
  }
);

// ==================== ACTIVITY LOGS ROUTES ====================
router.get(
  '/logs',
  checkPermission('view_logs'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: [
        { id: '1', actionType: 'LOGIN', status: 'SUCCESS', ip: '192.168.1.1', timestamp: new Date().toISOString() }
      ],
      pagination: { page: 1, limit: 20, total: 1 }
    });
  }
);

router.get(
  '/logs/export',
  checkPermission('export_data'),
  (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');
    res.send('Action,Status,IP,Timestamp\nLOGIN,SUCCESS,192.168.1.1,' + new Date().toISOString());
  }
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
  (req, res) => {
    res.status(200).json({
      success: true,
      data: [
        { id: 'user1', name: 'Ahmed', email: 'ahmed@example.com', role: 'player' },
        { id: 'user2', name: 'Fatima', email: 'fatima@example.com', role: 'coach' }
      ]
    });
  }
);

router.get(
  '/users/:userId',
  checkPermission('manage_users'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: { id: req.params.userId, name: 'User', email: 'user@example.com' }
    });
  }
);

router.put(
  '/users/:userId',
  checkPermission('manage_users'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'User updated'
    });
  }
);

router.post(
  '/users/:userId/deactivate',
  checkPermission('manage_users'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'User deactivated'
    });
  }
);

router.get(
  '/users/statistics/overview',
  checkPermission('manage_users'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: { totalUsers: 150, activeUsers: 120, newUsers: 15 }
    });
  }
);

// ==================== SYSTEM SETTINGS ROUTES ====================
router.get(
  '/settings',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        siteName: 'SportX Platform',
        siteUrl: 'https://www.tf1one.com',
        adminEmail: 'admin@tf1one.com'
      }
    });
  }
);

router.put(
  '/settings',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Settings updated'
    });
  }
);

router.get(
  '/settings/health',
  checkPermission('manage_system_settings'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        database: '⚠️ Not Connected',
        api: '✅ Active',
        socketio: '✅ Active',
        memory: '45%'
      }
    });
  }
);

// ==================== BACKUP ROUTES ====================
router.get(
  '/backups',
  checkPermission('manage_backups'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  }
);

router.post(
  '/backups/create',
  checkPermission('manage_backups'),
  (req, res) => {
    res.status(201).json({
      success: true,
      message: 'Backup created'
    });
  }
);

router.delete(
  '/backups/:backupName',
  checkPermission('manage_backups'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Backup deleted'
    });
  }
);

router.get(
  '/backups/:backupName/download',
  checkPermission('manage_backups'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Backup download link'
    });
  }
);

module.exports = router;
