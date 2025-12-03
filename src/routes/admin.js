const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
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
router.patch('/users/:userId/block', settingsController.blockUser);
router.get('/user-activity/:userId', settingsController.getUserActivity);

// Settings & System Config
router.get('/settings', settingsController.getSettings);
router.patch('/settings', settingsController.updateSettings);

// Activity & Logs
router.get('/logs', settingsController.getActivityLogs);
router.get('/user-logins', settingsController.getUserLoginHistory);
router.get('/analytics', settingsController.getAnalytics);

// ==================== SEED LEADER (PUBLIC - FOR INITIALIZATION ONLY) ====================
// This should be removed after first use or protected with a secret key
const User = require('../modules/shared/models/User');
const bcrypt = require('bcryptjs');

router.post('/seed-leader', async (req, res) => {
  try {
    const { email = 'leader@tf1one.com', password = 'Leader@SecurePass2025', secret } = req.body;
    
    // Add a secret check for security
    const SEED_SECRET = process.env.SEED_SECRET || 'sportx-seed-2025';
    if (secret !== SEED_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Invalid seed secret',
        code: 'INVALID_SECRET'
      });
    }

    // Check if leader already exists
    const existingLeader = await User.findOne({ email: email.toLowerCase() });
    if (existingLeader) {
      return res.status(400).json({
        success: false,
        message: 'Leader account already exists',
        code: 'LEADER_EXISTS',
        email: existingLeader.email
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create leader account
    const leader = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: 'Leader',
      lastName: 'Admin',
      role: 'leader',
      isVerified: true,
      isActive: true,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Leader account created successfully',
      leader: {
        id: leader._id,
        email: leader.email,
        role: leader.role,
        firstName: leader.firstName,
        lastName: leader.lastName
      }
    });
  } catch (error) {
    console.error('Seed leader error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating leader account',
      error: error.message
    });
  }
});

module.exports = router;
