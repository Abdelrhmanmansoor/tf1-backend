const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { csrf, verifyCsrf } = require('../middleware/csrf');
const { PERMISSIONS } = require('../config/roles');

// All admin routes require authentication and CSRF protection
router.use(authenticate);
router.use(csrf);

// Dashboard - GET endpoint generates CSRF token
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_DASHBOARD), adminController.getDashboardStats);

// Articles management
router.get('/articles', checkPermission(PERMISSIONS.MANAGE_CONTENT), adminController.getAllArticles);
router.patch('/articles/:articleId/feature', verifyCsrf, checkPermission(PERMISSIONS.MANAGE_CONTENT), adminController.featureArticle);

// Users management
router.get('/users', checkPermission(PERMISSIONS.VIEW_USERS), adminController.getAllUsers);
router.delete('/users/:userId', verifyCsrf, checkPermission(PERMISSIONS.DELETE_USERS), adminController.deleteUser);
router.patch('/users/:userId/block', verifyCsrf, checkPermission(PERMISSIONS.BLOCK_USERS), settingsController.blockUser);
router.get('/user-activity/:userId', checkPermission(PERMISSIONS.VIEW_LOGS), settingsController.getUserActivity);

// Settings & System Config
router.get('/settings', checkPermission(PERMISSIONS.MANAGE_SETTINGS), settingsController.getSettings);
router.patch('/settings', verifyCsrf, checkPermission(PERMISSIONS.MANAGE_SETTINGS), settingsController.updateSettings);

// Activity & Logs
router.get('/logs', checkPermission(PERMISSIONS.VIEW_LOGS), settingsController.getActivityLogs);
router.get('/user-logins', checkPermission(PERMISSIONS.VIEW_LOGS), settingsController.getUserLoginHistory);
router.get('/analytics', checkPermission(PERMISSIONS.VIEW_ANALYTICS), settingsController.getAnalytics);

module.exports = router;
