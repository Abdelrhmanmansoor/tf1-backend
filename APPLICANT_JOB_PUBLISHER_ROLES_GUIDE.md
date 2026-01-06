# دليل أدوار الباحث عن وظيفة وناشر الوظائف
# Applicant and Job Publisher Roles Guide

## نظرة عامة | Overview

تم إضافة دورين جديدين إلى النظام:
- **باحث عن وظيفة (Applicant)**: يمكنه البحث عن الوظائف والتقديم عليها
- **ناشر الوظائف (Job Publisher)**: يمكنه نشر وإدارة الوظائف واستقبال الطلبات

Two new roles have been added to the system:
- **Applicant**: Can search for jobs and apply to them
- **Job Publisher**: Can publish and manage jobs and receive applications

---

## التغييرات في Backend | Backend Changes

### 1. User Model (`src/modules/shared/models/User.js`)
- تم إضافة `'applicant'` و `'job-publisher'` إلى enum الأدوار
- Added `'applicant'` and `'job-publisher'` to role enum

### 2. Roles Configuration (`src/config/roles.js`)
- تم إضافة الأدوار الجديدة إلى `ROLES`
- تم إضافة الصلاحيات الجديدة:
  - `VIEW_JOBS`: عرض الوظائف
  - `APPLY_TO_JOBS`: التقديم على الوظائف
  - `MANAGE_JOB_APPLICATIONS`: إدارة طلبات التقديم
  - `PUBLISH_JOBS`: نشر الوظائف
  - `MANAGE_OWN_JOBS`: إدارة الوظائف الخاصة
  - `VIEW_JOB_APPLICATIONS`: عرض طلبات التقديم
- تم ربط الصلاحيات بالأدوار في `ROLE_PERMISSIONS`

### 3. Job Model (`src/modules/club/models/Job.js`)
- تم إضافة حقل `publishedBy` لتتبع ناشر الوظيفة
- Added `publishedBy` field to track job publisher

### 4. Jobs Controller (`src/controllers/jobsController.js`)
- تم تعديل `applyToJob` ليقبل فقط دور `applicant`
- Modified `applyToJob` to only accept `applicant` role

### 5. Applicant Module
**Controller** (`src/modules/applicant/controllers/applicantController.js`):
- `getDashboard`: الحصول على بيانات لوحة التحكم
- `getMyApplications`: الحصول على جميع طلبات التقديم
- `getApplicationDetails`: الحصول على تفاصيل طلب تقديم محدد
- `withdrawApplication`: سحب طلب تقديم
- `getAvailableJobs`: الحصول على الوظائف المتاحة

**Routes** (`src/modules/applicant/routes/applicantRoutes.js`):
- `GET /api/v1/applicant/dashboard`
- `GET /api/v1/applicant/applications`
- `GET /api/v1/applicant/applications/:applicationId`
- `PUT /api/v1/applicant/applications/:applicationId/withdraw`
- `GET /api/v1/applicant/jobs`

### 6. Job Publisher Module
**Controller** (`src/modules/job-publisher/controllers/jobPublisherController.js`):
- `getDashboard`: الحصول على بيانات لوحة التحكم
- `getMyJobs`: الحصول على جميع الوظائف المنشورة
- `createJob`: إنشاء وظيفة جديدة
- `updateJob`: تحديث وظيفة
- `deleteJob`: حذف وظيفة
- `getJobApplications`: الحصول على طلبات التقديم لوظيفة محددة
- `updateApplicationStatus`: تحديث حالة طلب التقديم

**Routes** (`src/modules/job-publisher/routes/jobPublisherRoutes.js`):
- `GET /api/v1/job-publisher/dashboard`
- `GET /api/v1/job-publisher/jobs`
- `POST /api/v1/job-publisher/jobs`
- `PUT /api/v1/job-publisher/jobs/:jobId`
- `DELETE /api/v1/job-publisher/jobs/:jobId`
- `GET /api/v1/job-publisher/jobs/:jobId/applications`
- `PUT /api/v1/job-publisher/applications/:applicationId/status`

### 7. Routes Index (`src/routes/index.js`)
- تم إضافة routes للأدوار الجديدة:
  - `/applicant`
  - `/job-publisher`

---

## التغييرات في Frontend | Frontend Changes

### 1. Types (`types/auth.ts`)
- تم إضافة `'job-publisher'` إلى `UserRole` type

### 2. Role Routes (`utils/role-routes.ts`)
- تم إضافة مسارات لوحات التحكم:
  - `applicant: '/dashboard/applicant'`
  - `'job-publisher': '/dashboard/job-publisher'`

### 3. Middleware (`middleware.ts`)
- تم إضافة المسارات المسموحة لدور `job-publisher`

### 4. Protected Route (`components/ProtectedRoute.tsx`)
- تم إضافة مسار لوحة التحكم لدور `job-publisher`

### 5. Dashboard Page (`app/dashboard/page.tsx`)
- تم إضافة redirect للأدوار الجديدة

### 6. Applicant Dashboard
- **Page**: `app/dashboard/applicant/page.tsx` (موجود مسبقاً)
- يعرض الوظائف المتاحة وطلبات التقديم

### 7. Job Publisher Dashboard
- **Component**: `components/dashboards/JobPublisherDashboard.tsx`
- **Page**: `app/dashboard/job-publisher/page.tsx`
- يعرض إحصائيات الوظائف والطلبات

---

## الصلاحيات | Permissions

### Applicant Role
- `VIEW_JOBS`: عرض الوظائف
- `APPLY_TO_JOBS`: التقديم على الوظائف
- `MANAGE_JOB_APPLICATIONS`: إدارة طلبات التقديم الخاصة

### Job Publisher Role
- `PUBLISH_JOBS`: نشر الوظائف
- `MANAGE_OWN_JOBS`: إدارة الوظائف الخاصة
- `VIEW_JOB_APPLICATIONS`: عرض طلبات التقديم
- `VIEW_JOBS`: عرض الوظائف

---

## كيفية الاستخدام | How to Use

### تسجيل مستخدم جديد بدور Applicant
1. قم بالتسجيل مع اختيار دور `applicant`
2. بعد تسجيل الدخول، سيتم توجيهك إلى `/dashboard/applicant`
3. يمكنك استكشاف الوظائف والتقديم عليها

### تسجيل مستخدم جديد بدور Job Publisher
1. قم بالتسجيل مع اختيار دور `job-publisher`
2. بعد تسجيل الدخول، سيتم توجيهك إلى `/dashboard/job-publisher`
3. يمكنك نشر الوظائف وإدارة الطلبات

---

## ملاحظات مهمة | Important Notes

1. **التقديم على الوظائف**: فقط المستخدمون بدور `applicant` يمكنهم التقديم على الوظائف
2. **نشر الوظائف**: فقط المستخدمون بدور `job-publisher` يمكنهم نشر الوظائف
3. **إدارة الطلبات**: كل ناشر وظائف يمكنه إدارة الطلبات على وظائفه فقط
4. **الحقل publishedBy**: عند إنشاء وظيفة جديدة من قبل job-publisher، يتم تعيين `publishedBy` تلقائياً

---

## الاختبار | Testing

للتحقق من أن النظام يعمل بشكل صحيح:

1. **تسجيل الدخول بدور Applicant**:
   - يجب أن يتم توجيهك إلى `/dashboard/applicant`
   - يجب أن تتمكن من عرض الوظائف والتقديم عليها

2. **تسجيل الدخول بدور Job Publisher**:
   - يجب أن يتم توجيهك إلى `/dashboard/job-publisher`
   - يجب أن تتمكن من نشر الوظائف وإدارة الطلبات

3. **الصلاحيات**:
   - يجب أن يتم رفض محاولة التقديم على وظيفة من قبل مستخدم ليس بدور `applicant`
   - يجب أن يتم رفض محاولة نشر وظيفة من قبل مستخدم ليس بدور `job-publisher`

---

## API Endpoints Summary

### Applicant Endpoints
- `GET /api/v1/applicant/dashboard` - Dashboard data
- `GET /api/v1/applicant/applications` - My applications
- `GET /api/v1/applicant/applications/:id` - Application details
- `PUT /api/v1/applicant/applications/:id/withdraw` - Withdraw application
- `GET /api/v1/applicant/jobs` - Available jobs

### Job Publisher Endpoints
- `GET /api/v1/job-publisher/dashboard` - Dashboard data
- `GET /api/v1/job-publisher/jobs` - My jobs
- `POST /api/v1/job-publisher/jobs` - Create job
- `PUT /api/v1/job-publisher/jobs/:id` - Update job
- `DELETE /api/v1/job-publisher/jobs/:id` - Delete job
- `GET /api/v1/job-publisher/jobs/:id/applications` - Job applications
- `PUT /api/v1/job-publisher/applications/:id/status` - Update application status

---

## الملفات المعدلة | Modified Files

### Backend
- `src/modules/shared/models/User.js`
- `src/config/roles.js`
- `src/modules/club/models/Job.js`
- `src/controllers/jobsController.js`
- `src/routes/index.js`
- `src/modules/applicant/controllers/applicantController.js` (جديد)
- `src/modules/applicant/routes/applicantRoutes.js` (جديد)
- `src/modules/job-publisher/controllers/jobPublisherController.js` (جديد)
- `src/modules/job-publisher/routes/jobPublisherRoutes.js` (جديد)

### Frontend
- `types/auth.ts`
- `utils/role-routes.ts`
- `middleware.ts`
- `components/ProtectedRoute.tsx`
- `app/dashboard/page.tsx`
- `components/dashboards/JobPublisherDashboard.tsx` (جديد)
- `app/dashboard/job-publisher/page.tsx` (جديد)

---

تم إكمال التطوير بنجاح! ✅
Development completed successfully! ✅

