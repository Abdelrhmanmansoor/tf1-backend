const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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

module.exports = router;
