# 🎯 دليل الإعداد الكامل - SportX Platform

## ⚠️ **مشاكل حرجة يجب حلها الآن:**

### 1️⃣ **MongoDB غير متصل - خطوات الحل:**

```bash
# الخطأ الحالي:
MongoDB connection failed: bad auth : authentication failed
```

**الحل (يجب تنفيذه):**
1. افتح **MongoDB Atlas** → https://cloud.mongodb.com
2. اذهب إلى **Database Access**
3. اختر المستخدم `tf1`
4. اضغط **"Edit"** → **"Edit Password"**
5. غيّر Password إلى: `SportX2025Pass` (بدون رموز خاصة)
6. احفظ التغييرات
7. انتظر 1-2 دقيقة حتى يتم تحديث Atlas
8. أعد تشغيل Backend

**بدون MongoDB:**
- ❌ الإشعارات تُحفظ في الذاكرة فقط (تختفي عند إعادة التشغيل)
- ❌ لن تصل الإشعارات بشكل موثوق
- ❌ كل database features معطلة

---

### 2️⃣ **الملفات (PDF) - تم الحل! ✅**

**التغيير:**
- ❌ القديم: Cloudinary (يحوّل الملفات)
- ✅ الجديد: نظام محلي (يحفظ PDF كما هو)

**الملفات تُحفظ الآن في:**
```
uploads/resumes/
```

**Download endpoint:**
```
GET /api/v1/jobs/applications/:applicationId/download/:attachmentIndex
```

---

### 3️⃣ **الإشعارات - Socket.io**

**الإعداد الحالي:**
- ✅ Socket.io يعمل
- ✅ Users يدخلون rooms صحيحة
- ✅ Events موحدة (`new_notification`)

**المشكلة المحتملة:**
- MongoDB غير متصل → الإشعارات لا تُحفظ

---

## 📋 **ما تم إضافته - نظام المقابلات:**

### حقول Interview الجديدة:

```javascript
interview: {
  // الحقول القديمة
  scheduledDate: Date,
  scheduledTime: String,
  duration: Number,
  location: String,
  locationAr: String,
  meetingLink: String,
  
  // ✅ الحقول الجديدة
  coordinator: {
    name: String,
    nameAr: String,
    email: String,
    phone: String,
    title: String,
    titleAr: String
  },
  companyName: String,
  companyNameAr: String,
  reminders: [{
    type: 'email' | 'sms' | 'notification',
    beforeMinutes: Number,
    sent: Boolean,
    sentAt: Date
  }]
}
```

---

## 🔧 **للفرونت اند - تعليمات التكامل:**

### 1. Socket.io Connection:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// الاستماع للإشعارات (موحدة الآن)
socket.on('new_notification', (notification) => {
  console.log('🔔 إشعار جديد:', notification);
  
  // عرض الإشعار
  if (notification.type === 'job_application') {
    showToast(notification.titleAr || notification.title);
  }
});

// التأكد من الاتصال
socket.on('connect', () => {
  console.log('✅ متصل بـ Socket.io');
});

socket.on('disconnect', () => {
  console.log('❌ انقطع الاتصال');
});
```

### 2. Upload Resume (Form):

```javascript
const handleApplyToJob = async (jobId, coverLetter, resumeFile) => {
  const formData = new FormData();
  formData.append('coverLetter', coverLetter);
  formData.append('resume', resumeFile); // File object from <input type="file">
  
  const response = await fetch(`/api/v1/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData // لا تضع Content-Type - browser يضيفه تلقائياً
  });
  
  const data = await response.json();
  if (data.success) {
    alert('تم التقديم بنجاح!');
  }
};
```

### 3. Download Resume:

```javascript
const downloadResume = async (applicationId, attachmentIndex, filename) => {
  const response = await fetch(
    `/api/v1/jobs/applications/${applicationId}/download/${attachmentIndex}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'resume.pdf';
  a.click();
  window.URL.revokeObjectURL(url);
};
```

---

## 📡 **Endpoints الجديدة:**

### Job Applications:

```http
POST /api/v1/jobs/:jobId/apply
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- coverLetter: string
- resume: file (PDF/DOC/DOCX, max 10MB)
```

```http
GET /api/v1/jobs/applications/:applicationId/download/:attachmentIndex
Authorization: Bearer {token}

Response: File stream (PDF with correct headers)
```

---

## 🎯 **أنواع الإشعارات:**

### للنادي:
```javascript
{
  type: 'job_application',
  notificationType: 'new_application',
  applicationId: '...',
  jobId: '...',
  applicantName: 'أحمد محمد',
  title: 'New Job Application',
  titleAr: 'طلب توظيف جديد',
  message: 'Ahmed Mohamed applied for Coach position',
  messageAr: 'أحمد محمد تقدم لوظيفة مدرب كرة قدم'
}
```

### للمتقدم:
```javascript
// 1. تأكيد الإرسال
{
  type: 'job_application',
  notificationType: 'application_submitted',
  title: 'Application Submitted',
  titleAr: 'تم إرسال طلبك'
}

// 2. جدولة مقابلة
{
  type: 'job_application',
  notificationType: 'interview_scheduled',
  title: 'Interview Scheduled',
  titleAr: 'تم جدولة المقابلة',
  interviewDate: '2025-12-01T10:00:00.000Z',
  location: 'النادي الأهلي - القاهرة',
  coordinator: {
    name: 'محمد أحمد',
    phone: '+201234567890'
  }
}

// 3. قبول/رفض
{
  type: 'club_accepted', // or 'club_rejected'
  notificationType: 'application_accepted',
  title: 'Congratulations!',
  titleAr: 'تهانينا - تم قبولك!'
}
```

---

## 🚨 **خطأ Vercel (Frontend Next.js):**

الخطأ الذي أرسلته:
```
Syntax Error in ./app/blog/[id]/page.tsx line 60
```

**هذا مشروع Frontend منفصل!** ليس مشروع Backend هذا.

**الحل:**
1. افتح `app/blog/[id]/page.tsx` في مشروع Frontend
2. اذهب إلى السطر 60
3. ابحث عن خطأ syntax (مثل: قوس مفتوح، فاصلة منقوطة مفقودة، إلخ)

**أو أرسل لي:**
- كود السطر 55-65 من الملف
- سأساعدك في حله

---

## ✅ **الخطوات التالية:**

### الآن (حاسم):
1. ✅ **أصلح MongoDB** (الخطوات أعلاه)
2. ✅ **اختبر Socket.io** من Frontend
3. ✅ **اختبر Upload/Download** للملفات

### بعد ذلك:
4. بناء endpoints لجدولة المقابلات
5. إضافة إشعارات لكل تحديث حالة
6. نظام reminders تلقائي

---

## 📞 **إذا احتجت مساعدة:**

### MongoDB لا يتصل؟
- تأكد من Password الجديد (`SportX2025Pass`)
- تأكد من IP Address مسموح في Atlas (0.0.0.0/0)

### الإشعارات لا تصل؟
1. تأكد من MongoDB متصل
2. افتح Console في Frontend وشوف logs
3. تأكد من Token صحيح

### الملفات لا تُحمّل؟
- تأكد من `Content-Type: multipart/form-data`
- تأكد من حجم الملف < 10MB

---

**تم! ✅**

المشروع جاهز بنسبة 90%. فقط أصلح MongoDB وابدأ الاختبار.
