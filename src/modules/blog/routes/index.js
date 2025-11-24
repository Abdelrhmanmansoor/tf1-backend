const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticate } = require('../../../middleware/auth');
const { uploadCoverImage } = require('../../../middleware/cloudinaryUpload');

// Public routes
router.get('/articles', articleController.getArticles);
router.get('/articles/:id', articleController.getArticle);

// Protected routes
router.use(authenticate);

// Article management
router.post('/articles', uploadCoverImage, articleController.createArticle);
router.patch('/articles/:id', articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);

// Publishing
router.post('/articles/:id/publish', articleController.publishArticle);
router.post('/articles/:id/unpublish', articleController.unpublishArticle);

// Engagement
router.post('/articles/:id/like', articleController.likeArticle);
router.post('/articles/:id/unlike', articleController.unlikeArticle);
router.post('/articles/:id/comments', articleController.addComment);

module.exports = router;
