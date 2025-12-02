const express = require('express');
const router = express.Router();
const controller = require('../controllers/leaderDashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const { requireLeader, logAction } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', logAction('dashboard', 'view', 'Leader dashboard accessed'), controller.getDashboard);

router.get('/team', logAction('team', 'view', 'Team members listed'), controller.getTeamMembers);
router.post('/team', logAction('team', 'create', (req) => `Added team member: ${req.body.email}`), controller.addTeamMember);
router.patch('/team/:memberId/permissions', logAction('team', 'update', 'Updated member permissions'), controller.updateMemberPermissions);
router.delete('/team/:memberId', logAction('team', 'delete', 'Removed team member'), controller.removeMember);

router.get('/permissions', controller.getAvailablePermissions);

router.get('/audit-logs', logAction('logs', 'view', 'Audit logs accessed'), controller.getAuditLogs);

router.patch('/settings', logAction('settings', 'update', 'Settings updated'), controller.updateSettings);

module.exports = router;
