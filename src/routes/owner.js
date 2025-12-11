const express = require('express');
const router = express.Router();
const controller = require('../controllers/ownerController');
const requireOwner = require('../middleware/ownerGuard');

// Apply Owner Guard to ALL routes in this file
// This is the "God Mode" firewall
router.use(requireOwner);

// ===========================================
// DASHBOARD & MONITORING
// ===========================================
router.get('/stats', controller.getSystemStats);
router.get('/audit-logs/global', controller.globalAudit);

// ===========================================
// USER MANAGEMENT
// ===========================================
router.get('/users', controller.getAllUsers);
router.get('/users/:id', controller.getUserById);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

// ===========================================
// CLUB MANAGEMENT
// ===========================================
router.get('/clubs', controller.getAllClubs);
// Use user endpoints for specific club updates/deletes since clubs are Users

// ===========================================
// JOB MANAGEMENT
// ===========================================
router.get('/jobs', controller.getAllJobs);

// ===========================================
// TOOLS
// ===========================================
router.post('/generate-code', controller.generateRegistrationCode);


module.exports = router;
