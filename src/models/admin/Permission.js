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

permissionSchema.index({ code: 1 });
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
