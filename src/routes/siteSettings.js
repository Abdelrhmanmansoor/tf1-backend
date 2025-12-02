const express = require('express');
const router = express.Router();
const controller = require('../controllers/siteSettingsController');
const { authenticate } = require('../middleware/auth');
const { requireLeader, checkTeamPermission, logAction } = require('../middleware/rbac');

router.get('/public', controller.getPublicSettings);

router.use(authenticate);
router.use(requireLeader);

router.get('/', logAction('settings', 'view', 'Full settings accessed'), controller.getFullSettings);

router.patch('/branding', logAction('settings', 'update_branding', 'Updated branding'), controller.updateBranding);
router.patch('/colors', logAction('settings', 'update_colors', 'Updated colors'), controller.updateColors);
router.patch('/logo', logAction('settings', 'update_logo', 'Updated logo'), controller.updateLogo);

router.patch('/content', logAction('settings', 'update_content', 'Updated content'), controller.updateContent);

router.patch('/contact-info', logAction('settings', 'update_contact', 'Updated contact info'), controller.updateContactInfo);
router.patch('/social-media', logAction('settings', 'update_social', 'Updated social media'), controller.updateSocialMedia);

router.patch('/features', logAction('settings', 'update_features', 'Updated features'), controller.updateFeatures);

router.patch('/seo', logAction('settings', 'update_seo', 'Updated SEO'), controller.updateSeo);
router.patch('/footer', logAction('settings', 'update_footer', 'Updated footer'), controller.updateFooter);
router.patch('/navigation', logAction('settings', 'update_navigation', 'Updated navigation'), controller.updateNavigation);

router.patch('/localization', logAction('settings', 'update_localization', 'Updated localization'), controller.updateLocalization);
router.patch('/security', logAction('settings', 'update_security', 'Updated security'), controller.updateSecurity);
router.patch('/limits', logAction('settings', 'update_limits', 'Updated limits'), controller.updateLimits);

router.post('/announcements', logAction('content', 'add_announcement', 'Added announcement'), controller.addAnnouncement);
router.post('/banners', logAction('content', 'add_banner', 'Added banner'), controller.addBanner);

router.post('/maintenance', logAction('system', 'toggle_maintenance', 'Toggled maintenance'), controller.toggleMaintenance);

router.post('/reset', logAction('settings', 'reset', 'Reset settings section'), controller.resetToDefaults);

module.exports = router;
