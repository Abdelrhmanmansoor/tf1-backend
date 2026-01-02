const express = require('express');
const router = express.Router();
const controller = require('../controllers/executiveDirectorController');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate);

// Dashboard
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_DASHBOARD), controller.getDashboard);

// KPIs & Strategy
router.get('/kpis', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.getKPIs);
router.patch('/kpis/:id', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.updateKPI);

// Initiatives
router.get('/initiatives', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.getInitiatives);
router.post('/initiatives', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.createInitiative);
router.patch('/initiatives/:id', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.updateInitiative);
router.delete('/initiatives/:id', checkPermission(PERMISSIONS.MANAGE_STRATEGY), controller.deleteInitiative);

// Partnerships
router.get('/partnerships', checkPermission(PERMISSIONS.MANAGE_PARTNERSHIPS), controller.getPartnerships);
router.post('/partnerships', checkPermission(PERMISSIONS.MANAGE_PARTNERSHIPS), controller.createPartnership);
router.patch('/partnerships/:id', checkPermission(PERMISSIONS.MANAGE_PARTNERSHIPS), controller.updatePartnership);

// Financial Reports
router.get('/reports/financial', checkPermission(PERMISSIONS.VIEW_FINANCIALS), controller.getFinancialReports);

// Announcements (Internal)
router.get('/announcements', checkPermission(PERMISSIONS.MANAGE_CONTENT), controller.getAnnouncements);
router.post('/announcements', checkPermission(PERMISSIONS.MANAGE_CONTENT), controller.createAnnouncement);
router.patch('/announcements/:id', checkPermission(PERMISSIONS.MANAGE_CONTENT), controller.updateAnnouncement);
router.delete('/announcements/:id', checkPermission(PERMISSIONS.MANAGE_CONTENT), controller.deleteAnnouncement);

module.exports = router;
