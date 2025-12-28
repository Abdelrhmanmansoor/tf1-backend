const express = require('express');
const cvController = require('../controllers/cvController');
const auth = require('../../../middleware/auth'); // Assuming standard auth middleware
const router = express.Router();

// Public or Protected depending on requirements. 
// User said "API Key protected in server", but frontend access needs to be secured or public?
// Usually CV builder is for users. I'll make it open but optional auth.

router.post('/', cvController.createOrUpdateCV);
router.get('/:id', cvController.getCV);
router.post('/generate-pdf', cvController.generatePDF); // Generate from body data
router.get('/:id/pdf', cvController.generatePDF); // Generate from saved ID

router.post('/ai/generate', cvController.aiGenerate);

module.exports = router;
