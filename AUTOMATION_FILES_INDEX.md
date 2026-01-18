# 📑 فهرس ملفات نظام الأتمتة (Automation System Files Index)

## 📖 قائمة الملفات الكاملة

---

## 🗂️ 1. Backend - Core Files

### 1.1 Model (النموذج)
- **الملف**: `src/modules/automation/models/AutomationRule.js`
- **الوصف**: نموذج قاعدة الأتمتة الكامل مع جميع الحقول والميثودات
- **السطور**: 441 سطر
- **المحتوى الرئيسي**:
  - Schema كامل بجميع الحقول
  - Indexes للأداء
  - Static Methods (findActiveRulesForEvent, getTemplates, getStatistics)
  - Instance Methods (matchesConditions, isThrottled, recordExecution)
  - Condition Operators (10 معاملات)

### 1.2 Controller (المعالج)
- **الملف**: `src/modules/automation/controllers/automationController.js`
- **الوصف**: معالجات جميع API endpoints
- **السطور**: 380 سطر
- **الـ Endpoints**:
  - `getRules()` - GET /automations
  - `getRule()` - GET /automations/:id
  - `createRule()` - POST /automations
  - `updateRule()` - PATCH /automations/:id
  - `deleteRule()` - DELETE /automations/:id
  - `toggleRule()` - POST /automations/:id/toggle
  - `testRule()` - POST /automations/test
  - `getLogs()` - GET /automations/logs
  - `getTemplates()` - GET /automations/templates
  - `cloneTemplate()` - POST /automations/templates/:id/clone
  - `getStatistics()` - GET /automations/statistics

### 1.3 Service / Engine (محرك الأتمتة)
- **الملف**: `src/modules/automation/services/automationEngine.js`
- **الوصف**: المحرك الرئيسي لتنفيذ قواعد الأتمتة
- **السطور**: 569 سطر
- **الدوال الرئيسية**:
  - `trigger()` - تشغيل القواعد للحدث
  - `executeRule()` - تنفيذ قاعدة واحدة
  - `executeAction()` - تنفيذ إجراء واحد
  - **Action Handlers (10 إجراءات)**:
    - `actionSendNotification()` - إرسال إشعار
    - `actionCreateThread()` - إنشاء محادثة
    - `actionSendMessage()` - إرسال رسالة
    - `actionSendEmail()` - إرسال بريد
    - `actionScheduleInterview()` - جدولة مقابلة
    - `actionAssignToStage()` - تعيين مرحلة
    - `actionAddTag()` - إضافة وسم
    - `actionUpdateField()` - تحديث حقل
    - `actionWebhook()` - استدعاء webhook
  - `prepareVariables()` - تحضير المتغيرات
  - `replaceVariables()` - استبدال المتغيرات
  - `testRule()` - اختبار القاعدة

### 1.4 Routes (المسارات)
- **الملف**: `src/modules/automation/routes/automationRoutes.js`
- **الوصف**: تعريف المسارات والتحقق من الصلاحيات
- **السطور**: 91 سطر
- **المحتوى**:
  - Validation Rules (createRuleValidation, updateRuleValidation, testRuleValidation)
  - Authentication & Authorization Middleware
  - Route Definitions (11 route)

### 1.5 Integration Layer (طبقة التكامل)
- **الملف**: `src/modules/job-publisher/integrations/automationIntegration.js`
- **الوصف**: ربط الأحداث بمحرك الأتمتة
- **السطور**: 247 سطر
- **الـ Hooks**:
  - `onApplicationStatusChanged()` - عند تغيير حالة الطلب
  - `onApplicationSubmitted()` - عند تقديم طلب جديد
  - `onInterviewScheduled()` - عند جدولة مقابلة
  - `onInterviewCompleted()` - عند إكمال مقابلة
- **الـ Helpers**:
  - `prepareApplicationData()` - تحضير بيانات الطلب
  - `prepareInterviewData()` - تحضير بيانات المقابلة
  - `autoOpenMessagingThread()` - فتح محادثة تلقائياً
  - `withAutomationHooks()` - Middleware للأتمتة
  - `afterApplicationUpdate()` - Post-update hook

---

## 🗂️ 2. Related Models (النماذج المرتبطة)

### 2.1 Notification Model
- **الملف**: `src/models/Notification.js`
- **الوصف**: نموذج الإشعارات (مستخدم من SEND_NOTIFICATION)
- **السطور**: 416 سطر
- **الحقول الرئيسية**:
  - userId, userRole, type, title, message
  - relatedTo (entityType, entityId)
  - actionUrl
  - isRead, readAt
  - channels (inApp, email, push, sms)
  - deliveryStatus
  - priority, groupKey, expiresAt
  - jobId, applicationId, jobData, applicantData
- **الميثودات**:
  - `getUnreadCount()` - عدد غير المقروء
  - `getUserNotifications()` - جلب الإشعارات
  - `markAllAsRead()` - تعليم الكل كمقروء
  - `markAsRead()` - تعليم واحد كمقروء
  - `createNotification()` - إنشاء إشعار

### 2.2 MessageThread Model
- **الملف**: `src/modules/messaging/models/MessageThread.js`
- **الوصف**: نموذج المحادثات (مستخدم من CREATE_THREAD)
- **السطور**: 442 سطر
- **الحقول الرئيسية**:
  - type, participants, jobId, applicationId, interviewId
  - subject, status, lastMessage
  - unreadCounts, isSystemThread
  - applicantData, jobData, publisherData
  - settings (notificationsEnabled, emailNotifications)
- **الميثودات**:
  - `getUserThreads()` - جلب محادثات المستخدم
  - `findOrCreateForApplication()` - إيجاد أو إنشاء محادثة
  - `getUnreadCount()` - عدد غير المقروء
  - `addParticipant()` - إضافة مشارك
  - `updateLastMessage()` - تحديث آخر رسالة
  - `markAsRead()` - تعليم كمقروء

### 2.3 Interview Model
- **الملف**: `src/modules/interviews/models/Interview.js`
- **الوصف**: نموذج المقابلات (مستخدم من SCHEDULE_INTERVIEW)
- **ملاحظة**: لم يتم قراءة هذا الملف في الطلب الحالي، لكنه موجود في المشروع

### 2.4 JobApplication Model
- **الملف**: `src/modules/club/models/JobApplication.js`
- **الوصف**: نموذج طلبات التوظيف (مستخدم من ASSIGN_TO_STAGE, ADD_TAG)
- **ملاحظة**: لم يتم قراءة هذا الملف في الطلب الحالي، لكنه موجود في المشروع

---

## 🗂️ 3. Testing & Documentation

### 3.1 Automated Test Script
- **الملف**: `test-automation-system.js`
- **الوصف**: سكريبت اختبار آلي شامل للنظام
- **السطور**: 427 سطر
- **الاختبارات**:
  - Health Check
  - Subscription Management
  - Interview Scheduling
  - Messaging Threads
  - **Automation Tests**:
    - Create Automation Rule
    - Get Automations
    - Toggle Automation
    - Test Rule (Dry Run)
    - Get Statistics
- **الاستخدام**:
  ```bash
  node test-automation-system.js
  # أو مع token
  PUBLISHER_TOKEN=xyz node test-automation-system.js
  ```

### 3.2 Postman Collection
- **الملف**: `postman/Job_Publisher_Automation.postman_collection.json`
- **الوصف**: مجموعة Postman لاختبار APIs
- **ملاحظة**: لم يتم قراءة محتواه بالكامل، لكنه موجود في المشروع

### 3.3 Complete Documentation
- **الملف**: `AUTOMATION_SYSTEM_COMPLETE_DOCUMENTATION.md` (هذا الملف)
- **الوصف**: الدليل الشامل للنظام
- **المحتوى**:
  - نظرة عامة
  - معمارية النظام
  - شرح تفصيلي لكل ملف
  - قائمة الأحداث والإجراءات
  - أمثلة على الاستخدام
  - API Documentation
  - Testing Guide

---

## 🗂️ 4. Supporting Files

### 4.1 Subscription Model
- **الملف**: `src/modules/subscriptions/models/Subscription.js`
- **الوصف**: نموذج الاشتراكات (يحدد ميزات الأتمتة المتاحة)
- **الحقول ذات الصلة**:
  - `features.automationRules` - تفعيل/تعطيل الأتمتة
  - `features.maxRules` - الحد الأقصى للقواعد
  - `features.customWebhooks` - دعم webhooks

### 4.2 NotificationTemplate Model
- **الملف**: `src/modules/notifications/models/NotificationTemplate.js`
- **الوصف**: قوالب الإشعارات (مستخدمة من SEND_NOTIFICATION)
- **ملاحظة**: لم يتم قراءة هذا الملف، لكنه مُستخدم في الكود

### 4.3 Email Service
- **الملف**: `src/utils/emailService.js`
- **الوصف**: خدمة إرسال البريد الإلكتروني (مستخدمة من SEND_EMAIL)
- **ملاحظة**: لم يتم قراءة هذا الملف

### 4.4 Logger
- **الملف**: `src/utils/logger.js`
- **الوصف**: خدمة التسجيل (مستخدمة في جميع الملفات)

---

## 📊 إحصائيات الملفات

| الفئة | عدد الملفات | إجمالي السطور |
|------|-------------|---------------|
| Core Files | 5 | ~1,747 سطر |
| Related Models | 2+ | ~858 سطر |
| Testing | 2 | ~427+ سطر |
| Documentation | 2 | هذا الملف + INDEX |
| **المجموع** | **11+ ملف** | **~3,000+ سطر** |

---

## 🎯 الملفات الأساسية (Must-Read Files)

للفهم الكامل للنظام، يُنصح بقراءة الملفات بهذا الترتيب:

1. ✅ **AUTOMATION_SYSTEM_COMPLETE_DOCUMENTATION.md** - الدليل الشامل (ابدأ هنا)
2. ✅ **AutomationRule.js** - فهم نموذج البيانات
3. ✅ **automationEngine.js** - فهم آلية التنفيذ
4. ✅ **automationController.js** - فهم API endpoints
5. ✅ **automationIntegration.js** - فهم التكامل مع الأحداث
6. ✅ **automationRoutes.js** - فهم المسارات والصلاحيات
7. ✅ **test-automation-system.js** - فهم الاختبار والاستخدام

---

## 🔗 الروابط السريعة

### Backend Core
- [AutomationRule Model](src/modules/automation/models/AutomationRule.js)
- [Automation Controller](src/modules/automation/controllers/automationController.js)
- [Automation Engine](src/modules/automation/services/automationEngine.js)
- [Automation Routes](src/modules/automation/routes/automationRoutes.js)
- [Automation Integration](src/modules/job-publisher/integrations/automationIntegration.js)

### Related Models
- [Notification Model](src/models/Notification.js)
- [MessageThread Model](src/modules/messaging/models/MessageThread.js)

### Testing & Docs
- [Test Script](test-automation-system.js)
- [Complete Documentation](AUTOMATION_SYSTEM_COMPLETE_DOCUMENTATION.md)
- [Files Index](AUTOMATION_FILES_INDEX.md) (هذا الملف)

---

## 📋 قائمة مرجعية للمطور (Developer Checklist)

### للفهم الكامل:
- [ ] قراءة الدليل الشامل (AUTOMATION_SYSTEM_COMPLETE_DOCUMENTATION.md)
- [ ] فهم نموذج AutomationRule وجميع حقوله
- [ ] فهم آلية trigger() في automationEngine
- [ ] فهم جميع الـ 9 action handlers
- [ ] فهم آلية Conditions والـ Operators
- [ ] فهم Throttling & Rate Limiting
- [ ] فهم Integration Hooks
- [ ] تشغيل سكريبت الاختبار
- [ ] اختبار APIs عبر Postman

### للتطوير:
- [ ] معرفة كيفية إضافة حدث جديد (Trigger)
- [ ] معرفة كيفية إضافة إجراء جديد (Action)
- [ ] معرفة كيفية إضافة شرط جديد (Condition Operator)
- [ ] معرفة كيفية تعديل Template Variables
- [ ] معرفة كيفية إضافة Logging إضافي

---

## 🚀 البدء السريع

### 1. قراءة الوثائق
```bash
# افتح الدليل الشامل
code AUTOMATION_SYSTEM_COMPLETE_DOCUMENTATION.md
```

### 2. استكشاف الكود
```bash
# افتح المجلد الرئيسي
code src/modules/automation/
```

### 3. تشغيل الاختبارات
```bash
# نفذ سكريبت الاختبار
node test-automation-system.js
```

### 4. اختبار APIs
```bash
# استورد Postman Collection
# ملف: postman/Job_Publisher_Automation.postman_collection.json
```

---

## 💬 ملاحظات مهمة

### 1. الرسائل (SEND_MESSAGE)
- **نوع الرسالة**: System message تلقائية
- **مكان الظهور**: في محادثة التطبيق (In-app messaging)
- **ليست SMS**: الرسائل تظهر داخل التطبيق فقط، ليست رسائل نصية SMS
- **Real-time**: يتم إرسال إشعار Socket.IO فوري

### 2. الإشعارات (SEND_NOTIFICATION)
- **نوع الإشعار**: In-app notification
- **مكان الظهور**: في قسم الإشعارات داخل التطبيق
- **Channels**: يدعم inApp, email, push, sms (حسب الإعدادات)
- **Priority**: يدعم 4 مستويات (low, normal, high, urgent)

### 3. Frontend
- **الحالة**: غير موجود في الملفات المقدمة
- **المطلوب**: تطوير واجهة المستخدم لإنشاء وإدارة القواعد
- **المكونات المتوقعة**:
  - قائمة القواعد
  - نموذج إنشاء/تعديل
  - محرر الشروط
  - محرر الإجراءات

### 4. الأمان
- **Authentication**: مطلوب Bearer Token
- **Authorization**: يجب أن يكون المستخدم `job-publisher` أو `club`
- **Ownership Check**: التحقق من أن القاعدة تخص الناشر

### 5. الأداء
- **Indexes**: موجودة على الحقول المهمة
- **Pagination**: مدعومة في جميع APIs
- **Throttling**: لمنع الاستخدام المفرط
- **Caching**: غير مُطبق حالياً (يمكن إضافته)

---

## 🎓 مصادر التعلم

### للمبتدئين:
1. اقرأ الدليل الشامل من الأول للآخر
2. شاهد أمثلة Use Cases في الدليل
3. جرب إنشاء قاعدة بسيطة عبر API
4. راقب السجلات (Logs) لفهم التنفيذ

### للمطورين:
1. ادرس كود `automationEngine.js` بالكامل
2. فهم آلية `matchesConditions()` و `isThrottled()`
3. تتبع مسار تنفيذ قاعدة من trigger إلى action
4. جرب إضافة action handler جديد

### للمهندسين المعماريين:
1. ادرس الـ Architecture Diagram في الدليل
2. فهم Integration Layer وكيفية ربط الأحداث
3. تقييم الأداء والـ Scalability
4. اقتراح تحسينات (مثل: Queue System, Caching)

---

## 📞 الدعم

- **الأسئلة الفنية**: راجع الدليل الشامل أولاً
- **الأخطاء**: راجع السجلات في `recentLogs`
- **التطوير**: راجع الكود في `src/modules/automation/`
- **الاختبار**: استخدم `test-automation-system.js`

---

**آخر تحديث**: يناير 2024
**الإصدار**: 1.0.0
**الحالة**: ✅ موثّق بالكامل

---

## 🏁 الخلاصة

هذا الفهرس يوفر نظرة شاملة على جميع ملفات نظام الأتمتة. لقد تم توثيق:

- ✅ 5 ملفات رئيسية للـ Backend
- ✅ 2+ نماذج مرتبطة
- ✅ سكريبت اختبار شامل
- ✅ دليل توثيق كامل (600+ سطر)
- ✅ فهرس الملفات (هذا الملف)

**المجموع**: أكثر من **3000+ سطر كود موثّق بالكامل** ✨
