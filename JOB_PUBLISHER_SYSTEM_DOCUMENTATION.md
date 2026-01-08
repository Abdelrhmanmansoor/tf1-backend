# 📋 نظام Job Publisher المحسّن - دليل التطبيق

## 🎯 الميزات الرئيسية الجديدة

### 1. بروفايل ناشر الوظائف المحترف
- **حقول شاملة**: اسم الشركة، نوع الصناعة، عدد الموظفين
- **وثائق مهمة**: رفع الشعار، شهادات العمل، العنوان الوطني
- **معلومات الممثل**: بيانات المسؤول عن الوظائف
- **التحقق التلقائي**: التحقق من العنوان الوطني عبر API

### 2. نظام الإشعارات المتقدم
- **الجرس (Bell Icon)**: عرض جميع الإشعارات في مكان واحد
- **أنواع الإشعارات**:
  - استقبال طلب جديد
  - تحديث حالة الطلب
  - جدولة مقابلة
  - رسائل جديدة
  - وغيرها...

### 3. نظام الدردشة والمراسلات
- **محادثات منفصلة** لكل طلب وظيفة
- **رسائل فورية** بين ناشر الوظيفة والباحث
- **إشعارات تلقائية** عند وصول رسالة جديدة
- **جدولة مقابلات** مباشرة من المحادثة

### 4. لوحة معلومات شاملة
- **إحصائيات دقيقة** للوظائف والطلبات
- **عرض جميع الطلبات** مع الحالات
- **تتبع دقيق** لكل حالة طلب

---

## 📡 API Endpoints

### أ) بروفايل ناشر الوظائف

#### 1. إنشاء بروفايل
```http
POST /api/v1/job-publisher/profile/create
Content-Type: application/json

{
  "companyName": "شركة التكنولوجيا المتقدمة",
  "industryType": "technology",
  "companySize": "51-200",
  "websiteUrl": "https://example.com",
  "businessRegistrationNumber": "1234567890",
  "nationalAddress": {
    "buildingNumber": "123",
    "additionalNumber": "456",
    "zipCode": "12345",
    "city": "الرياض"
  },
  "representativeName": "أحمد محمد",
  "representativeTitle": "hr_manager",
  "representativePhone": "+966501234567",
  "representativeEmail": "hr@example.com",
  "companyDescription": "نحن شركة متخصصة في الحلول التكنولوجية...",
  "companyValues": ["الابتكار", "الجودة", "التطوير"],
  "taxNumber": "3001234567890003"
}

Response: 201
{
  "success": true,
  "message": "Profile created successfully",
  "profile": {
    ...profile data...
  }
}
```

#### 2. الحصول على البروفايل
```http
GET /api/v1/job-publisher/profile

Response: 200
{
  "success": true,
  "profile": { ...profile data... }
}
```

#### 3. تحديث البروفايل
```http
PUT /api/v1/job-publisher/profile
Content-Type: application/json

{
  "companyDescription": "الوصف الجديد...",
  "companyValues": ["قيم جديدة"]
}

Response: 200
```

#### 4. رفع شعار الشركة
```http
POST /api/v1/job-publisher/profile/upload-logo
Content-Type: multipart/form-data

form-data:
  logo: <binary image file>

Response: 200
{
  "success": true,
  "logoUrl": "/uploads/logos/logo-123.png"
}
```

#### 5. رفع المستندات
```http
POST /api/v1/job-publisher/profile/upload-document
Content-Type: multipart/form-data

form-data:
  document: <binary file>
  documentType: "businessLicense|taxCertificate|nationalAddressDocument"

Response: 200
```

#### 6. التحقق من العنوان الوطني
```http
POST /api/v1/job-publisher/profile/verify-national-address

Response: 200
{
  "success": true,
  "message": "National address verified successfully",
  "verified": true,
  "data": { ...verification data... }
}
```

#### 7. وضع علامة على البروفايل كمكتمل
```http
PUT /api/v1/job-publisher/profile/mark-complete

Response: 200
{
  "success": true,
  "profileComplete": true
}
```

---

### ب) إدارة الطلبات (Applications)

#### 1. الحصول على جميع الطلبات
```http
GET /api/v1/job-publisher/applications?status=new&page=1&limit=20&sort=-createdAt

Response: 200
{
  "success": true,
  "applications": [
    {
      "_id": "app_id",
      "jobId": { "title": "مهندس تطوير", ... },
      "applicantId": { "firstName": "محمد", "lastName": "أحمد", ... },
      "status": "new",
      "createdAt": "2026-01-09T10:00:00Z"
    }
  ],
  "statistics": {
    "totalApplications": 100,
    "new": 25,
    "under_review": 15,
    "interviewed": 10,
    "offered": 5,
    "accepted": 3,
    "rejected": 42,
    "withdrawn": 0,
    "hired": 0
  },
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

#### 2. الحصول على طلبات وظيفة محددة
```http
GET /api/v1/job-publisher/jobs/{jobId}/applications?status=new&page=1

Response: 200
{
  "success": true,
  "job": {
    "id": "job_id",
    "title": "مهندس تطوير",
    "status": "active"
  },
  "applications": [...]
}
```

#### 3. الحصول على تفاصيل طلب واحد
```http
GET /api/v1/job-publisher/applications/{applicationId}

Response: 200
{
  "success": true,
  "application": {
    "_id": "app_id",
    "jobId": { ...job details... },
    "applicantId": { ...applicant details... },
    "status": "new",
    "coverLetter": "نص رسالة التقديم...",
    "videoUrl": "https://example.com/video.mp4",
    "portfolio": "https://example.com/portfolio",
    "createdAt": "2026-01-09T10:00:00Z"
  },
  "conversation": {
    "id": "conv_id",
    "status": "active",
    "lastMessageAt": "2026-01-09T11:00:00Z"
  }
}
```

#### 4. تحديث حالة الطلب مع رسالة
```http
PUT /api/v1/job-publisher/applications/{applicationId}/status
Content-Type: application/json

{
  "status": "interviewed",
  "message": "مرحباً بك! تم اختيارك للمقابلة الشخصية. سيتم التواصل معك قريباً برابط المقابلة."
}

Valid Statuses:
- "new": جديد
- "under_review": جاري المراجعة
- "interviewed": مقابلة
- "offered": عرض وظيفي
- "accepted": مقبول
- "rejected": مرفوض
- "withdrawn": مسحوب
- "hired": موظف

Response: 200
{
  "success": true,
  "message": "Application status updated successfully",
  "application": { ...updated application... },
  "conversationId": "conv_id" // if status is 'interviewed'
}
```

#### 5. لوحة المعلومات - الإحصائيات الشاملة
```http
GET /api/v1/job-publisher/dashboard/stats

Response: 200
{
  "success": true,
  "statistics": {
    "jobs": {
      "total": 15,
      "active": 8,
      "draft": 4,
      "closed": 3
    },
    "applications": {
      "total": 150,
      "new": 25,
      "under_review": 20,
      "interviewed": 15,
      "offered": 10,
      "accepted": 5,
      "rejected": 70,
      "withdrawn": 5,
      "hired": 0
    },
    "profile": {
      "companyName": "اسم الشركة",
      "companyLogo": "url_to_logo",
      "profileComplete": true,
      "subscriptionStatus": "active",
      "ratings": { "average": 4.5, "count": 30 }
    }
  }
}
```

---

### ج) نظام الإشعارات

#### 1. الحصول على الإشعارات
```http
GET /api/v1/notifications?isRead=false&limit=20&skip=0&sort=-createdAt

Response: 200
{
  "success": true,
  "notifications": [
    {
      "_id": "notif_id",
      "type": "application_status_change",
      "title": "تحديث حالة الطلب",
      "description": "تم تحديث حالة طلبك إلى: مقابلة",
      "isRead": false,
      "priority": "high",
      "data": {
        "jobTitle": "مهندس تطوير",
        "applicationStatus": "interviewed"
      },
      "createdAt": "2026-01-09T10:00:00Z"
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "total": 50,
    "pages": 3
  }
}
```

#### 2. عدد الإشعارات غير المقروءة
```http
GET /api/v1/notifications/unread-count

Response: 200
{
  "success": true,
  "unreadCount": 5
}
```

#### 3. وضع علامة على الإشعار كمقروء
```http
PUT /api/v1/notifications/{notificationId}/read

Response: 200
{
  "success": true,
  "notification": { ...notification data... }
}
```

#### 4. وضع علامة على جميع الإشعارات كمقروءة
```http
PUT /api/v1/notifications/read-all

Response: 200
{
  "success": true,
  "modifiedCount": 5
}
```

#### 5. الحصول على الإشعارات حسب النوع
```http
GET /api/v1/notifications/by-type/application_status_change?limit=20

Valid Types:
- job_application
- application_status_change
- interview_scheduled
- job_posted
- message_received
- profile_viewed
- application_rejected
- application_accepted
- application_shortlisted
- message_reply
- conversation_started

Response: 200
{
  "success": true,
  "notifications": [...]
}
```

#### 6. حذف إشعار
```http
DELETE /api/v1/notifications/{notificationId}

Response: 200
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### د) نظام المراسلات والدردشة

#### 1. بدء أو الحصول على محادثة
```http
POST /api/v1/messages/conversation/{applicationId}
Content-Type: application/json

{
  "subject": "مناقشة الوظيفة"
}

Response: 200
{
  "success": true,
  "conversation": {
    "_id": "conv_id",
    "applicationId": "app_id",
    "participants": [
      { "userId": { ...publisher data... }, "role": "publisher" },
      { "userId": { ...applicant data... }, "role": "applicant" }
    ],
    "status": "active",
    "lastMessageAt": null
  }
}
```

#### 2. الحصول على محادثة مع الرسائل
```http
GET /api/v1/messages/conversation/{conversationId}?limit=50&skip=0

Response: 200
{
  "success": true,
  "conversation": { ...conversation data... },
  "messages": [
    {
      "_id": "msg_id",
      "senderId": { "firstName": "محمد", ... },
      "content": "محتوى الرسالة",
      "createdAt": "2026-01-09T10:00:00Z",
      "isEdited": false,
      "readBy": [...]
    }
  ],
  "pagination": {
    "total": 100
  }
}
```

#### 3. إرسال رسالة
```http
POST /api/v1/messages/send
Content-Type: application/json

{
  "conversationId": "conv_id",
  "content": "محتوى الرسالة التي أريد إرسالها"
}

Response: 201
{
  "success": true,
  "message": "Message sent successfully",
  "message": {
    "_id": "msg_id",
    "senderId": "user_id",
    "content": "محتوى الرسالة",
    "createdAt": "2026-01-09T10:00:00Z"
  }
}
```

#### 4. الحصول على جميع المحادثات
```http
GET /api/v1/messages/conversations?limit=20&skip=0&status=active

Response: 200
{
  "success": true,
  "conversations": [
    {
      "_id": "conv_id",
      "subject": "مناقشة الوظيفة",
      "status": "active",
      "lastMessage": { "content": "...", "sentAt": "..." },
      "participants": [...]
    }
  ],
  "pagination": {
    "total": 50
  }
}
```

#### 5. تعديل رسالة
```http
PUT /api/v1/messages/{messageId}
Content-Type: application/json

{
  "content": "الرسالة المعدلة"
}

Response: 200
{
  "success": true,
  "message": "Message updated successfully",
  "message": { ...updated message... }
}
```

#### 6. حذف رسالة
```http
DELETE /api/v1/messages/{messageId}

Response: 200
{
  "success": true,
  "message": "Message deleted successfully"
}
```

#### 7. جدولة مقابلة
```http
PUT /api/v1/messages/conversation/{conversationId}/schedule-interview
Content-Type: application/json

{
  "scheduledDate": "2026-01-15",
  "scheduledTime": "14:00",
  "location": "مقر الشركة - الرياض",
  "meetingLink": "https://zoom.us/meeting/123456"
}

Response: 200
{
  "success": true,
  "message": "Interview scheduled successfully",
  "conversation": { ...updated conversation... }
}
```

---

## 🔄 سير العمل (Workflow)

### 1. تسلسل عملية التوظيف

```
1. الباحث عن وظيفة يقدم على الوظيفة
   ↓
2. ناشر الوظيفة يستقبل إشعار "طلب جديد"
   ↓
3. ناشر يراجع الطلب (under_review)
   ↓
4. ناشر يختار لمقابلة (interviewed)
   └─ تُفتح محادثة تلقائياً
   └─ يرسل رسالة مع تفاصيل المقابلة
   └─ الباحث يستقبل إشعار "مقابلة مجدولة"
   ↓
5. بعد المقابلة:
   - إذا موفق: offered (عرض وظيفي)
   - إذا لم يتم قبوله: rejected (مرفوض)
   ↓
6. الباحث يقبل أو يرفض العرض
   └─ accepted أو withdrawn
   ↓
7. بعد التوظيف: hired (موظف)
```

---

## 💾 البيانات المخزنة

### JobPublisherProfile
- بيانات الشركة الكاملة
- الوثائق والشهادات
- معلومات الممثل
- الإحصائيات
- حالة الاشتراك

### Notification
- نوع الإشعار
- العنوان والوصف
- حالة القراءة
- البيانات المرتبطة
- الأولوية

### Conversation & Message
- المحادثات بين الطرفين
- الرسائل المرسلة
- حالة القراءة
- سجل التعديلات
- تفاصيل المقابلات

---

## ⚙️ المتطلبات

### متغيرات البيئة
```env
# National Address API
NATIONAL_ADDRESS_API_URL=https://api.address.sa/verify
NATIONAL_ADDRESS_API_KEY=your_api_key

# Upload paths
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760 # 10MB
```

### حقول قاعدة البيانات المطلوبة
- `User.profileCompleted` - تم إكمال البروفايل
- `User.role = 'job-publisher'` - دور الناشر
- `Job.publishedBy` - معرف الناشر
- `JobApplication.status` - حالة الطلب

---

## ✅ اختبار وتطبيق

### تم التطبيق بنجاح ✨
✓ نموذج بروفايل شامل
✓ نظام إشعارات متقدم
✓ نظام دردشة مع جدولة مقابلات
✓ إدارة الطلبات مع إحصائيات دقيقة
✓ التحقق من العنوان الوطني
✓ رفع الوثائق والصور

---

**آخر تحديث**: 9 يناير 2026
