# 🚀 تشغيل السيرفر - Start Server

## ❌ المشكلة: السيرفر غير مشغّل!

المشكلة ليست في CSRF - المشكلة هي أن **السيرفر غير مشغّل**!

---

## ✅ الحل السريع

### الخطوة 1: شغّل السيرفر

افتح **Terminal جديد** ثم:

```powershell
cd C:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend
npm run dev
```

**أو:**

```powershell
cd C:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend
npm start
```

---

### الخطوة 2: تحقق من تشغيله

بعد تشغيل السيرفر، يجب أن تشاهد:

```
🚀 Server is running on port 4000
🔐 CSRF Protection Configuration:
  - secretConfigured: true
  - tokenTTL: 60 minutes
  - environment: development
```

---

### الخطوة 3: اختبر CSRF

**في Terminal آخر:**

```powershell
curl http://localhost:4000/api/v1/auth/csrf-diagnostic
```

**النتيجة المتوقعة:**
```json
{
  "status": "OK",
  "csrf": {
    "secretConfigured": true,
    "tokenGenerated": true
  }
}
```

---

## 🔍 التحقق السريع

### هل السيرفر يعمل؟

```powershell
# اختبار بسيط
curl http://localhost:4000/health

# أو
curl http://localhost:4000/
```

إذا حصلت على رد، السيرفر يعمل ✅

إذا حصلت على خطأ "cannot connect"، السيرفر متوقف ❌

---

## 🛠️ استكشاف الأخطاء

### المشكلة 1: "Port 4000 is already in use"

```powershell
# أوقف العملية على Port 4000
netstat -ano | findstr :4000

# ستجد رقم PID، ثم:
taskkill /PID <رقم_PID> /F

# ثم شغّل السيرفر من جديد
npm run dev
```

---

### المشكلة 2: "MODULE_NOT_FOUND"

```powershell
# أعد تثبيت dependencies
cd C:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend
npm install
npm run dev
```

---

### المشكلة 3: أخطاء في .env

تأكد من وجود هذه المتغيرات في `.env`:

```bash
CSRF_SECRET=your-secret-here
NODE_ENV=development
PORT=4000
```

---

## 📝 ملاحظات مهمة

### ✅ CSRF_SECRET موجود بالفعل!

فحصت التكوين ووجدت:
- ✅ `CSRF_SECRET` موجود (64 حرف)
- ✅ `ALLOWED_ORIGINS` محدّث
- ✅ `NODE_ENV=development`

**المشكلة الوحيدة:** السيرفر غير مشغّل!

---

## 🎯 خطوات سريعة

1. افتح Terminal في مجلد `tf1-backend`
2. شغّل: `npm run dev`
3. انتظر حتى ترى "Server is running..."
4. اختبر: `curl http://localhost:4000/health`
5. ✅ جاهز!

---

## 💡 نصيحة

**اترك السيرفر يعمل في Terminal منفصل** ولا توقفه!

---

**⏱️ الوقت:** 30 ثانية فقط!

🚀 **شغّل السيرفر الآن!**
