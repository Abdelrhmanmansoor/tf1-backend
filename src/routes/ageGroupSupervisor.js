const express = require('express');
const router = express.Router();
const controller = require('../controllers/ageGroupSupervisorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'administrator', 'age-group-supervisor', 'club'));

router.get('/dashboard', controller.getDashboard);

router.get('/groups', controller.getAgeGroups);
router.post('/groups', controller.createAgeGroup);
router.get('/groups/:id', controller.getAgeGroup);
router.patch('/groups/:id', controller.updateAgeGroup);
router.put('/groups/:id', controller.updateAgeGroup);
router.delete('/groups/:id', controller.deleteAgeGroup);

router.post('/groups/:id/assign-coach', controller.assignCoach);
router.get('/groups/:id/players', controller.getGroupPlayers);

router.get('/schedule', controller.getSchedule);
router.post('/schedule', controller.createTrainingSession);
router.patch('/schedule/:id', controller.updateTrainingSession);
router.delete('/schedule/:id', controller.deleteTrainingSession);

router.get('/matches', controller.getMatches);
router.post('/matches', controller.createMatch);
router.patch('/matches/:id', controller.updateMatch);

router.get('/registrations', controller.getRegistrations);
router.post('/registrations', controller.createRegistration);
router.get('/registrations/:id', controller.getRegistrationById);
router.patch('/registrations/:id', controller.handleRegistration);
router.post('/registrations/:id/approve', controller.approveRegistration);
router.post('/registrations/:id/reject', controller.rejectRegistration);

router.get('/players', controller.getPlayers);

// Reports Routes
router.get('/reports/players', controller.reportPlayers);
router.get('/reports/attendance', controller.reportAttendance);
router.get('/reports/performance', controller.reportPerformance);
router.get('/reports/registrations', controller.reportRegistrations);

module.exports = router;
