const express = require('express');
const router = express.Router();
const controller = require('./openaiWebhookController');

router.post('/openai', controller.handle);
router.get('/openai/ping', (req, res) => res.status(200).json({ success: true }));

module.exports = router;
