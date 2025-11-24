const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminCheck');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Articles management
router.get('/articles', adminController.getAllArticles);
router.patch('/articles/:articleId/feature', adminController.featureArticle);

// Users management
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);
router.patch('/users/:userId/block', settingsController.blockUser);
router.get('/user-activity/:userId', settingsController.getUserActivity);

// Settings & System Config
router.get('/settings', settingsController.getSettings);
router.patch('/settings', settingsController.updateSettings);

// Activity & Logs
router.get('/logs', settingsController.getActivityLogs);
router.get('/user-logins', settingsController.getUserLoginHistory);
router.get('/analytics', settingsController.getAnalytics);

module.exports = router;
