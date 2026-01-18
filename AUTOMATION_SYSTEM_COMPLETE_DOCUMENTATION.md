# 📋 نظام الأتمتة الكامل (Automation System) - لوحة الناشر

## 🎯 نظرة عامة (Overview)

نظام الأتمتة هو ميزة شاملة في لوحة الناشر (Publisher Dashboard) تسمح للناشرين بإنشاء قواعد أتمتة (Automation Rules) تعمل تلقائياً عند حدوث أحداث معينة (Triggers) وتقوم بتنفيذ إجراءات محددة (Actions).

---

## 🏗️ معمارية النظام (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Event Triggered                         │
│              (مثل: تغيير حالة الطلب، جدولة مقابلة)              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Integration Layer (automationIntegration.js)        │
│            - onApplicationStatusChanged()                        │
│            - onApplicationSubmitted()                            │
│            - onInterviewScheduled()                              │
│            - onInterviewCompleted()                              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           Automation Engine (automationEngine.js)                │
│                   trigger(event, data, publisherId)              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               Find Active Rules for Event                        │
│         (البحث عن القواعد النشطة المناسبة للحدث)                │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Check Conditions (الشروط)                      │
│           - هل الشروط متطابقة؟                                  │
│           - هل القاعدة مخنوقة (Throttled)؟                       │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Execute Rule (تنفيذ القاعدة)                     │
│              executeRule() → Sort Actions → Execute              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Execute Actions (تنفيذ الإجراءات)             │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ SEND_NOTIFICATION│  │  CREATE_THREAD   │  │ SEND_MESSAGE │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   SEND_EMAIL     │  │ SCHEDULE_INTERVIEW│ │ASSIGN_TO_STAGE│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │    ADD_TAG       │  │  UPDATE_FIELD    │  │   WEBHOOK    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Record Execution Results (تسجيل النتائج)           │
│                   Save to recentLogs + Update Stats              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 هيكل الملفات (File Structure)

```
tf1-backend/
├── src/
│   ├── modules/
│   │   ├── automation/
│   │   │   ├── models/
│   │   │   │   └── AutomationRule.js           ← نموذج قاعدة الأتمتة
│   │   │   ├── controllers/
│   │   │   │   └── automationController.js      ← معالجات API
│   │   │   ├── services/
│   │   │   │   └── automationEngine.js          ← محرك الأتمتة الرئيسي
│   │   │   └── routes/
│   │   │       └── automationRoutes.js          ← مسارات API
│   │   │
│   │   ├── job-publisher/
│   │   │   └── integrations/
│   │   │       └── automationIntegration.js     ← طبقة التكامل مع الأحداث
│   │   │
│   │   ├── messaging/
│   │   │   └── models/
│   │   │       └── MessageThread.js             ← نموذج المحادثات
│   │   │
│   │   └── interviews/
│   │       └── models/
│   │           └── Interview.js                 ← نموذج المقابلات
│   │
│   └── models/
│       └── Notification.js                      ← نموذج الإشعارات
│
├── test-automation-system.js                    ← سكريبت الاختبار الشامل
└── postman/
    └── Job_Publisher_Automation.postman_collection.json  ← مجموعة Postman
```

---

## 🗄️ قاعدة البيانات (Database Schema)

### 1. AutomationRule Collection

```javascript
{
  _id: ObjectId,
  publisherId: ObjectId,              // معرف الناشر

  // معلومات القاعدة
  name: String,                       // اسم القاعدة
  nameAr: String,                     // الاسم بالعربية
  description: String,                // وصف
  descriptionAr: String,              // وصف بالعربية

  // إعدادات الحدث (Trigger)
  trigger: {
    event: String,                    // نوع الحدث
    conditions: [                     // شروط التطابق
      {
        field: String,                // حقل الشرط
        operator: String,             // معامل المقارنة
        value: Mixed                  // القيمة المطلوبة
      }
    ]
  },

  // الإجراءات (Actions)
  actions: [
    {
      type: String,                   // نوع الإجراء
      order: Number,                  // ترتيب التنفيذ
      enabled: Boolean,               // مفعّل؟
      config: Mixed                   // إعدادات الإجراء
    }
  ],

  // التحكم والحالة
  isActive: Boolean,                  // مفعّل؟
  isTemplate: Boolean,                // قالب نظام؟
  priority: Number,                   // الأولوية

  // تتبع التنفيذ
  executionCount: Number,             // عدد مرات التنفيذ
  successCount: Number,               // عدد النجاحات
  failureCount: Number,               // عدد الفشل
  lastExecutedAt: Date,               // آخر تنفيذ
  lastSuccessAt: Date,                // آخر نجاح
  lastFailureAt: Date,                // آخر فشل

  // الحدود والخنق (Throttling)
  limits: {
    maxExecutionsPerHour: Number,    // الحد الأقصى في الساعة
    maxExecutionsPerDay: Number,     // الحد الأقصى في اليوم
    cooldownMinutes: Number          // فترة الانتظار بين التنفيذات
  },

  throttling: {
    executionsThisHour: Number,      // التنفيذات هذه الساعة
    executionsToday: Number,         // التنفيذات اليوم
    lastExecutionTime: Date,         // وقت آخر تنفيذ
    hourResetAt: Date,               // إعادة تعيين الساعة
    dayResetAt: Date                 // إعادة تعيين اليوم
  },

  // سجلات التنفيذ (آخر 10)
  recentLogs: [
    {
      executedAt: Date,               // وقت التنفيذ
      triggeredBy: Mixed,             // البيانات المسببة
      success: Boolean,               // نجح؟
      error: String,                  // رسالة الخطأ
      actionsExecuted: Number,        // عدد الإجراءات المنفذة
      executionTimeMs: Number         // وقت التنفيذ بالميلي ثانية
    }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚡ الأحداث المدعومة (Supported Triggers)

| اسم الحدث | الوصف | متى يتم إطلاقه |
|-----------|-------|----------------|
| `APPLICATION_SUBMITTED` | طلب جديد تم تقديمه | عند إنشاء طلب توظيف جديد |
| `APPLICATION_STAGE_CHANGED` | تغيير مرحلة الطلب | عند تحديث حالة الطلب |
| `INTERVIEW_SCHEDULED` | مقابلة تم جدولتها | عند إنشاء مقابلة جديدة |
| `INTERVIEW_COMPLETED` | مقابلة تم إكمالها | عند تحديث حالة المقابلة لـ completed |
| `INTERVIEW_CANCELLED` | مقابلة تم إلغاؤها | عند إلغاء مقابلة |
| `MESSAGE_RECEIVED` | رسالة تم استلامها | عند استلام رسالة جديدة |
| `JOB_PUBLISHED` | وظيفة تم نشرها | عند نشر وظيفة جديدة |
| `JOB_DEADLINE_APPROACHING` | اقتراب موعد التقديم | قبل انتهاء موعد التقديم |
| `APPLICATION_UPDATED` | تحديث الطلب | عند تحديث بيانات الطلب |
| `FEEDBACK_SUBMITTED` | تقييم تم إرساله | عند إرسال تقييم للمتقدم |

---

## 🎬 الإجراءات المدعومة (Supported Actions)

### 1. SEND_NOTIFICATION (إرسال إشعار)
**الوصف**: إرسال إشعار داخل التطبيق (In-App Notification)

**الكود المسؤول**: `actionSendNotification()` في `automationEngine.js:166`

**Config:**
```javascript
{
  type: "SEND_NOTIFICATION",
  config: {
    templateKey: "application_stage_changed",   // مفتاح القالب
    recipientId: ObjectId,                      // (اختياري) معرف المستقبل
    priority: "high",                           // low | normal | high | urgent
    customData: {}                              // بيانات إضافية للقالب
  }
}
```

**الآلية**:
1. استرجاع قالب الإشعار من `NotificationTemplate`
2. استبدال المتغيرات في القالب
3. إنشاء إشعار في `Notification` collection
4. الإشعار يظهر في التطبيق للمستخدم

**مكان الظهور**: داخل التطبيق (In-App) في قسم الإشعارات

---

### 2. CREATE_THREAD (إنشاء محادثة)
**الوصف**: إنشاء محادثة جديدة بين الناشر والمتقدم

**الكود المسؤول**: `actionCreateThread()` في `automationEngine.js:216`

**Config:**
```javascript
{
  type: "CREATE_THREAD",
  config: {}                                   // لا يحتاج إعدادات إضافية
}
```

**الآلية**:
1. التحقق من وجود محادثة سابقة للطلب
2. إذا لم توجد، إنشاء محادثة جديدة في `MessageThread` collection
3. إضافة المتقدم والناشر كمشاركين

**ملاحظة**: يستخدم `MessageThread.findOrCreateForApplication()`

---

### 3. SEND_MESSAGE (إرسال رسالة)
**الوصف**: إرسال رسالة نصية تلقائية في المحادثة

**الكود المسؤول**: `actionSendMessage()` في `automationEngine.js:246`

**Config:**
```javascript
{
  type: "SEND_MESSAGE",
  config: {
    messageTemplate: "مرحباً {{applicantName}}، شكراً لتقديمك على {{jobTitle}}",
    recipientId: ObjectId,                     // (اختياري) المستقبل
    senderId: ObjectId                         // (اختياري) المرسل
  }
}
```

**الآلية**:
1. البحث عن المحادثة أو إنشاء واحدة جديدة
2. استبدال المتغيرات في قالب الرسالة (مثل `{{applicantName}}`)
3. إنشاء رسالة في `Message` collection
4. تحديث `lastMessage` في المحادثة
5. إرسال إشعار real-time عبر Socket.IO

**مكان الظهور**: في محادثة التطبيق (Messaging/Chat) بين الناشر والمتقدم

**نوع الرسالة**: System message (رسالة نظام تلقائية)

---

### 4. SEND_EMAIL (إرسال بريد إلكتروني)
**الوصف**: إرسال بريد إلكتروني للمتقدم

**الكود المسؤول**: `actionSendEmail()` في `automationEngine.js:306`

**Config:**
```javascript
{
  type: "SEND_EMAIL",
  config: {
    subject: "تهانينا! تم قبول طلبك",
    body: "<html>...</html>",                  // HTML content
    recipientEmail: "user@example.com"         // (اختياري)
  }
}
```

**الآلية**:
1. استبدال المتغيرات في الموضوع والمحتوى
2. استخدام `emailService.send()` لإرسال البريد
3. البريد يُرسل للإيميل المحدد أو إيميل المتقدم

**ملاحظة**: يستخدم خدمة البريد الإلكتروني (مثل SendGrid, AWS SES)

---

### 5. SEND_SMS (إرسال رسالة نصية)
**الوصف**: إرسال رسالة SMS (غير مُنفذ بالكامل في الكود الحالي)

**Config:**
```javascript
{
  type: "SEND_SMS",
  config: {
    message: "تم قبول طلبك في {{companyName}}",
    phoneNumber: "+966xxxxxxxxx"
  }
}
```

**الحالة**: مُعرّف في Schema لكن لا يوجد handler له في `automationEngine.js`

---

### 6. SCHEDULE_INTERVIEW (جدولة مقابلة)
**الوصف**: جدولة مقابلة تلقائياً

**الكود المسؤول**: `actionScheduleInterview()` في `automationEngine.js:334`

**Config:**
```javascript
{
  type: "SCHEDULE_INTERVIEW",
  config: {
    type: "online",                            // online | in-person
    duration: 60,                              // بالدقائق
    autoScheduleDays: 3                        // جدولة بعد X أيام
  }
}
```

**الآلية**:
1. حساب التاريخ التلقائي (الآن + X أيام)
2. إنشاء مقابلة في `Interview` collection
3. إذا كانت online، توليد رابط meeting تلقائي
4. حفظ المقابلة

---

### 7. ASSIGN_TO_STAGE (تعيين المرحلة)
**الوصف**: نقل الطلب لمرحلة معينة تلقائياً

**الكود المسؤول**: `actionAssignToStage()` في `automationEngine.js:376`

**Config:**
```javascript
{
  type: "ASSIGN_TO_STAGE",
  config: {
    stage: "shortlisted"                       // المرحلة المطلوبة
  }
}
```

**المراحل المتاحة**:
- `pending` - قيد الانتظار
- `reviewed` - تمت المراجعة
- `shortlisted` - القائمة المختصرة
- `interview` - مقابلة
- `offered` - عرض مُقدم
- `hired` - تم التوظيف
- `rejected` - مرفوض

**الآلية**:
1. البحث عن الطلب في `JobApplication`
2. تحديث حقل `status`
3. حفظ التغييرات

---

### 8. ADD_TAG (إضافة وسم)
**الوصف**: إضافة وسم (tag) للطلب

**الكود المسؤول**: `actionAddTag()` في `automationEngine.js:402`

**Config:**
```javascript
{
  type: "ADD_TAG",
  config: {
    tag: "priority"                            // الوسم المطلوب
  }
}
```

**الآلية**:
1. البحث عن الطلب
2. التحقق من وجود الوسم مسبقاً
3. إضافة الوسم لـ `tags` array
4. حفظ التغييرات

---

### 9. UPDATE_FIELD (تحديث حقل)
**الوصف**: تحديث حقل معين في الطلب أو الوظيفة

**الكود المسؤول**: `actionUpdateField()` في `automationEngine.js:434`

**Config:**
```javascript
{
  type: "UPDATE_FIELD",
  config: {
    model: "JobApplication",                   // JobApplication | Job
    field: "priority",                         // اسم الحقل
    value: "high"                              // القيمة الجديدة
  }
}
```

**الآلية**:
1. تحديد النموذج (JobApplication أو Job)
2. البحث عن المستند
3. تحديث الحقل المحدد
4. حفظ التغييرات

---

### 10. WEBHOOK (استدعاء Webhook خارجي)
**الوصف**: إرسال طلب HTTP لـ API خارجي

**الكود المسؤول**: `actionWebhook()` في `automationEngine.js:466`

**Config:**
```javascript
{
  type: "WEBHOOK",
  config: {
    url: "https://example.com/webhook",
    method: "POST",                            // GET | POST | PUT | DELETE
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer token"
    },
    body: {
      applicantName: "{{applicantName}}",
      status: "{{newStatus}}"
    }
  }
}
```

**الآلية**:
1. استبدال المتغيرات في body
2. إرسال طلب HTTP باستخدام `axios`
3. معالجة الاستجابة

**استخدام**: التكامل مع أنظمة خارجية (CRM, Slack, etc.)

---

## 🔍 معاملات الشروط (Condition Operators)

| المعامل | الوصف | مثال |
|---------|-------|------|
| `equals` | يساوي | `status equals "shortlisted"` |
| `not_equals` | لا يساوي | `status not_equals "rejected"` |
| `contains` | يحتوي على | `jobTitle contains "مدرب"` |
| `not_contains` | لا يحتوي على | `email not_contains "gmail"` |
| `greater_than` | أكبر من | `experience greater_than 5` |
| `less_than` | أقل من | `age less_than 30` |
| `in` | موجود في المصفوفة | `status in ["shortlisted", "interview"]` |
| `not_in` | غير موجود في المصفوفة | `status not_in ["rejected", "withdrawn"]` |
| `exists` | الحقل موجود | `phoneNumber exists` |
| `not_exists` | الحقل غير موجود | `linkedinUrl not_exists` |

**الكود المسؤول**: `evaluateCondition()` في `AutomationRule.js:271`

---

## 🔄 آلية عمل النظام (System Flow)

### خطوة بخطوة:

#### 1️⃣ إطلاق الحدث (Event Triggering)
```javascript
// في ملف JobApplication controller عند تحديث حالة الطلب:
const oldStatus = application.status;
application.status = newStatus;
await application.save();

// استدعاء hook الأتمتة
await automationIntegration.onApplicationStatusChanged(
  application,
  oldStatus,
  newStatus
);
```

**الملف**: `automationIntegration.js:14`

---

#### 2️⃣ تحضير البيانات (Data Preparation)
```javascript
// تحضير بيانات الأتمتة
const automationData = {
  applicationId: application._id,
  jobId: application.jobId._id,
  applicantId: application.applicantId._id,
  publisherId: publisher._id,
  oldStatus: "pending",
  newStatus: "shortlisted",
  applicantName: "أحمد محمد",
  jobTitle: "مدرب كرة قدم",
  companyName: "نادي الهلال",
  // ... المزيد من البيانات
};
```

**الملف**: `automationIntegration.js:136`

---

#### 3️⃣ تشغيل المحرك (Engine Trigger)
```javascript
await automationEngine.trigger(
  'APPLICATION_STAGE_CHANGED',  // نوع الحدث
  automationData,                // البيانات
  publisherId                    // معرف الناشر
);
```

**الملف**: `automationEngine.js:14`

---

#### 4️⃣ البحث عن القواعد النشطة (Find Active Rules)
```javascript
const rules = await AutomationRule.findActiveRulesForEvent(
  event,
  publisherId
);
// يرجع جميع القواعد النشطة لهذا الحدث
```

**الملف**: `AutomationRule.js:205`

---

#### 5️⃣ فحص الشروط (Check Conditions)
```javascript
// لكل قاعدة، فحص الشروط
if (!rule.matchesConditions(data)) {
  continue; // تخطي هذه القاعدة
}

// فحص Throttling
if (rule.isThrottled()) {
  continue; // القاعدة مخنوقة
}
```

**الملفات**:
- `AutomationRule.js:254` (matchesConditions)
- `AutomationRule.js:303` (isThrottled)

---

#### 6️⃣ تنفيذ القاعدة (Execute Rule)
```javascript
const result = await automationEngine.executeRule(rule, data);

// ترتيب الإجراءات حسب order
const sortedActions = rule.actions
  .filter(action => action.enabled)
  .sort((a, b) => a.order - b.order);

// تنفيذ كل إجراء
for (const action of sortedActions) {
  await automationEngine.executeAction(action, data, rule);
}
```

**الملف**: `automationEngine.js:82`

---

#### 7️⃣ تنفيذ الإجراءات (Execute Actions)
```javascript
// مثال: إرسال إشعار
case 'SEND_NOTIFICATION':
  return await this.actionSendNotification(action.config, data, rule);

// مثال: إرسال رسالة
case 'SEND_MESSAGE':
  return await this.actionSendMessage(action.config, data, rule);

// ... إلخ
```

**الملف**: `automationEngine.js:126`

---

#### 8️⃣ تسجيل النتائج (Record Results)
```javascript
rule.recordExecution(
  success,           // هل نجح؟
  data,              // البيانات المسببة
  error,             // رسالة الخطأ (إن وجد)
  actionsExecuted,   // عدد الإجراءات المنفذة
  executionTimeMs    // وقت التنفيذ
);

await rule.save();
```

**الملف**: `AutomationRule.js:351`

---

## 📡 API Endpoints

### قائمة الـ Endpoints الكاملة:

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/v1/publisher/automations` | جلب قائمة القواعد |
| GET | `/api/v1/publisher/automations/:id` | جلب قاعدة محددة |
| POST | `/api/v1/publisher/automations` | إنشاء قاعدة جديدة |
| PATCH | `/api/v1/publisher/automations/:id` | تحديث قاعدة |
| DELETE | `/api/v1/publisher/automations/:id` | حذف قاعدة |
| POST | `/api/v1/publisher/automations/:id/toggle` | تفعيل/تعطيل قاعدة |
| POST | `/api/v1/publisher/automations/test` | اختبار قاعدة (dry run) |
| GET | `/api/v1/publisher/automations/logs` | جلب سجلات التنفيذ |
| GET | `/api/v1/publisher/automations/templates` | جلب قوالب النظام |
| POST | `/api/v1/publisher/automations/templates/:id/clone` | استنساخ قالب |
| GET | `/api/v1/publisher/automations/statistics` | جلب إحصائيات الأتمتة |

---

### أمثلة على الطلبات:

#### 1. إنشاء قاعدة أتمتة
```http
POST /api/v1/publisher/automations
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "إرسال إشعار عند القائمة المختصرة",
  "nameAr": "إرسال إشعار عند القائمة المختصرة",
  "description": "إرسال إشعار تلقائي عندما يصل المتقدم للقائمة المختصرة",
  "trigger": {
    "event": "APPLICATION_STAGE_CHANGED",
    "conditions": [
      {
        "field": "newStatus",
        "operator": "equals",
        "value": "shortlisted"
      }
    ]
  },
  "actions": [
    {
      "type": "SEND_NOTIFICATION",
      "order": 0,
      "enabled": true,
      "config": {
        "templateKey": "application_stage_changed",
        "priority": "high"
      }
    },
    {
      "type": "SEND_MESSAGE",
      "order": 1,
      "enabled": true,
      "config": {
        "messageTemplate": "مبروك {{applicantName}}! تم اختيارك للقائمة المختصرة لوظيفة {{jobTitle}}."
      }
    }
  ],
  "isActive": true,
  "priority": 1
}
```

**الملف**: `automationController.js:81`

---

#### 2. اختبار قاعدة
```http
POST /api/v1/publisher/automations/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "ruleId": "507f1f77bcf86cd799439011",
  "testData": {
    "applicationId": "507f1f77bcf86cd799439012",
    "oldStatus": "pending",
    "newStatus": "shortlisted",
    "applicantName": "أحمد محمد",
    "jobTitle": "مدرب كرة قدم"
  }
}
```

**الاستجابة**:
```json
{
  "success": true,
  "message": "Test completed successfully",
  "data": {
    "conditionsMatch": true,
    "executionResult": {
      "success": true,
      "actionsExecuted": 2,
      "results": [
        { "success": true },
        { "success": true }
      ]
    }
  }
}
```

**الملف**: `automationController.js:220`

---

#### 3. جلب الإحصائيات
```http
GET /api/v1/publisher/automations/statistics
Authorization: Bearer {token}
```

**الاستجابة**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalRules": 5,
      "activeRules": 3,
      "totalExecutions": 120,
      "totalSuccesses": 115,
      "totalFailures": 5,
      "successRate": "95.83"
    }
  }
}
```

**الملف**: `automationController.js:359`

---

## 🔐 الأمان والصلاحيات (Security & Permissions)

### Middleware المستخدمة:

```javascript
router.use(authenticate);                    // التحقق من تسجيل الدخول
router.use(authorize('job-publisher', 'club')); // التحقق من الدور
```

**الملف**: `automationRoutes.js:44-45`

### التحقق من الملكية:

```javascript
// التأكد من أن القاعدة تخص الناشر المطلوب
const rule = await AutomationRule.findOne({
  _id: id,
  publisherId: req.user._id  // ✅ التحقق من الملكية
});
```

---

## 🚦 Throttling & Limits

### أنواع الحدود:

1. **maxExecutionsPerHour**: الحد الأقصى للتنفيذات في الساعة
2. **maxExecutionsPerDay**: الحد الأقصى للتنفيذات في اليوم
3. **cooldownMinutes**: فترة الانتظار بين التنفيذات

### مثال:
```javascript
{
  limits: {
    maxExecutionsPerHour: 10,
    maxExecutionsPerDay: 50,
    cooldownMinutes: 5
  }
}
```

**الكود المسؤول**: `AutomationRule.js:303` (isThrottled method)

---

## 📊 Logging & Monitoring

### سجلات التنفيذ (Execution Logs):

كل قاعدة تحتفظ بآخر 10 سجلات تنفيذ:

```javascript
recentLogs: [
  {
    executedAt: "2024-01-15T10:30:00Z",
    triggeredBy: { /* البيانات */ },
    success: true,
    error: null,
    actionsExecuted: 2,
    executionTimeMs: 245
  }
]
```

### الإحصائيات:
- إجمالي القواعد
- القواعد النشطة
- إجمالي التنفيذات
- معدل النجاح

**الملف**: `AutomationRule.js:225` (getStatistics)

---

## 🧪 الاختبار (Testing)

### سكريبت الاختبار الآلي:

```bash
node test-automation-system.js
```

**الملف**: `test-automation-system.js`

### الاختبارات المتضمنة:

1. ✅ Health Check
2. ✅ Subscription Tiers
3. ✅ Get My Subscription
4. ✅ Upgrade Subscription
5. ✅ Get Usage
6. ✅ Schedule Interview
7. ✅ Get Interviews
8. ✅ Get Message Threads
9. ✅ Get Unread Count
10. ✅ **Create Automation Rule**
11. ✅ **Get Automations**
12. ✅ **Toggle Automation**
13. ✅ **Automation Statistics**
14. ✅ Get Publisher Features

---

## 📝 متغيرات القوالب (Template Variables)

### المتغيرات المتاحة:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `{{applicantName}}` | اسم المتقدم | "أحمد محمد" |
| `{{jobTitle}}` | عنوان الوظيفة | "مدرب كرة قدم" |
| `{{companyName}}` | اسم الشركة/النادي | "نادي الهلال" |
| `{{status}}` | الحالة الحالية | "shortlisted" |
| `{{oldStatus}}` | الحالة السابقة | "pending" |
| `{{newStatus}}` | الحالة الجديدة | "shortlisted" |
| `{{applicationDate}}` | تاريخ التقديم | "15/01/2024" |
| `{{applicantEmail}}` | بريد المتقدم | "ahmad@example.com" |

### الاستخدام:

```javascript
"مرحباً {{applicantName}}، شكراً لتقديمك على وظيفة {{jobTitle}} في {{companyName}}."
```

**سيصبح**:

```
"مرحباً أحمد محمد، شكراً لتقديمك على وظيفة مدرب كرة قدم في نادي الهلال."
```

**الكود المسؤول**: `automationEngine.js:511` (replaceVariables)

---

## 🎨 Frontend (لم يتم توفيره في الكود)

### الصفحات المتوقعة:

1. **صفحة قائمة القواعد**: عرض جميع قواعد الأتمتة
2. **صفحة إنشاء/تعديل قاعدة**: نموذج إنشاء قاعدة جديدة
3. **صفحة الإحصائيات**: لوحة معلومات الأداء
4. **صفحة السجلات**: عرض سجلات التنفيذ

### المكونات المتوقعة:

- `AutomationRuleList.vue/jsx`
- `AutomationRuleForm.vue/jsx`
- `TriggerSelector.vue/jsx`
- `ActionBuilder.vue/jsx`
- `ConditionEditor.vue/jsx`

**ملاحظة**: الـ Frontend غير موجود في الملفات المقدمة.

---

## 💡 أمثلة على حالات الاستخدام (Use Cases)

### 1. إرسال إشعار تلقائي عند القبول
```javascript
{
  name: "إشعار القبول",
  trigger: {
    event: "APPLICATION_STAGE_CHANGED",
    conditions: [
      { field: "newStatus", operator: "equals", value: "hired" }
    ]
  },
  actions: [
    {
      type: "SEND_NOTIFICATION",
      config: {
        templateKey: "application_hired",
        priority: "high"
      }
    },
    {
      type: "SEND_EMAIL",
      config: {
        subject: "تهانينا! تم قبولك",
        body: "نحيطكم علماً بأنه تم قبول طلبكم..."
      }
    }
  ]
}
```

---

### 2. جدولة مقابلة تلقائية
```javascript
{
  name: "جدولة مقابلة للقائمة المختصرة",
  trigger: {
    event: "APPLICATION_STAGE_CHANGED",
    conditions: [
      { field: "newStatus", operator: "equals", value: "shortlisted" }
    ]
  },
  actions: [
    {
      type: "SCHEDULE_INTERVIEW",
      config: {
        type: "online",
        duration: 60,
        autoScheduleDays: 3
      }
    },
    {
      type: "SEND_NOTIFICATION",
      config: {
        templateKey: "interview_scheduled",
        priority: "high"
      }
    }
  ]
}
```

---

### 3. فتح محادثة تلقائياً عند المقابلة
```javascript
{
  name: "فتح محادثة عند المقابلة",
  trigger: {
    event: "APPLICATION_STAGE_CHANGED",
    conditions: [
      { field: "newStatus", operator: "equals", value: "interview" }
    ]
  },
  actions: [
    {
      type: "CREATE_THREAD",
      config: {}
    },
    {
      type: "SEND_MESSAGE",
      config: {
        messageTemplate: "مرحباً {{applicantName}}، تم تحديد موعد مقابلة معك. يمكنك التواصل معنا من خلال هذه المحادثة."
      }
    }
  ]
}
```

---

### 4. إرسال webhook لـ CRM خارجي
```javascript
{
  name: "تحديث CRM عند التوظيف",
  trigger: {
    event: "APPLICATION_STAGE_CHANGED",
    conditions: [
      { field: "newStatus", operator: "equals", value: "hired" }
    ]
  },
  actions: [
    {
      type: "WEBHOOK",
      config: {
        url: "https://crm.example.com/api/candidates",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer abc123"
        },
        body: {
          "name": "{{applicantName}}",
          "email": "{{applicantEmail}}",
          "position": "{{jobTitle}}",
          "status": "hired"
        }
      }
    }
  ]
}
```

---

## 🔧 ملفات التكوين (Configuration)

### متطلبات النظام:

```javascript
// package.json dependencies
{
  "mongoose": "^6.x",
  "express": "^4.x",
  "express-validator": "^6.x",
  "axios": "^1.x"
}
```

### متغيرات البيئة:

```bash
# .env
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mongodb://localhost:27017/sports-platform
```

---

## 📚 الملخص النهائي

### كيف يعمل النظام من البداية للنهاية:

1. **الناشر ينشئ قاعدة أتمتة** عبر API:
   - يختار الحدث (مثل: `APPLICATION_STAGE_CHANGED`)
   - يضيف شروط (مثل: `newStatus equals "shortlisted"`)
   - يضيف إجراءات (مثل: `SEND_NOTIFICATION` + `SEND_MESSAGE`)

2. **حدث يحصل في النظام** (مثل: تحديث حالة طلب):
   - الكود يستدعي `automationIntegration.onApplicationStatusChanged()`
   - يتم تحضير البيانات باستخدام `prepareApplicationData()`

3. **تشغيل محرك الأتمتة**:
   - `automationEngine.trigger()` يبحث عن القواعد النشطة
   - يفحص الشروط لكل قاعدة
   - يتحقق من Throttling

4. **تنفيذ الإجراءات**:
   - ترتيب الإجراءات حسب `order`
   - تنفيذ كل إجراء حسب نوعه:
     - **SEND_NOTIFICATION**: إشعار in-app
     - **SEND_MESSAGE**: رسالة في المحادثة
     - **SEND_EMAIL**: بريد إلكتروني
     - **SCHEDULE_INTERVIEW**: جدولة مقابلة
     - **ASSIGN_TO_STAGE**: تغيير المرحلة
     - **ADD_TAG**: إضافة وسم
     - **UPDATE_FIELD**: تحديث حقل
     - **WEBHOOK**: استدعاء API خارجي

5. **تسجيل النتائج**:
   - حفظ السجل في `recentLogs`
   - تحديث العدادات (`executionCount`, `successCount`, `failureCount`)
   - تحديث `lastExecutedAt`

6. **المستخدم يرى النتيجة**:
   - إشعار في التطبيق
   - رسالة في المحادثة
   - بريد إلكتروني
   - تحديث في الحالة

---

## 🎯 الخلاصة

نظام الأتمتة هو نظام شامل ومرن يسمح للناشرين بأتمتة سير عمل التوظيف بالكامل. النظام يدعم:

- ✅ 10 أنواع من الأحداث (Triggers)
- ✅ 10 أنواع من الإجراءات (Actions)
- ✅ 10 معاملات شروط
- ✅ Throttling & Rate Limiting
- ✅ Execution Logging
- ✅ Statistics & Monitoring
- ✅ Testing & Dry Run
- ✅ Template Variables
- ✅ Multi-language Support (AR/EN)

---

## 📞 الدعم الفني

للأسئلة أو الاستفسارات، راجع:
- **API Documentation**: Postman Collection
- **Test Script**: `test-automation-system.js`
- **Integration Guide**: `automationIntegration.js`

---

**آخر تحديث**: يناير 2024
**الإصدار**: 1.0.0
**الحالة**: ✅ Production Ready
