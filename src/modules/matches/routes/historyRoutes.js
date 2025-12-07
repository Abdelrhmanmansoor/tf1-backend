const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// History route
router.get('/matches/history', historyController.getMyMatchHistory);

module.exports = router;
