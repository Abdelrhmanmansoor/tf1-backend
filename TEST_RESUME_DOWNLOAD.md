# 🧪 اختبار تحميل السيرة الذاتية - دليل سريع

## 🎯 الخطوات

### 1️⃣ احصل على Application ID

```bash
GET /api/v1/clubs/applications
Authorization: Bearer YOUR_CLUB_TOKEN
```

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "_id": "675abc123...",  // ← استخدم هذا الـ ID
      "applicantId": {
        "fullName": "أحمد علي"
      },
      "resume": {
        "name": "resume.pdf",
        "downloadUrl": "/api/v1/clubs/applications/675abc123.../resume/download",
        "viewUrl": "/api/v1/clubs/applications/675abc123.../resume/view"
      }
    }
  ]
}
```

---

### 2️⃣ تحقق من وجود السيرة الذاتية

```bash
GET /api/v1/clubs/applications/675abc123.../resume/info
Authorization: Bearer YOUR_CLUB_TOKEN
```

**Response (إذا كان الملف موجود):**
```json
{
  "success": true,
  "hasResume": true,
  "fileExists": true,  // ← مهم جداً!
  "resume": {
    "name": "resume.pdf",
    "originalName": "Ahmed_CV.pdf",
    "mimeType": "application/pdf",
    "size": 245678,
    "downloadUrl": "/api/v1/clubs/applications/675abc123.../resume/download",
    "viewUrl": "/api/v1/clubs/applications/675abc123.../resume/view"
  },
  "debug": {
    "hasUrl": true,
    "hasLocalPath": true,
    "filePath": "C:\\...\\uploads\\resumes\\resume-123.pdf",
    "fileExists": true  // ← يجب أن يكون true
  }
}
```

**Response (إذا كان الملف غير موجود):**
```json
{
  "success": true,
  "hasResume": true,
  "fileExists": false,  // ← المشكلة هنا!
  "debug": {
    "filePath": "C:\\...\\uploads\\resumes\\resume-123.pdf",
    "fileExists": false
  }
}
```

---

### 3️⃣ حمّل السيرة الذاتية

#### أ) باستخدام المتصفح:
```
افتح الرابط في المتصفح:
http://localhost:5000/api/v1/clubs/applications/675abc123.../resume/download
```

#### ب) باستخدام cURL:
```bash
curl -X GET \
  "http://localhost:5000/api/v1/clubs/applications/675abc123.../resume/download" \
  -H "Authorization: Bearer YOUR_CLUB_TOKEN" \
  --output downloaded_resume.pdf
```

#### ج) باستخدام JavaScript:
```javascript
// في الـ Frontend
const downloadResume = async (applicationId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `/api/v1/clubs/applications/${applicationId}/resume/download`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.pdf';
    a.click();
  } else {
    const error = await response.json();
    console.error('Error:', error.messageAr);
  }
};
```

---

### 4️⃣ اعرض السيرة الذاتية في المتصفح

```bash
GET /api/v1/clubs/applications/675abc123.../resume/view
Authorization: Bearer YOUR_CLUB_TOKEN
```

**أو في الـ Frontend:**
```html
<iframe 
  src="/api/v1/clubs/applications/675abc123.../resume/view"
  width="100%" 
  height="600px"
  style="border: none;"
></iframe>
```

---

## 🐛 إذا لم يعمل التحميل

### الخطوة 1: تحقق من الـ Console Logs

شغّل السيرفر وراقب الـ logs:

```
📥 Download resume request for application: 675abc123...
📄 Resume found: {
  name: 'resume.pdf',
  url: 'http://localhost:5000/uploads/resumes/resume-123.pdf',
  localPath: 'uploads/resumes/resume-123.pdf',
  size: 245678
}
```

### الخطوة 2: تحقق من مسار الملف

```
📂 Checking local path: C:\Users\abdel\Desktop\...\uploads\resumes\resume-123.pdf
```

**إذا ظهر:**
```
✅ File found locally, streaming...
```
**معناها الملف موجود والتحميل يجب أن يعمل!**

**إذا ظهر:**
```
❌ File not found in any location
```
**معناها الملف غير موجود على السيرفر!**

### الخطوة 3: تحقق من وجود الملف يدوياً

1. افتح File Explorer
2. اذهب إلى: `C:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend\uploads\resumes\`
3. تحقق من وجود الملف

**إذا لم يكن الملف موجوداً:**
- المشكلة في رفع الملف أثناء التقديم
- تحقق من الـ `applyToJob` endpoint

---

## 🔧 حل المشاكل الشائعة

### المشكلة 1: "Resume file not found on server"

**السبب:** الملف غير موجود في المسار المحدد

**الحل:**
1. تحقق من مسار الملف في الـ database
2. تحقق من وجود الملف فعلياً
3. تأكد من أن الـ upload يعمل بشكل صحيح

### المشكلة 2: "Application not found"

**السبب:** الـ Application ID خاطئ أو لا يخص هذا النادي

**الحل:**
1. تأكد من الـ Application ID صحيح
2. تأكد من أنك مسجل دخول كنادي
3. تأكد من أن الطلب يخص ناديك

### المشكلة 3: "No resume found for this application"

**السبب:** لا توجد مرفقات في الطلب

**الحل:**
1. تحقق من أن المتقدم رفع سيرة ذاتية
2. تحقق من الـ `attachments` array في الـ database

---

## 📊 مثال كامل للاختبار

```bash
# 1. احصل على قائمة الطلبات
curl -X GET \
  "http://localhost:5000/api/v1/clubs/applications" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. تحقق من وجود السيرة الذاتية
curl -X GET \
  "http://localhost:5000/api/v1/clubs/applications/APPLICATION_ID/resume/info" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. حمّل السيرة الذاتية
curl -X GET \
  "http://localhost:5000/api/v1/clubs/applications/APPLICATION_ID/resume/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output resume.pdf

# 4. تحقق من الملف المحمّل
file resume.pdf
# يجب أن يظهر: resume.pdf: PDF document, version 1.4
```

---

## ✅ النتيجة المتوقعة

بعد تطبيق الحل:

1. ✅ يمكنك رؤية معلومات السيرة الذاتية
2. ✅ يمكنك تحميل السيرة الذاتية
3. ✅ يمكنك عرض السيرة الذاتية في المتصفح
4. ✅ تحصل على رسائل خطأ واضحة إذا كان هناك مشكلة

---

## 📞 إذا استمرت المشكلة

أرسل لي:

1. **Console logs** من السيرفر عند محاولة التحميل
2. **Response** من `/resume/info` endpoint
3. **Screenshot** للمجلد `uploads/resumes/`
4. **Application data** من الـ database

---

**الحل جاهز! جرّب الآن 🚀**
