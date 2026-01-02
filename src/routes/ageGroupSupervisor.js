const express = require('express');
const router = express.Router();
const controller = require('../controllers/ageGroupSupervisorController');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate);

// Dashboard
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_DASHBOARD), controller.getDashboard);

// Age Groups Management
router.get('/groups', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getAgeGroups);
router.post('/groups', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.createAgeGroup);
router.get('/groups/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getAgeGroup);
router.patch('/groups/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.updateAgeGroup);
router.put('/groups/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.updateAgeGroup);
router.delete('/groups/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.deleteAgeGroup);

router.post('/groups/:id/assign-coach', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.assignCoach);
router.post('/groups/:id/assign-supervisor', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.assignSupervisor);
router.get('/groups/:id/players', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getGroupPlayers);

// Get groups assigned to current supervisor
router.get('/my-groups', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getMyAssignedGroups);

// Schedule & Training Sessions
router.get('/schedule', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getSchedule);
router.post('/schedule', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.createTrainingSession);
router.patch('/schedule/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.updateTrainingSession);
router.delete('/schedule/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.deleteTrainingSession);

// Matches (Age Group specific)
router.get('/matches', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getMatches);
router.post('/matches', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.createMatch);
router.patch('/matches/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.updateMatch);

// Registrations
router.get('/registrations', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getRegistrations);
router.post('/registrations', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.createRegistration);
router.get('/registrations/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.getRegistrationById);
router.patch('/registrations/:id', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.handleRegistration);
router.post('/registrations/:id/approve', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.approveRegistration);
router.post('/registrations/:id/reject', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.rejectRegistration);

// Players
router.get('/players', checkPermission(PERMISSIONS.VIEW_ATHLETES), controller.getPlayers);

// Reports Routes
router.get('/reports/players', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.reportPlayers);
router.get('/reports/attendance', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.reportAttendance);
router.get('/reports/performance', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.reportPerformance);
router.get('/reports/registrations', checkPermission(PERMISSIONS.MANAGE_AGE_GROUPS), controller.reportRegistrations);

module.exports = router;
