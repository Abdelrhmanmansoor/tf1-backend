const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const matchRoutes = require('./matchRoutes');
const teamRoutes = require('./teamRoutes');
const historyRoutes = require('./historyRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount routes under /matches/api
router.use('/api/auth', authRoutes);
router.use('/api', matchRoutes);  // Match routes will be at /matches/api/matches, etc.
router.use('/api/teams', teamRoutes);
router.use('/api/me', historyRoutes);
router.use('/api/notifications', notificationRoutes);

// Legacy routes for backward compatibility (direct under /matches)
router.use('/auth', authRoutes);
router.use('/', matchRoutes);
router.use('/teams', teamRoutes);
router.use('/me', historyRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
