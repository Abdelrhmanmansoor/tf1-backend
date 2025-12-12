const express = require('express');
const router = express.Router();
const controller = require('../controllers/siteSettingsController');
const { authenticate } = require('../middleware/auth');
const { requireSportsAdmin, checkTeamPermission, logAction } = require('../middleware/rbac');

router.get('/public', controller.getPublicSettings);

router.use(authenticate);

router.get('/',
  checkTeamPermission(['SETTINGS_VIEW']),
  logAction('settings', 'view', 'Full settings accessed'),
  controller.getFullSettings
);

router.patch('/branding',
  checkTeamPermission(['SETTINGS_BRANDING', 'BRANDING_EDIT']),
  logAction('settings', 'update_branding', 'Updated branding'),
  controller.updateBranding
);

router.patch('/colors',
  checkTeamPermission(['SETTINGS_COLORS', 'COLORS_EDIT']),
  logAction('settings', 'update_colors', 'Updated colors'),
  controller.updateColors
);

router.patch('/logo',
  checkTeamPermission(['SETTINGS_LOGO', 'LOGO_EDIT']),
  logAction('settings', 'update_logo', 'Updated logo'),
  controller.updateLogo
);

router.patch('/typography',
  checkTeamPermission(['SETTINGS_TYPOGRAPHY', 'TYPOGRAPHY_EDIT']),
  logAction('settings', 'update_typography', 'Updated typography'),
  controller.updateTypography
);

router.patch('/layout',
  checkTeamPermission(['SETTINGS_LAYOUT', 'LAYOUT_EDIT']),
  logAction('settings', 'update_layout', 'Updated layout'),
  controller.updateLayout
);

router.patch('/content',
  checkTeamPermission(['SETTINGS_CONTENT', 'CONTENT_EDIT']),
  logAction('settings', 'update_content', 'Updated content'),
  controller.updateContent
);

router.patch('/pages',
  checkTeamPermission(['SETTINGS_PAGES', 'PAGES_EDIT']),
  logAction('settings', 'update_pages', 'Updated pages'),
  controller.updatePages
);

router.patch('/contact-info',
  checkTeamPermission(['SETTINGS_CONTACT', 'CONTACT_EDIT']),
  logAction('settings', 'update_contact', 'Updated contact info'),
  controller.updateContactInfo
);

router.patch('/social-media',
  checkTeamPermission(['SETTINGS_SOCIAL', 'SOCIAL_EDIT']),
  logAction('settings', 'update_social', 'Updated social media'),
  controller.updateSocialMedia
);

router.patch('/features',
  checkTeamPermission(['SETTINGS_FEATURES', 'FEATURES_EDIT']),
  logAction('settings', 'update_features', 'Updated features'),
  controller.updateFeatures
);

router.patch('/seo',
  checkTeamPermission(['SETTINGS_SEO', 'SEO_EDIT']),
  logAction('settings', 'update_seo', 'Updated SEO'),
  controller.updateSeo
);

router.patch('/footer',
  checkTeamPermission(['SETTINGS_FOOTER', 'FOOTER_EDIT']),
  logAction('settings', 'update_footer', 'Updated footer'),
  controller.updateFooter
);

router.patch('/navigation',
  checkTeamPermission(['SETTINGS_NAVIGATION', 'NAVIGATION_EDIT']),
  logAction('settings', 'update_navigation', 'Updated navigation'),
  controller.updateNavigation
);

router.patch('/localization',
  checkTeamPermission(['SETTINGS_LOCALIZATION', 'LOCALIZATION_EDIT']),
  logAction('settings', 'update_localization', 'Updated localization'),
  controller.updateLocalization
);

router.patch('/security',
  requireSportsAdmin,
  logAction('settings', 'update_security', 'Updated security'),
  controller.updateSecurity
);

router.patch('/limits',
  checkTeamPermission(['SETTINGS_LIMITS', 'LIMITS_EDIT']),
  logAction('settings', 'update_limits', 'Updated limits'),
  controller.updateLimits
);

router.post('/announcements',
  checkTeamPermission(['SETTINGS_ANNOUNCEMENTS', 'ANNOUNCEMENTS_CREATE']),
  logAction('content', 'add_announcement', 'Added announcement'),
  controller.addAnnouncement
);

router.patch('/announcements/:id',
  checkTeamPermission(['SETTINGS_ANNOUNCEMENTS', 'ANNOUNCEMENTS_EDIT']),
  logAction('content', 'edit_announcement', 'Edited announcement'),
  controller.updateAnnouncement
);

router.delete('/announcements/:id',
  checkTeamPermission(['SETTINGS_ANNOUNCEMENTS', 'ANNOUNCEMENTS_DELETE']),
  logAction('content', 'delete_announcement', 'Deleted announcement'),
  controller.deleteAnnouncement
);

router.post('/banners',
  checkTeamPermission(['SETTINGS_BANNERS', 'BANNERS_CREATE']),
  logAction('content', 'add_banner', 'Added banner'),
  controller.addBanner
);

router.patch('/banners/:id',
  checkTeamPermission(['SETTINGS_BANNERS', 'BANNERS_EDIT']),
  logAction('content', 'edit_banner', 'Edited banner'),
  controller.updateBanner
);

router.delete('/banners/:id',
  checkTeamPermission(['SETTINGS_BANNERS', 'BANNERS_DELETE']),
  logAction('content', 'delete_banner', 'Deleted banner'),
  controller.deleteBanner
);

router.patch('/email-templates',
  checkTeamPermission(['SETTINGS_EMAIL_TEMPLATES', 'EMAIL_TEMPLATES_EDIT']),
  logAction('settings', 'update_email_templates', 'Updated email templates'),
  controller.updateEmailTemplates
);

router.post('/maintenance',
  requireSportsAdmin,
  logAction('system', 'toggle_maintenance', 'Toggled maintenance'),
  controller.toggleMaintenance
);

router.post('/reset',
  requireSportsAdmin,
  logAction('settings', 'reset', 'Reset settings section'),
  controller.resetToDefaults
);

router.get('/version-history',
  requireSportsAdmin,
  logAction('settings', 'view_history', 'Viewed version history'),
  controller.getVersionHistory
);

module.exports = router;
