const express = require('express');
const router = express.Router();
const controller = require('../controllers/sportsDirectorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'administrator', 'sports-director', 'club'));

router.get('/dashboard', controller.getDashboard);

router.get('/programs', controller.getPrograms);
router.post('/programs', controller.createProgram);
router.get('/programs/:id', controller.getProgram);
router.patch('/programs/:id', controller.updateProgram);
router.delete('/programs/:id', controller.deleteProgram);

router.get('/coaches/performance', controller.getCoachesPerformance);
router.get('/coaches/:id/evaluations', controller.getCoachEvaluations);
router.post('/coaches/:id/evaluations', controller.createCoachEvaluation);

router.get('/athletes', controller.getAthletes);
router.get('/athletes/:id/performance', controller.getAthletePerformance);

router.get('/analytics/training', controller.getTrainingAnalytics);

router.get('/recruitment', controller.getRecruitment);
router.post('/recruitment', controller.createRecruitment);
router.patch('/recruitment/:id', controller.updateRecruitment);

module.exports = router;
