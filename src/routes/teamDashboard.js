const express = require('express');
const router = express.Router();
const controller = require('../controllers/teamDashboardController');
const { authenticate } = require('../middleware/auth');
const { checkTeamPermission, logAction } = require('../middleware/rbac');

router.use(authenticate);

router.get('/dashboard', logAction('dashboard', 'view', 'Team dashboard accessed'), controller.getDashboard);

router.get('/permissions', controller.getMyPermissions);

router.get('/check-access/:module', controller.checkModuleAccess);

router.get('/my-activity', controller.getMyActivity);

router.get('/access-denied', controller.accessDeniedPage);

module.exports = router;
