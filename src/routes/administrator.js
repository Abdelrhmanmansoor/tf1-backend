const express = require('express');
const router = express.Router();
const administratorController = require('../controllers/administratorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'administrator'));

router.get('/dashboard', administratorController.getDashboard);

router.get('/users', administratorController.getUsers);
router.patch('/users/:id/block', administratorController.blockUser);

router.get('/approvals', administratorController.getApprovals);
router.patch('/approvals/:id', administratorController.handleApproval);

router.get('/alerts', administratorController.getAlerts);
router.patch('/alerts/:id/resolve', administratorController.resolveAlert);

router.get('/settings', administratorController.getSettings);
router.patch('/settings', administratorController.updateSettings);

module.exports = router;
