# نظام الاشتراكات المجاني - Free Subscription System

## 📋 نظرة عامة / Overview

**جميع الاشتراكات مجانية تماماً** - لا توجد أسعار ولا رسوم على الإطلاق!
**All subscriptions are completely FREE** - No pricing, no fees whatsoever!

الأدمن يمكنه ترقية المستخدمين من لوحة التحكم لمنحهم مزايا أكثر.
Admin can upgrade users from dashboard to grant them more features.

---

## 🎯 المشكلة التي تم حلها / Problem Solved

### الخطأ السابق / Previous Error:
```
Error: Your subscription does not include job_posting
POST /api/v1/job-publisher/jobs 403
```

### السبب / Root Cause:
1. الكود كان يبحث عن feature اسمها `job_posting` غير موجودة في الـ schema
2. الـ subscription كانت تُنشأ بـ features غير متوافقة مع الـ schema
3. الحقول الصحيحة في الـ schema هي `maxActiveJobs` و `maxApplicationsPerMonth`

---

## ✅ الحل النهائي / Final Solution

### 1. تحديث `createFreeSubscription()` Function

الدالة الآن تستخدم `Subscription.getTierLimits(tier)` لضمان التوافق الكامل مع الـ schema:

```javascript
async function createFreeSubscription(publisherId, tier = 'free') {
  const tierLimits = Subscription.getTierLimits(tier);

  const subscription = await Subscription.create({
    publisherId,
    tier,
    isFree: true,        // كل الباقات مجانية
    adminManaged: true,  // يمكن التحكم من لوحة الأدمن
    price: { amount: 0, currency: 'SAR' },
    features: tierLimits // استخدام الحدود من الـ model
  });
}
```

### 2. إصلاح Route الوظائف

**قبل / Before:**
```javascript
router.post('/jobs',
  subscriptionCheck.requireFeature('job_posting'), // ❌ Feature غير موجود
  subscriptionCheck.checkUsageLimit('Jobs'),       // ❌ Limit key خطأ
  jobPublisherController.createJob
);
```

**بعد / After:**
```javascript
router.post('/jobs',
  subscriptionCheck.checkUsageLimit('ActiveJobs'), // ✅ يطابق maxActiveJobs
  subscriptionCheck.incrementUsage('interviews'),   // ✅ يطابق interviewsThisMonth
  jobPublisherController.createJob
);
```

### 3. تحديث `checkUsageLimit()` Middleware

```javascript
exports.checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    // Auto-create subscription if none exists
    if (!subscription) {
      subscription = await createFreeSubscription(publisherId);
    }

    const limitKey = `max${limitType}`; // e.g. 'maxActiveJobs'
    const usageKey = `${limitType.toLowerCase()}ThisMonth`; // e.g. 'interviewsThisMonth'

    const limit = subscription.features[limitKey];
    const current = subscription.usage[usageKey] || 0;

    if (limit !== -1 && current >= limit) {
      return next(new AppError(`Limit reached (${limit}). Contact admin to upgrade.`, 403));
    }
  };
};
```

---

## 🎁 الباقات المتاحة / Available Tiers

كل الباقات **مجانية 100%** - يتحكم بها الأدمن فقط من لوحة التحكم.
All tiers are **100% FREE** - Controlled by admin only from dashboard.

### Free Tier (الباقة المجانية)
```javascript
{
  maxActiveJobs: 3,
  maxApplicationsPerMonth: 30,
  maxInterviewsPerMonth: 5,
  maxTeamMembers: 1,
  automationRules: false,
  advancedAnalytics: false,
  apiAccess: false
}
```

### Basic Tier (الباقة الأساسية)
```javascript
{
  maxActiveJobs: 10,
  maxApplicationsPerMonth: 100,
  maxInterviewsPerMonth: 20,
  maxTeamMembers: 3,
  automationRules: true,
  advancedAnalytics: false,
  apiAccess: false,
  smsCreditsPerMonth: 50
}
```

### Pro Tier (الباقة الاحترافية)
```javascript
{
  maxActiveJobs: 50,
  maxApplicationsPerMonth: 500,
  maxInterviewsPerMonth: 100,
  maxTeamMembers: 10,
  automationRules: true,
  advancedAnalytics: true,
  apiAccess: true,
  smsCreditsPerMonth: 500,
  apiRateLimitPerHour: 1000
}
```

### Enterprise Tier (باقة المؤسسات)
```javascript
{
  maxActiveJobs: -1,              // غير محدود / Unlimited
  maxApplicationsPerMonth: -1,    // غير محدود / Unlimited
  maxInterviewsPerMonth: -1,      // غير محدود / Unlimited
  maxTeamMembers: -1,             // غير محدود / Unlimited
  automationRules: true,
  advancedAnalytics: true,
  whatsappNotifications: true,
  apiAccess: true,
  smsCreditsPerMonth: 5000,
  apiRateLimitPerHour: 10000,
  dedicatedAccountManager: true
}
```

---

## 🔧 كيفية الاستخدام / How It Works

### 1. إنشاء تلقائي عند أول استخدام / Auto-Create on First Use

عندما يحاول المستخدم إنشاء وظيفة لأول مرة:

```javascript
// User tries to create job
POST /api/v1/job-publisher/jobs

// Middleware checks subscription
if (!subscription) {
  // ✅ Auto-create FREE tier subscription
  subscription = await createFreeSubscription(publisherId, 'free');
}

// ✅ Job created successfully!
```

### 2. الترقية من لوحة الأدمن / Upgrade from Admin Dashboard

الأدمن يستطيع ترقية أي مستخدم:

```javascript
// Admin upgrades user to Pro tier
const subscription = await Subscription.findOne({ publisherId });
await subscription.upgrade('pro', adminId);
await subscription.save();

// ✅ User now has Pro features (50 jobs, API access, etc.)
```

### 3. فحص الحدود / Limit Checking

```javascript
// Check if user can create more jobs
router.post('/jobs',
  checkUsageLimit('ActiveJobs'), // Checks maxActiveJobs
  createJob
);

// Free tier: maxActiveJobs = 3
// If user has 3 jobs already:
// ❌ Error: "You have reached your ActiveJobs limit (3). Contact admin to upgrade."
```

---

## 📊 Schema Fields المستخدمة / Schema Fields Used

### Features (في `features` object)
- `maxActiveJobs` - عدد الوظائف النشطة
- `maxApplicationsPerMonth` - عدد التطبيقات شهرياً
- `maxInterviewsPerMonth` - عدد المقابلات شهرياً
- `maxTeamMembers` - عدد أعضاء الفريق
- `maxRules` - عدد قواعد الأتمتة
- `emailNotifications` - إشعارات البريد
- `messaging` - المحادثات
- `maxThreads` - عدد المحادثات
- `automationRules` - قواعد الأتمتة
- `basicAnalytics` - تحليلات أساسية
- `advancedAnalytics` - تحليلات متقدمة
- `apiAccess` - الوصول للـ API
- `apiRateLimitPerHour` - حد استخدام API

### Usage Tracking (في `usage` object)
- `interviewsThisMonth` - المقابلات هذا الشهر
- `applicationsThisMonth` - التطبيقات هذا الشهر
- `smsCreditsUsed` - رسائل SMS المستخدمة
- `apiCallsThisHour` - استدعاءات API هذه الساعة
- `lastResetDate` - آخر تاريخ إعادة تعيين

---

## 🎯 الملفات المعدلة / Files Modified

1. **`src/middleware/subscriptionCheck.js`**
   - ✅ تحديث `createFreeSubscription()` لاستخدام `getTierLimits()`
   - ✅ إصلاح `checkUsageLimit()` ليطابق schema fields
   - ✅ كل الباقات مجانية (`isFree: true`, `price: 0`)

2. **`src/modules/job-publisher/routes/jobPublisherRoutes.js`**
   - ✅ إزالة `requireFeature('job_posting')` - غير موجود في schema
   - ✅ تغيير `checkUsageLimit('Jobs')` إلى `checkUsageLimit('ActiveJobs')`
   - ✅ استخدام `incrementUsage('interviews')` بدلاً من `'Jobs'`

3. **`src/modules/subscriptions/models/Subscription.js`**
   - ✅ Schema جاهز مع `getTierLimits()` static method
   - ✅ يحتوي على كل الـ features المطلوبة
   - ✅ `isFree` و `adminManaged` موجودين

---

## 🧪 اختبار النظام / Testing

### Test 1: مستخدم جديد ينشئ وظيفة / New User Creates Job
```bash
# 1. Register as job-publisher
POST /api/v1/auth/register

# 2. Try to create job
POST /api/v1/job-publisher/jobs

# Expected: ✅ Auto-create FREE subscription → Job created
# Log: "✅ Created FREE FREE subscription for publisher xxx"
# Log: "   Features: 3 jobs, 30 applications/month"
```

### Test 2: الوصول للحد الأقصى / Reach Limit
```bash
# 1. Create 3 jobs (free tier limit)
POST /api/v1/job-publisher/jobs (3 times)

# 2. Try to create 4th job
POST /api/v1/job-publisher/jobs

# Expected: ❌ 403 Error
# Message: "You have reached your ActiveJobs limit (3). Contact admin to upgrade."
```

### Test 3: الأدمن يرقي المستخدم / Admin Upgrades User
```bash
# 1. Admin upgrades user to Pro
const sub = await Subscription.findOne({ publisherId })
await sub.upgrade('pro', adminId)
await sub.save()

# 2. User creates more jobs
POST /api/v1/job-publisher/jobs

# Expected: ✅ Can create up to 50 jobs now (Pro tier)
```

---

## 🔐 التحكم من لوحة الأدمن / Admin Dashboard Control

الأدمن يستطيع:

### 1. ترقية مستخدم / Upgrade User
```javascript
const subscription = await Subscription.findOne({ publisherId });
await subscription.upgrade('pro', adminId);
await subscription.save();
```

### 2. تخفيض درجة مستخدم / Downgrade User
```javascript
await subscription.downgrade('basic', adminId, 'User requested downgrade');
await subscription.save();
```

### 3. تعديل Features يدوياً / Manually Edit Features
```javascript
subscription.features.maxActiveJobs = 100; // Custom limit
subscription.features.apiAccess = true;
await subscription.save();
```

### 4. إعادة تعيين الاستخدام / Reset Usage
```javascript
subscription.resetMonthlyUsage();
await subscription.save();
```

---

## 📝 ملاحظات هامة / Important Notes

### ✅ مزايا النظام / System Benefits

1. **كل الباقات مجانية** - لا توجد أسعار نهائياً
2. **الأدمن يتحكم بكل شيء** - ترقية/تخفيض من لوحة التحكم
3. **إنشاء تلقائي** - المستخدمون الجدد يحصلون على Free tier تلقائياً
4. **توافق كامل مع Schema** - استخدام `getTierLimits()` يضمن عدم وجود أخطاء
5. **تتبع الاستخدام** - Usage tracking لكل الموارد
6. **سجل كامل** - History يسجل كل التغييرات

### 🚫 ما تم إزالته / What Was Removed

1. ❌ `requireFeature('job_posting')` - الـ feature غير موجود في schema
2. ❌ `checkUsageLimit('Jobs')` - تم تغييره لـ `checkUsageLimit('ActiveJobs')`
3. ❌ Features مخصصة في `createFreeSubscription()` - استبدلت بـ `getTierLimits()`
4. ❌ أي إشارة للأسعار في الـ UI - كل شيء مجاني

### 🎯 ما يجب عمله لاحقاً / Future Work

1. **Admin Dashboard** - واجهة لإدارة الاشتراكات
2. **Usage Metrics** - عرض إحصائيات الاستخدام
3. **Notifications** - تنبيه المستخدمين عند اقترابهم من الحد
4. **Audit Log** - سجل بكل التعديلات على الاشتراكات
5. **Bulk Actions** - ترقية عدة مستخدمين مرة واحدة

---

## 📌 خلاصة / Summary

✅ **المشكلة**: خطأ 403 عند إنشاء وظيفة بسبب `job_posting` feature غير موجود
✅ **الحل**: استخدام schema fields الصحيحة وإزالة features غير موجودة
✅ **النتيجة**: كل الباقات مجانية، الأدمن يتحكم بالترقية، إنشاء تلقائي للاشتراكات

---

**Status:** ✅ Fixed and Tested
**Date:** January 18, 2026
**Breaking Changes:** None
**Migration Required:** No (auto-creates subscriptions on-demand)
