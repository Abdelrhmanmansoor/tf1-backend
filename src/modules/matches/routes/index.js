const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const teamRoutes = require('./teamRoutes');
const historyRoutes = require('./historyRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/', matchRoutes);  // Match routes at root of /matches
router.use('/teams', teamRoutes);
router.use('/me', historyRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
