# 🚀 دليل البدء السريع | Quick Start Guide
## اختبار APIs في 5 دقائق

---

## ⚡ البدء السريع

### 1️⃣ تشغيل السيرفر
```bash
cd tf1-backend
npm run dev
```

**النتيجة المتوقعة:**
```
✅ SERVER RUNNING
Port: 4000
Environment: development
Health Check: http://localhost:4000/health
```

---

### 2️⃣ الاختبار الأول: Health Check
```bash
# PowerShell
Invoke-WebRequest http://localhost:4000/health | Select-Object -ExpandProperty Content

# CMD/Bash
curl http://localhost:4000/health
```

**النتيجة المتوقعة:**
```json
{
  "status": "OK",
  "service": "SportX Platform API",
  "environment": "development",
  "timestamp": "2026-01-16T..."
}
```

✅ **إذا رأيت هذا = السيرفر يعمل!**

---

### 3️⃣ الحصول على JWT Token

#### الطريقة الأولى: Login API
```bash
# PowerShell
$body = @{
    email = "publisher@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$response.Content
```

#### الطريقة الثانية: إنشاء مستخدم جديد
```bash
# Register
POST http://localhost:4000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@publisher.com",
  "password": "Test123!@#",
  "role": "job_publisher",
  "firstName": "Test",
  "lastName": "Publisher"
}
```

**احفظ الـ Token:**
```bash
# PowerShell
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Bash/CMD
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4️⃣ تشغيل الاختبار الشامل

```bash
# بدون Token (سيختبر الـ public endpoints فقط)
node test-all-apis-comprehensive.js

# مع Token
$env:PUBLISHER_TOKEN="YOUR_TOKEN_HERE"
node test-all-apis-comprehensive.js

# أو مباشرة
node test-all-apis-comprehensive.js YOUR_TOKEN_HERE
```

---

## 🎯 اختبارات سريعة بـ cURL

### اختبار Subscription Tiers (لا يحتاج token)
```bash
curl http://localhost:4000/api/v1/publisher/subscription/tiers
```

### اختبار My Subscription (يحتاج token)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/subscription
```

### جدولة مقابلة (يحتاج token + database)
```bash
curl -X POST http://localhost:4000/api/v1/publisher/interviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "507f1f77bcf86cd799439011",
    "type": "online",
    "scheduledAt": "2026-01-25T14:00:00Z",
    "duration": 60,
    "timezone": "Asia/Riyadh",
    "meetingPlatform": "internal"
  }'
```

### إنشاء قاعدة أتمتة (يحتاج token + database)
```bash
curl -X POST http://localhost:4000/api/v1/publisher/automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Rule",
    "trigger": {
      "event": "APPLICATION_STAGE_CHANGED",
      "conditions": [{"field": "newStatus", "operator": "equals", "value": "shortlisted"}]
    },
    "actions": [{"type": "SEND_NOTIFICATION", "order": 0, "enabled": true}],
    "isActive": true
  }'
```

---

## 🐛 حل المشاكل الشائعة

### ❌ "السيرفر لا يعمل"
```bash
# تحقق من المنفذ 4000
netstat -ano | findstr :4000

# إيقاف العملية
taskkill /PID [PID_NUMBER] /F

# إعادة التشغيل
npm run dev
```

### ❌ "MongoDB Connection Error"
```bash
# الخيار 1: استخدام MongoDB محلي
mongod --dbpath C:\data\db

# الخيار 2: تحديث .env بـ MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
```

### ❌ "401 Unauthorized"
```
السبب: Token غير صالح أو منتهي

الحل:
1. احصل على token جديد من /api/v1/auth/login
2. تأكد من كتابة "Bearer " قبل الـ token
3. تحقق من انتهاء صلاحية الـ token (JWT_ACCESS_EXPIRES_IN)
```

### ❌ "403 Forbidden"
```
السبب: ليس لديك صلاحية للوصول

الحل:
1. تحقق من role المستخدم (يجب أن يكون job_publisher للـ publisher endpoints)
2. للـ admin endpoints تحتاج role: admin
```

---

## 📊 نتائج الاختبار السريع

بعد تشغيل `test-all-apis-comprehensive.js` ستحصل على:

```
╔═══════════════════════════════════════════╗
║  🧪 COMPREHENSIVE API TESTING SUITE 🧪   ║
╚═══════════════════════════════════════════╝

📈 Test Results Summary:
  ✅ Passed:  45
  ❌ Failed:  3
  ⏭️  Skipped: 12
  📊 Total:   60

  Success Rate: 75.00%

🎉 EXCELLENT! Most tests passed successfully!
```

---

## 🎯 الخطوات التالية

### إذا نجحت الاختبارات:
1. ✅ جرب APIs أخرى من [API_TESTING_REPORT.md](API_TESTING_REPORT.md)
2. ✅ استخدم Postman Collection من `/postman/`
3. ✅ اقرأ التوثيق الكامل

### إذا فشلت الاختبارات:
1. ⚠️ تحقق من logs في `/logs/combined.log`
2. ⚠️ تأكد من MongoDB متصل
3. ⚠️ تحقق من صحة JWT Token

---

## 📁 الملفات المهمة

```
tf1-backend/
├── test-all-apis-comprehensive.js  ← السكريبت الشامل
├── test-automation-system.js       ← اختبار الأتمتة
├── run-api-tests.bat              ← تشغيل سريع (Windows)
├── API_TESTING_REPORT.md          ← التقرير الكامل
├── QUICK_START_GUIDE.md           ← هذا الملف
└── postman/
    └── Job_Publisher_Automation.postman_collection.json
```

---

## 💡 نصائح

1. **استخدم Postman** - أسهل للاختبار اليدوي
2. **راقب الـ Logs** - ستساعدك في تتبع الأخطاء
3. **جرب بدون Database أولاً** - للتأكد من عمل السيرفر
4. **ثم اختبر مع Database** - للوظائف الكاملة

---

## ✅ Checklist سريع

- [ ] السيرفر يعمل على http://localhost:4000
- [ ] Health check يعمل
- [ ] MongoDB متصل (اختياري للبداية)
- [ ] حصلت على JWT Token
- [ ] اختبرت endpoint واحد على الأقل بنجاح
- [ ] شغلت test-all-apis-comprehensive.js

---

**الوقت المتوقع:** 5-10 دقائق  
**المستوى:** مبتدئ  
**التحديث الأخير:** 16 يناير 2026

---

💡 **تلميح:** إذا كنت مستعجلاً، ابدأ بهذه الأوامر فقط:
```bash
npm run dev                           # تشغيل السيرفر
curl http://localhost:4000/health     # اختبار
node test-all-apis-comprehensive.js   # اختبار شامل
```

✅ **انتهى! أنت الآن جاهز للاختبار.**
