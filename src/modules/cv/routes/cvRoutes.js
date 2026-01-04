const express = require('express');
const cvController = require('../controllers/cvController');
const auth = require('../../../middleware/auth');
const { aiRateLimiter } = require('../../../middleware/rateLimiter');
const router = express.Router();

// CV CRUD operations
router.post('/', cvController.createOrUpdateCV);
router.get('/:id', cvController.getCV);
router.post('/generate-pdf', cvController.generatePDF);
router.get('/:id/pdf', cvController.generatePDF);

// AI-powered features with rate limiting
router.post('/ai/generate', aiRateLimiter, cvController.aiGenerate);

module.exports = router;
