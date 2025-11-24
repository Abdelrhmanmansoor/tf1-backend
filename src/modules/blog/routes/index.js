const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticate } = require('../../../middleware/auth');
const { uploadCoverImage } = require('../../../middleware/cloudinaryUpload');
const { isAdmin } = require('../../../middleware/adminCheck');

// Public routes
router.get('/articles', articleController.getArticles);
router.get('/articles/:id', articleController.getArticle);

// Protected routes - require authentication
router.use(authenticate);

// Admin only - Article management
router.post('/articles', isAdmin, uploadCoverImage, articleController.createArticle);
router.patch('/articles/:id', isAdmin, articleController.updateArticle);
router.delete('/articles/:id', isAdmin, articleController.deleteArticle);

// Admin only - Publishing
router.post('/articles/:id/publish', isAdmin, articleController.publishArticle);
router.post('/articles/:id/unpublish', isAdmin, articleController.unpublishArticle);

// Public engagement (authenticated users)
router.post('/articles/:id/like', articleController.likeArticle);
router.post('/articles/:id/unlike', articleController.unlikeArticle);
router.post('/articles/:id/comments', articleController.addComment);

module.exports = router;
