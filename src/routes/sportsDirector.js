const express = require('express');
const router = express.Router();
const controller = require('../controllers/sportsDirectorController');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate);

// Dashboard
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_DASHBOARD), controller.getDashboard);

// Programs
router.get('/programs', checkPermission(PERMISSIONS.MANAGE_PROGRAMS), controller.getPrograms);
router.post('/programs', checkPermission(PERMISSIONS.MANAGE_PROGRAMS), controller.createProgram);
router.get('/programs/:id', checkPermission(PERMISSIONS.MANAGE_PROGRAMS), controller.getProgram);
router.patch('/programs/:id', checkPermission(PERMISSIONS.MANAGE_PROGRAMS), controller.updateProgram);
router.delete('/programs/:id', checkPermission(PERMISSIONS.MANAGE_PROGRAMS), controller.deleteProgram);

// Coaches
router.get('/coaches/performance', checkPermission(PERMISSIONS.VIEW_COACH_PERFORMANCE), controller.getCoachesPerformance);
router.get('/coaches/:id/evaluations', checkPermission(PERMISSIONS.MANAGE_COACH_EVALUATIONS), controller.getCoachEvaluations);
router.post('/coaches/:id/evaluations', checkPermission(PERMISSIONS.MANAGE_COACH_EVALUATIONS), controller.createCoachEvaluation);

// Athletes
router.get('/athletes', checkPermission(PERMISSIONS.VIEW_ATHLETES), controller.getAthletes);
router.get('/athletes/:id/performance', checkPermission(PERMISSIONS.VIEW_ATHLETES), controller.getAthletePerformance);

// Analytics
router.get('/analytics/training', checkPermission(PERMISSIONS.VIEW_TRAINING_ANALYTICS), controller.getTrainingAnalytics);

// Recruitment
router.get('/recruitment', checkPermission(PERMISSIONS.MANAGE_RECRUITMENT), controller.getRecruitment);
router.post('/recruitment', checkPermission(PERMISSIONS.MANAGE_RECRUITMENT), controller.createRecruitment);
router.patch('/recruitment/:id', checkPermission(PERMISSIONS.MANAGE_RECRUITMENT), controller.updateRecruitment);

module.exports = router;
