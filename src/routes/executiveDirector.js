const express = require('express');
const router = express.Router();
const controller = require('../controllers/executiveDirectorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'administrator', 'executive-director', 'club'));

router.get('/dashboard', controller.getDashboard);

router.get('/kpis', controller.getKPIs);
router.patch('/kpis/:id', controller.updateKPI);

router.get('/initiatives', controller.getInitiatives);
router.post('/initiatives', controller.createInitiative);
router.patch('/initiatives/:id', controller.updateInitiative);
router.delete('/initiatives/:id', controller.deleteInitiative);

router.get('/partnerships', controller.getPartnerships);
router.post('/partnerships', controller.createPartnership);
router.patch('/partnerships/:id', controller.updatePartnership);

router.get('/reports/financial', controller.getFinancialReports);

router.get('/announcements', controller.getAnnouncements);
router.post('/announcements', controller.createAnnouncement);
router.patch('/announcements/:id', controller.updateAnnouncement);
router.delete('/announcements/:id', controller.deleteAnnouncement);

module.exports = router;
