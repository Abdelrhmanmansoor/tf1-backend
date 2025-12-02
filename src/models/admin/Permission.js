const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  nameAr: {
    type: String,
    required: true
  },
  description: String,
  descriptionAr: String,
  module: {
    type: String,
    required: true
  },
  moduleAr: String,
  category: {
    type: String,
    enum: ['dashboard', 'users', 'content', 'jobs', 'matches', 'settings', 'reports', 'system'],
    default: 'dashboard'
  },
  actions: [{
    type: String,
    enum: ['view', 'create', 'edit', 'delete', 'manage', 'export', 'import', 'approve', 'reject']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

permissionSchema.index({ module: 1 });
permissionSchema.index({ category: 1 });

module.exports = mongoose.model('Permission', permissionSchema);

const defaultPermissions = [
  { code: 'DASHBOARD_VIEW', name: 'View Dashboard', nameAr: 'عرض لوحة التحكم', module: 'dashboard', moduleAr: 'لوحة التحكم', category: 'dashboard', actions: ['view'], sortOrder: 1 },
  { code: 'DASHBOARD_ANALYTICS', name: 'View Analytics', nameAr: 'عرض التحليلات', module: 'dashboard', moduleAr: 'لوحة التحكم', category: 'dashboard', actions: ['view'], sortOrder: 2 },
  
  { code: 'USERS_VIEW', name: 'View Users', nameAr: 'عرض المستخدمين', module: 'users', moduleAr: 'المستخدمين', category: 'users', actions: ['view'], sortOrder: 10 },
  { code: 'USERS_CREATE', name: 'Create Users', nameAr: 'إنشاء مستخدمين', module: 'users', moduleAr: 'المستخدمين', category: 'users', actions: ['create'], sortOrder: 11 },
  { code: 'USERS_EDIT', name: 'Edit Users', nameAr: 'تعديل المستخدمين', module: 'users', moduleAr: 'المستخدمين', category: 'users', actions: ['edit'], sortOrder: 12 },
  { code: 'USERS_DELETE', name: 'Delete Users', nameAr: 'حذف المستخدمين', module: 'users', moduleAr: 'المستخدمين', category: 'users', actions: ['delete'], sortOrder: 13 },
  { code: 'USERS_BLOCK', name: 'Block Users', nameAr: 'حظر المستخدمين', module: 'users', moduleAr: 'المستخدمين', category: 'users', actions: ['manage'], sortOrder: 14 },
  
  { code: 'JOBS_VIEW', name: 'View Jobs', nameAr: 'عرض الوظائف', module: 'jobs', moduleAr: 'الوظائف', category: 'jobs', actions: ['view'], sortOrder: 20 },
  { code: 'JOBS_CREATE', name: 'Create Jobs', nameAr: 'إنشاء وظائف', module: 'jobs', moduleAr: 'الوظائف', category: 'jobs', actions: ['create'], sortOrder: 21 },
  { code: 'JOBS_EDIT', name: 'Edit Jobs', nameAr: 'تعديل الوظائف', module: 'jobs', moduleAr: 'الوظائف', category: 'jobs', actions: ['edit'], sortOrder: 22 },
  { code: 'JOBS_DELETE', name: 'Delete Jobs', nameAr: 'حذف الوظائف', module: 'jobs', moduleAr: 'الوظائف', category: 'jobs', actions: ['delete'], sortOrder: 23 },
  { code: 'JOBS_APPLICATIONS', name: 'Manage Applications', nameAr: 'إدارة الطلبات', module: 'jobs', moduleAr: 'الوظائف', category: 'jobs', actions: ['manage', 'approve', 'reject'], sortOrder: 24 },
  
  { code: 'MATCHES_VIEW', name: 'View Matches', nameAr: 'عرض المباريات', module: 'matches', moduleAr: 'المباريات', category: 'matches', actions: ['view'], sortOrder: 30 },
  { code: 'MATCHES_CREATE', name: 'Create Matches', nameAr: 'إنشاء مباريات', module: 'matches', moduleAr: 'المباريات', category: 'matches', actions: ['create'], sortOrder: 31 },
  { code: 'MATCHES_EDIT', name: 'Edit Matches', nameAr: 'تعديل المباريات', module: 'matches', moduleAr: 'المباريات', category: 'matches', actions: ['edit'], sortOrder: 32 },
  { code: 'MATCHES_DELETE', name: 'Delete Matches', nameAr: 'حذف المباريات', module: 'matches', moduleAr: 'المباريات', category: 'matches', actions: ['delete'], sortOrder: 33 },
  
  { code: 'CONTENT_VIEW', name: 'View Content', nameAr: 'عرض المحتوى', module: 'content', moduleAr: 'المحتوى', category: 'content', actions: ['view'], sortOrder: 40 },
  { code: 'CONTENT_CREATE', name: 'Create Content', nameAr: 'إنشاء محتوى', module: 'content', moduleAr: 'المحتوى', category: 'content', actions: ['create'], sortOrder: 41 },
  { code: 'CONTENT_EDIT', name: 'Edit Content', nameAr: 'تعديل المحتوى', module: 'content', moduleAr: 'المحتوى', category: 'content', actions: ['edit'], sortOrder: 42 },
  { code: 'CONTENT_DELETE', name: 'Delete Content', nameAr: 'حذف المحتوى', module: 'content', moduleAr: 'المحتوى', category: 'content', actions: ['delete'], sortOrder: 43 },
  { code: 'CONTENT_PUBLISH', name: 'Publish Content', nameAr: 'نشر المحتوى', module: 'content', moduleAr: 'المحتوى', category: 'content', actions: ['approve'], sortOrder: 44 },
  
  { code: 'CATEGORIES_VIEW', name: 'View Categories', nameAr: 'عرض التصنيفات', module: 'categories', moduleAr: 'التصنيفات', category: 'content', actions: ['view'], sortOrder: 50 },
  { code: 'CATEGORIES_MANAGE', name: 'Manage Categories', nameAr: 'إدارة التصنيفات', module: 'categories', moduleAr: 'التصنيفات', category: 'content', actions: ['create', 'edit', 'delete'], sortOrder: 51 },
  
  { code: 'SETTINGS_VIEW', name: 'View Settings', nameAr: 'عرض الإعدادات', module: 'settings', moduleAr: 'الإعدادات', category: 'settings', actions: ['view'], sortOrder: 60 },
  { code: 'SETTINGS_EDIT', name: 'Edit Settings', nameAr: 'تعديل الإعدادات', module: 'settings', moduleAr: 'الإعدادات', category: 'settings', actions: ['edit'], sortOrder: 61 },
  
  { code: 'SETTINGS_BRANDING', name: 'Manage Branding', nameAr: 'إدارة العلامة التجارية', module: 'branding', moduleAr: 'العلامة التجارية', category: 'settings', actions: ['view', 'edit'], sortOrder: 62 },
  { code: 'SETTINGS_COLORS', name: 'Manage Colors', nameAr: 'إدارة الألوان', module: 'colors', moduleAr: 'الألوان', category: 'settings', actions: ['view', 'edit'], sortOrder: 63 },
  { code: 'SETTINGS_LOGO', name: 'Manage Logo', nameAr: 'إدارة الشعار', module: 'logo', moduleAr: 'الشعار', category: 'settings', actions: ['view', 'edit'], sortOrder: 64 },
  { code: 'SETTINGS_TYPOGRAPHY', name: 'Manage Typography', nameAr: 'إدارة الخطوط', module: 'typography', moduleAr: 'الخطوط', category: 'settings', actions: ['view', 'edit'], sortOrder: 65 },
  { code: 'SETTINGS_LAYOUT', name: 'Manage Layout', nameAr: 'إدارة التخطيط', module: 'layout', moduleAr: 'التخطيط', category: 'settings', actions: ['view', 'edit'], sortOrder: 66 },
  { code: 'SETTINGS_CONTENT', name: 'Manage Site Content', nameAr: 'إدارة محتوى الموقع', module: 'site-content', moduleAr: 'محتوى الموقع', category: 'settings', actions: ['view', 'edit'], sortOrder: 67 },
  { code: 'SETTINGS_PAGES', name: 'Manage Pages', nameAr: 'إدارة الصفحات', module: 'pages', moduleAr: 'الصفحات', category: 'settings', actions: ['view', 'edit'], sortOrder: 68 },
  { code: 'SETTINGS_ANNOUNCEMENTS', name: 'Manage Announcements', nameAr: 'إدارة الإعلانات', module: 'announcements', moduleAr: 'الإعلانات', category: 'settings', actions: ['view', 'create', 'edit', 'delete'], sortOrder: 69 },
  { code: 'SETTINGS_BANNERS', name: 'Manage Banners', nameAr: 'إدارة البانرات', module: 'banners', moduleAr: 'البانرات', category: 'settings', actions: ['view', 'create', 'edit', 'delete'], sortOrder: 70 },
  { code: 'SETTINGS_EMAIL_TEMPLATES', name: 'Manage Email Templates', nameAr: 'إدارة قوالب البريد', module: 'email-templates', moduleAr: 'قوالب البريد', category: 'settings', actions: ['view', 'edit'], sortOrder: 71 },
  { code: 'SETTINGS_CONTACT', name: 'Manage Contact Info', nameAr: 'إدارة معلومات الاتصال', module: 'contact', moduleAr: 'الاتصال', category: 'settings', actions: ['view', 'edit'], sortOrder: 72 },
  { code: 'SETTINGS_SOCIAL', name: 'Manage Social Media', nameAr: 'إدارة وسائل التواصل', module: 'social', moduleAr: 'التواصل', category: 'settings', actions: ['view', 'edit'], sortOrder: 73 },
  { code: 'SETTINGS_FEATURES', name: 'Manage Features', nameAr: 'إدارة الميزات', module: 'features', moduleAr: 'الميزات', category: 'settings', actions: ['view', 'edit'], sortOrder: 74 },
  { code: 'SETTINGS_SEO', name: 'Manage SEO', nameAr: 'إدارة السيو', module: 'seo', moduleAr: 'السيو', category: 'settings', actions: ['view', 'edit'], sortOrder: 75 },
  { code: 'SETTINGS_FOOTER', name: 'Manage Footer', nameAr: 'إدارة التذييل', module: 'footer', moduleAr: 'التذييل', category: 'settings', actions: ['view', 'edit'], sortOrder: 76 },
  { code: 'SETTINGS_NAVIGATION', name: 'Manage Navigation', nameAr: 'إدارة التنقل', module: 'navigation', moduleAr: 'التنقل', category: 'settings', actions: ['view', 'edit'], sortOrder: 77 },
  { code: 'SETTINGS_LOCALIZATION', name: 'Manage Localization', nameAr: 'إدارة التوطين', module: 'localization', moduleAr: 'التوطين', category: 'settings', actions: ['view', 'edit'], sortOrder: 78 },
  { code: 'SETTINGS_SECURITY', name: 'Manage Security', nameAr: 'إدارة الأمان', module: 'security', moduleAr: 'الأمان', category: 'settings', actions: ['view', 'edit'], sortOrder: 79, isSystemPermission: true },
  { code: 'SETTINGS_LIMITS', name: 'Manage Limits', nameAr: 'إدارة الحدود', module: 'limits', moduleAr: 'الحدود', category: 'settings', actions: ['view', 'edit'], sortOrder: 80 },
  { code: 'SETTINGS_MAINTENANCE', name: 'Toggle Maintenance', nameAr: 'وضع الصيانة', module: 'maintenance', moduleAr: 'الصيانة', category: 'settings', actions: ['manage'], sortOrder: 81, isSystemPermission: true },
  
  { code: 'REPORTS_VIEW', name: 'View Reports', nameAr: 'عرض التقارير', module: 'reports', moduleAr: 'التقارير', category: 'reports', actions: ['view'], sortOrder: 70 },
  { code: 'REPORTS_EXPORT', name: 'Export Reports', nameAr: 'تصدير التقارير', module: 'reports', moduleAr: 'التقارير', category: 'reports', actions: ['export'], sortOrder: 71 },
  
  { code: 'NOTIFICATIONS_VIEW', name: 'View Notifications', nameAr: 'عرض الإشعارات', module: 'notifications', moduleAr: 'الإشعارات', category: 'system', actions: ['view'], sortOrder: 80 },
  { code: 'NOTIFICATIONS_SEND', name: 'Send Notifications', nameAr: 'إرسال إشعارات', module: 'notifications', moduleAr: 'الإشعارات', category: 'system', actions: ['create'], sortOrder: 81 },
  
  { code: 'LOGS_VIEW', name: 'View Logs', nameAr: 'عرض السجلات', module: 'logs', moduleAr: 'السجلات', category: 'system', actions: ['view'], sortOrder: 90 },
  { code: 'LOGS_EXPORT', name: 'Export Logs', nameAr: 'تصدير السجلات', module: 'logs', moduleAr: 'السجلات', category: 'system', actions: ['export'], sortOrder: 91 },
  
  { code: 'TEAM_VIEW', name: 'View Team', nameAr: 'عرض الفريق', module: 'team', moduleAr: 'الفريق', category: 'system', actions: ['view'], sortOrder: 100, isSystemPermission: true },
  { code: 'TEAM_MANAGE', name: 'Manage Team', nameAr: 'إدارة الفريق', module: 'team', moduleAr: 'الفريق', category: 'system', actions: ['create', 'edit', 'delete'], sortOrder: 101, isSystemPermission: true },
  { code: 'TEAM_PERMISSIONS', name: 'Manage Permissions', nameAr: 'إدارة الصلاحيات', module: 'team', moduleAr: 'الفريق', category: 'system', actions: ['manage'], sortOrder: 102, isSystemPermission: true },
  
  { code: 'AGE_GROUPS_VIEW', name: 'View Age Groups', nameAr: 'عرض الفئات العمرية', module: 'age-groups', moduleAr: 'الفئات العمرية', category: 'content', actions: ['view'], sortOrder: 110 },
  { code: 'AGE_GROUPS_MANAGE', name: 'Manage Age Groups', nameAr: 'إدارة الفئات العمرية', module: 'age-groups', moduleAr: 'الفئات العمرية', category: 'content', actions: ['create', 'edit', 'delete'], sortOrder: 111 }
];

module.exports.defaultPermissions = defaultPermissions;
