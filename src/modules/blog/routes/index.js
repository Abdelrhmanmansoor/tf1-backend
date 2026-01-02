const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticate } = require('../../../middleware/auth');
const { uploadCoverImage, processCoverImage, handleUploadError } = require('../../../middleware/cloudinaryUpload');
const { checkPermission } = require('../../../middleware/rbac');
const { PERMISSIONS } = require('../../../config/roles');

// Public routes
router.get('/articles', articleController.getArticles);
router.get('/articles/:id', articleController.getArticle);

// Protected routes - require authentication
router.use(authenticate);

// Admin/Content Managers only - Article management
router.post('/articles', checkPermission(PERMISSIONS.MANAGE_CONTENT), uploadCoverImage, processCoverImage, handleUploadError, articleController.createArticle);
router.patch('/articles/:id', checkPermission(PERMISSIONS.MANAGE_CONTENT), articleController.updateArticle);
router.delete('/articles/:id', checkPermission(PERMISSIONS.MANAGE_CONTENT), articleController.deleteArticle);

// Admin/Content Managers only - Publishing
router.post('/articles/:id/publish', checkPermission(PERMISSIONS.MANAGE_CONTENT), articleController.publishArticle);
router.post('/articles/:id/unpublish', checkPermission(PERMISSIONS.MANAGE_CONTENT), articleController.unpublishArticle);

// Public engagement (authenticated users)
router.post('/articles/:id/like', articleController.likeArticle);
router.post('/articles/:id/unlike', articleController.unlikeArticle);
router.post('/articles/:id/comments', articleController.addComment);

module.exports = router;
