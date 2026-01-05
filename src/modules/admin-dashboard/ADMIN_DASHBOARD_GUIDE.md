# لوحة التحكم الإدارية (Admin Dashboard) - دليل شامل

## نظرة عامة

لوحة تحكم إدارية مستقلة وآمنة تماماً، منفصلة عن نظام الدخول الرئيسي للموقع. توفر جميع الأدوات اللازمة لإدارة الموقع والمدونة.

## الميزات الرئيسية

✅ **مستقلة تماماً** - لا تعتمد على أدوار المستخدمين الأساسية
✅ **آمنة جداً** - مصادقة من خلال Admin Keys مشفرة
✅ **عزل كامل** - رابط خاص وحماية CSRF و XSS
✅ **تسجيل شامل** - سجل كامل لجميع العمليات
✅ **نسخ احتياطية تلقائية** - نسخ احتياطية منتظمة ومجدولة
✅ **API Integrations** - مزامنة مع خدمات خارجية

---

## المتطلبات

### Backend Dependencies

```bash
npm install \
  mongoose \
  express \
  jsonwebtoken \
  bcryptjs \
  multer \
  xss \
  ua-parser-js \
  cron \
  axios \
  helmet \
  cors \
  express-rate-limit
```

### ملفات البيئة (.env)

```env
# Admin Dashboard
ADMIN_DASHBOARD_URL=https://yourdomain.com/sys-admin-secure-panel
ENCRYPTION_KEY=your-32-character-hex-encryption-key

# Database
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# Security
JWT_SECRET=your-jwt-secret-key
CSRF_TOKEN_SECRET=your-csrf-secret

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Backup
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
```

---

## البنية الهندسية

```
src/modules/admin-dashboard/
├── models/
│   ├── AdminLog.js          # سجل العمليات
│   ├── AdminKey.js          # مفاتيح المسؤول المشفرة
│   ├── SystemSettings.js    # إعدادات النظام
│   └── Webhook.js           # الـ Webhooks للمزامنة
│
├── controllers/
│   ├── dashboardController.js    # لوحة التحكم الرئيسية
│   ├── postsController.js        # إدارة المقالات
│   ├── mediaController.js        # إدارة الوسائط
│   ├── usersController.js        # إدارة المستخدمين
│   └── settingsController.js     # الإعدادات والنسخ الاحتياطية
│
├── middleware/
│   └── adminAuth.js         # المصادقة والأمان
│
├── services/
│   └── integrations.js      # API Integrations والنسخ الاحتياطية
│
├── utils/
│   └── security.js          # أدوات الأمان
│
├── routes/
│   └── index.js             # جميع الـ Routes
│
└── tests/
    └── admin-dashboard.test.js
```

---

## كيفية الاستخدام

### 1. تثبيت الـ Admin Dashboard

أضف المسار في `server.js`:

```javascript
const adminDashboardRoutes = require('./src/modules/admin-dashboard/routes');

// بعد إعداد Express والـ middleware
app.use('/sys-admin-secure-panel/api', adminDashboardRoutes);
```

### 2. إنشاء أول Admin Key

```bash
# استخدم هذا الـ Script

const AdminKey = require('./src/modules/admin-dashboard/models/AdminKey');
const mongoose = require('mongoose');

async function createFirstAdminKey() {
  await mongoose.connect(process.env.MONGODB_URI);

  const { rawKey, hashedKey, keyPrefix } = AdminKey.generateKey();

  const adminKey = new AdminKey({
    keyName: 'Primary Admin Key',
    hashedKey,
    keyPrefix,
    description: 'First admin key for the dashboard',
    permissions: [
      'view_dashboard',
      'manage_posts',
      'manage_media',
      'manage_users',
      'view_logs',
      'manage_system_settings',
      'manage_backups',
      'manage_api_integrations',
      'delete_logs',
      'export_data',
    ],
    isActive: true,
  });

  await adminKey.save();

  console.log('✅ Admin Key Created!');
  console.log('🔑 Raw Key (Save it securely):');
  console.log(rawKey);
  console.log('---');
  console.log('Use this in headers: x-admin-key: ' + rawKey);

  process.exit(0);
}

createFirstAdminKey();
```

### 3. الوصول إلى لوحة التحكم

**عبر HTTP Header:**
```bash
curl -H "x-admin-key: your-admin-key-here" \
  https://yourdomain.com/sys-admin-secure-panel/api/overview
```

**عبر Query Parameter:**
```
https://yourdomain.com/sys-admin-secure-panel/api/overview?adminKey=your-admin-key-here
```

---

## الـ APIs

### Dashboard

#### الحصول على نظرة عامة
```
GET /sys-admin-secure-panel/api/overview?days=7
Headers: x-admin-key: your-key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "days": 7 },
    "stats": [
      {
        "_id": "CREATE_POST",
        "count": 45,
        "successCount": 43,
        "failedCount": 2
      }
    ],
    "topAdmins": [],
    "failureRate": {
      "total": 100,
      "failed": 5,
      "successRate": 95
    }
  }
}
```

### Activity Logs

#### الحصول على السجلات
```
GET /sys-admin-secure-panel/api/logs?page=1&limit=50&actionType=CREATE_POST
```

#### تصدير السجلات
```
GET /sys-admin-secure-panel/api/logs/export?startDate=2024-01-01&endDate=2024-01-31
```

### Posts Management

#### الحصول على المقالات
```
GET /sys-admin-secure-panel/api/posts?page=1&limit=20&status=PUBLISHED
```

#### إنشاء مقالة
```
POST /sys-admin-secure-panel/api/posts/create
Content-Type: application/json

{
  "title": "عنوان المقالة",
  "description": "وصف قصير",
  "content": "<p>محتوى المقالة</p>",
  "status": "DRAFT",
  "tags": ["تاج1", "تاج2"],
  "featuredImage": "image-url"
}
```

#### تحديث مقالة
```
PUT /sys-admin-secure-panel/api/posts/:postId
Content-Type: application/json

{
  "title": "عنوان جديد",
  "status": "PUBLISHED"
}
```

#### حذف مقالة
```
DELETE /sys-admin-secure-panel/api/posts/:postId
```

#### حذف مقالات متعددة
```
POST /sys-admin-secure-panel/api/posts/bulk-delete
Content-Type: application/json

{
  "postIds": ["id1", "id2", "id3"]
}
```

### Media Management

#### الحصول على الوسائط
```
GET /sys-admin-secure-panel/api/media?page=1&limit=20&type=image
```

#### رفع وسيط
```
POST /sys-admin-secure-panel/api/media/upload
Content-Type: multipart/form-data

file: <binary-file-data>
```

#### حذف وسيط
```
DELETE /sys-admin-secure-panel/api/media/:mediaId
```

#### إحصائيات التخزين
```
GET /sys-admin-secure-panel/api/media/storage/stats
```

### Users Management

#### الحصول على المستخدمين
```
GET /sys-admin-secure-panel/api/users?page=1&limit=20&role=player&status=active
```

#### تحديث بيانات المستخدم
```
PUT /sys-admin-secure-panel/api/users/:userId
Content-Type: application/json

{
  "name": "اسم جديد",
  "email": "newemail@example.com",
  "isActive": true
}
```

#### تعطيل المستخدم
```
POST /sys-admin-secure-panel/api/users/:userId/deactivate
```

#### إحصائيات المستخدمين
```
GET /sys-admin-secure-panel/api/users/statistics/overview
```

### System Settings

#### الحصول على الإعدادات
```
GET /sys-admin-secure-panel/api/settings
```

#### تحديث الإعدادات
```
PUT /sys-admin-secure-panel/api/settings
Content-Type: application/json

{
  "siteName": "اسم الموقع",
  "adminEmail": "admin@example.com",
  "theme": {
    "primaryColor": "#2563eb",
    "darkMode": false
  }
}
```

#### حالة النظام
```
GET /sys-admin-secure-panel/api/settings/health
```

### Backups

#### الحصول على النسخ الاحتياطية
```
GET /sys-admin-secure-panel/api/backups
```

#### إنشاء نسخة احتياطية
```
POST /sys-admin-secure-panel/api/backups/create
Content-Type: application/json

{
  "backupType": "full",
  "includeFiles": true
}
```

#### تحميل النسخة الاحتياطية
```
GET /sys-admin-secure-panel/api/backups/:backupName/download
```

---

## الأمان والحماية

### 1. مصادقة Admin Key

- كل مفتاح يتم تشفيره بـ SHA-256
- يتم التحقق من صلاحية انتهاء الصلاحية
- قائمة بيضاء للـ IP Addresses (اختياري)
- حد أقصى لعدد الطلبات (Rate Limiting)

### 2. حماية من الهجمات

**XSS Protection:**
```javascript
const SecurityUtils = require('./utils/security');
const cleanInput = SecurityUtils.sanitizeInput(userInput);
```

**SQL Injection Prevention:**
```javascript
const isValid = SecurityUtils.validateAgainstSQLInjection(input);
```

**CSRF Protection:**
```javascript
// كل طلب POST يتطلب CSRF Token
X-CSRF-Token: token-value
```

**Rate Limiting:**
```javascript
const rateLimiting = SecurityUtils.checkRateLimit(ipAddress, {
  requests: 100,
  windowMs: 3600000, // 1 hour
});
```

### 3. تسجيل العمليات

كل عملية يتم تسجيلها مع:
- معرف المسؤول
- نوع العملية
- IP Address و User Agent
- البيانات قبل وبعد التغيير
- حالة النجاح/الفشل

---

## النسخ الاحتياطية والمزامنة

### تفعيل النسخ الاحتياطية التلقائية

```javascript
const APIIntegrations = require('./services/integrations');

// قم بتفعيل النسخ الاحتياطية يومياً في الساعة 2 صباحاً
APIIntegrations.configureAutoBackups('0 2 * * *');
```

### المزامنة مع خدمات خارجية

```javascript
await APIIntegrations.syncToExternalService(req, 'dropbox', {
  accessToken: 'your-token',
  filename: 'backup.zip'
}, dataToSync);
```

### تسجيل Webhooks

```javascript
await APIIntegrations.registerWebhook(req, 
  ['post.created', 'post.updated'],
  'https://yourservice.com/webhooks/admin'
);
```

---

## أمثلة الاستخدام

### مثال 1: إنشاء مقالة جديدة

```javascript
const response = await fetch(
  'https://yourdomain.com/sys-admin-secure-panel/api/posts/create',
  {
    method: 'POST',
    headers: {
      'x-admin-key': 'your-admin-key',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      title: 'مقالتي الأولى',
      content: 'محتوى المقالة',
      status: 'DRAFT',
      tags: ['tech', 'news'],
    }),
  }
);

const data = await response.json();
console.log(data);
```

### مثال 2: الحصول على إحصائيات النشاط

```javascript
const response = await fetch(
  'https://yourdomain.com/sys-admin-secure-panel/api/overview?days=30',
  {
    headers: {
      'x-admin-key': 'your-admin-key',
    },
  }
);

const overview = await response.json();
console.log('Top Admins:', overview.data.topAdmins);
console.log('Success Rate:', overview.data.failureRate.successRate);
```

### مثال 3: إدارة الوسائط

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  'https://yourdomain.com/sys-admin-secure-panel/api/media/upload',
  {
    method: 'POST',
    headers: {
      'x-admin-key': 'your-admin-key',
    },
    body: formData,
  }
);

const media = await response.json();
console.log('Media ID:', media.data._id);
```

---

## استكشاف الأخطاء

### خطأ: "Admin key required"
```
الحل: تأكد من إضافة رأس x-admin-key في الطلب
```

### خطأ: "Invalid admin key"
```
الحل: تحقق من صحة مفتاح المسؤول وأنه نشط
```

### خطأ: "IP not whitelisted"
```
الحل: أضف عنوان IP الخاص بك إلى قائمة المفتاح البيضاء
```

### خطأ: "CSRF token missing"
```
الحل: أضف رأس x-csrf-token في جميع طلبات POST
```

---

## الصيانة والمراقبة

### فحص صحة النظام

```javascript
GET /sys-admin-secure-panel/api/settings/health
```

### مراقبة الموارد

- استهلاك الذاكرة
- مساحة القرص
- استخدام CPU
- اتصال قاعدة البيانات

### تنظيف السجلات القديمة

يتم حذف السجلات تلقائياً بعد 180 يومًا.

---

## الخلاصة

- **منفصلة تماماً** عن نظام المستخدمين الأساسي
- **آمنة جداً** مع مصادقة Admin Key والتشفير
- **شاملة** لجميع أدوات الإدارة المطلوبة
- **مرنة** مع إمكانية التوسع والتكامل
- **مؤمنة** ضد الهجمات الشائعة

---

**تم الإنشاء:** يناير 2025
**الإصدار:** 1.0.0
