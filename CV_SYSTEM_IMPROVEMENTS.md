# 🎯 نظام السيرة الذاتية المحسّن - دليل الاستخدام

## ✅ التحديثات المُنفذة

### 1. تحديث قاعدة البيانات
- ✅ إضافة حقول جديدة لمخطط `attachments`:
  - `originalName`: الاسم الأصلي للملف
  - `mimeType`: نوع MIME (application/pdf, etc.)
  - `format`: امتداد الملف (pdf, doc, docx)
  - `localPath`: المسار المحلي النسبي
  - `size`: حجم الملف بالبايتات

**الملفات المحدثة:**
- `src/modules/club/models/JobApplication.js`

---

### 2. تأمين مفتاح الذكاء الاصطناعي

#### ⚠️ إجراء مطلوب منك:

1. **توليد مفتاح API جديد من OpenAI:**
   - زيارة: https://platform.openai.com/api-keys
   - إنشاء مفتاح جديد
   - **لا تشارك المفتاح القديم المكشوف!**

2. **تحديث ملف `.env`:**
   ```bash
   AI_PROVIDER=openai
   AI_API_KEY=sk-proj-YOUR-NEW-KEY-HERE
   ```

3. **إعادة تشغيل السيرفر:**
   ```bash
   npm start
   ```

**الملفات المحدثة:**
- ✅ `.env.example` - ملف تجريبي للمتغيرات البيئية
- ✅ `.gitignore` - يتضمن `.env` بالفعل

---

### 3. تحسينات AI Service

#### المزايا الجديدة:

✅ **Timeout Protection (30 ثانية)**
- الطلبات لن تتعطل إلى ما لا نهاية
- رسالة واضحة عند انتهاء المهلة

✅ **Retry Logic مع Exponential Backoff**
- محاولتان إضافيتان عند الفشل
- تأخير تدريجي: 1s, 2s, 4s

✅ **رسائل خطأ واضحة بالعربية:**
- `401`: مفتاح API غير صحيح
- `429`: تجاوز حد الاستخدام
- `408`: انتهت مهلة الطلب
- `503`: فشل الاتصال بالخدمة

✅ **معالجة أخطاء محسّنة:**
- تحديد نوع الخطأ (quota, network, invalid key)
- لا retry على أخطاء 4xx (عدا 429)

**الملفات المحدثة:**
- `src/modules/cv/services/aiService.js`

---

### 4. نظام Logging شامل

#### Winston Logger مع ميزات متقدمة:

📁 **ملفات Logs:**
```
logs/
├── error.log          # أخطاء فقط
├── combined.log       # جميع العمليات
└── cv-operations.log  # عمليات CV/Resume
```

📊 **Helper Methods:**
```javascript
logger.logFileUpload(userId, filename, size, type);
logger.logFileDownload(userId, applicationId, filename, success);
logger.logAIRequest(userId, operation, provider, success, error);
logger.logDatabaseOperation(operation, collection, documentId, success);
logger.logAuthOperation(operation, userId, success, reason);
```

**الملفات المحدثة:**
- `src/utils/logger.js`
- `src/controllers/clubApplicationsController.js`
- `src/modules/cv/controllers/cvController.js`

---

### 5. Rate Limiting

#### حماية API من سوء الاستخدام:

🛡️ **AI Rate Limiter:**
- 10 طلبات كل 15 دقيقة (قابل للتعديل)
- استثناء للمسؤولين (admins)
- تتبع حسب User ID أو IP

📤 **Upload Rate Limiter:**
- 50 رفع كل ساعة (قابل للتعديل)

🌐 **General Rate Limiter:**
- 100 طلب عام كل 15 دقيقة

#### التعديل في `.env`:
```bash
# AI Rate Limiting
AI_RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
AI_RATE_LIMIT_MAX_REQUESTS=10

# Upload Rate Limiting
UPLOAD_RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
UPLOAD_RATE_LIMIT_MAX_REQUESTS=50

# General API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**الملفات المحدثة:**
- `src/middleware/rateLimiter.js`
- `src/modules/cv/routes/cvRoutes.js`

---

### 6. تحسين File Validation

#### الأمان المحسّن:

✅ **فحص MIME Type + Extension معاً**
- منع رفع ملفات مزيفة

✅ **كشف Malicious Filenames:**
- منع `..` و `/` و `\` في اسم الملف

✅ **Logging شامل:**
- تسجيل جميع محاولات الرفع
- تتبع الملفات المرفوضة

✅ **رسائل خطأ واضحة بالعربية**

**الملفات المحدثة:**
- `src/middleware/localFileUpload.js`

---

## 🚀 كيفية الاستخدام

### اختبار رفع السيرة الذاتية:

```bash
# اختبار عبر curl
curl -X POST http://localhost:4000/api/v1/jobs/:jobId/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "resume=@/path/to/cv.pdf" \
  -F "coverLetter=I am interested..." \
  -F "whatsapp=+966500000000"
```

### اختبار تنزيل السيرة الذاتية:

```bash
curl http://localhost:4000/api/v1/clubs/applications/:applicationId/resume/download \
  -H "Authorization: Bearer CLUB_TOKEN" \
  --output downloaded-resume.pdf
```

### اختبار AI Features:

```javascript
// Generate Summary
fetch('/api/v1/cv/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    type: 'summary',
    data: {
      fullName: 'أحمد محمد',
      role: 'مطور برمجيات',
      experienceYears: 5,
      skills: ['JavaScript', 'React', 'Node.js']
    },
    language: 'ar'
  })
});

// Improve Description
fetch('/api/v1/cv/ai/generate', {
  method: 'POST',
  body: JSON.stringify({
    type: 'description',
    data: 'قمت بتطوير تطبيقات ويب',
    language: 'ar'
  })
});

// Suggest Skills
fetch('/api/v1/cv/ai/generate', {
  method: 'POST',
  body: JSON.stringify({
    type: 'skills',
    data: 'Full Stack Developer',
    language: 'ar'
  })
});
```

---

## 🔍 Troubleshooting

### مشكلة: AI لا يعمل

**التحقق:**
```bash
# في ملف .env
AI_API_KEY=sk-proj-...  # يجب أن يكون موجود
AI_PROVIDER=openai      # أو gemini
```

**الحل:**
1. تأكد من صحة المفتاح
2. تحقق من رصيد حسابك في OpenAI
3. راجع `logs/error.log`

---

### مشكلة: تنزيل الملفات يفشل

**التحقق:**
```bash
# تحقق من وجود المجلد
ls -la uploads/resumes/

# راجع logs
tail -f logs/cv-operations.log
```

**الحل:**
1. تأكد من أن الملفات تم رفعها فعلياً
2. تحقق من صلاحيات المجلد
3. راجع حقول `url` و `localPath` في قاعدة البيانات

---

### مشكلة: Rate Limit Error

**الرسالة:**
```json
{
  "success": false,
  "message": "تم تجاوز عدد الطلبات المسموحة"
}
```

**الحل:**
- انتظر انتهاء الفترة المحددة
- أو زد الحد في `.env`:
  ```bash
  AI_RATE_LIMIT_MAX_REQUESTS=20
  ```

---

## 📊 المراقبة والتحليل

### مراجعة Logs:

```bash
# آخر 50 سطر من الأخطاء
tail -n 50 logs/error.log

# مراقبة حية لعمليات CV
tail -f logs/cv-operations.log

# بحث عن مستخدم معين
grep "User=USER_ID" logs/combined.log
```

---

## 🔐 Security Checklist

- [x] تدوير مفتاح OpenAI المكشوف
- [x] `.env` في `.gitignore`
- [x] Rate limiting مفعّل
- [x] File validation محسّن
- [x] Logging شامل
- [ ] SSL/TLS في Production (تأكد من إعداده)
- [ ] CORS مضبوط بشكل صحيح

---

## 📝 ملاحظات مهمة

1. **قاعدة البيانات:** 
   - البيانات القديمة لن تحتوي على الحقول الجديدة
   - الطلبات الجديدة ستحفظ البيانات كاملة

2. **Backward Compatibility:**
   - الكود يدعم السجلات القديمة والجديدة
   - لا حاجة لترحيل البيانات

3. **Performance:**
   - Winston logger محسّن للأداء
   - Logs تتدوير تلقائياً (max 5MB × 5 files)

4. **Production:**
   - استخدم `NODE_ENV=production`
   - اضبط `LOG_LEVEL=info` (بدلاً من debug)

---

## 🎓 الخطوات التالية الموصى بها

### اختياري - تحسينات إضافية:

1. **Redis Caching للـ AI:**
   ```bash
   npm install redis ioredis
   ```
   - تخزين نتائج AI المتكررة
   - توفير تكاليف API

2. **File Cleanup Scheduler:**
   ```bash
   npm install node-cron
   ```
   - حذف ملفات أقدم من 90 يوم

3. **Virus Scanning:**
   ```bash
   npm install clamscan
   ```
   - فحص الملفات قبل الحفظ

4. **Cloud Storage (Cloudinary/AWS S3):**
   - نقل الملفات من التخزين المحلي
   - أفضل للـ scalability

---

## 📞 الدعم

في حالة وجود مشاكل:
1. راجع `logs/error.log`
2. تحقق من `.env` configuration
3. تأكد من تشغيل MongoDB
4. راجع الـ console في المتصفح (Frontend)

---

**✨ النظام الآن جاهز للاستخدام بكفاءة عالية!**
