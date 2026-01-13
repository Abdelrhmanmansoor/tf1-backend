# ⚡ أوامر سريعة - Quick Commands

## 🚀 نسخ ولصق فقط!

---

## 1️⃣ إعداد Backend

```powershell
# الانتقال إلى مجلد Backend
cd tf1-backend

# فتح ملف .env
notepad .env
```

**انسخ هذا والصقه في .env:**
```bash
CSRF_SECRET=314c505cdb3e165a87b041461d02a40cf17e82113be58fc757336a7b53db6e8d
CSRF_TOKEN_TTL_MS=3600000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**احفظ (Ctrl+S) ثم:**
```powershell
# إعادة تشغيل السيرفر
npm run dev
```

---

## 2️⃣ اختبار النظام

```powershell
# اختبار التكوين
curl http://localhost:4000/api/v1/auth/csrf-diagnostic

# الحصول على token
curl http://localhost:4000/api/v1/auth/csrf-token

# اختبار تلقائي كامل
.\test-csrf.ps1
```

---

## 3️⃣ نسخ Frontend Helpers

### React Hook:
```powershell
copy frontend\useCSRF.tsx ..\your-frontend\src\hooks\useCSRF.tsx
```

### Axios:
```powershell
copy frontend\axios-csrf.ts ..\your-frontend\src\api\axios-csrf.ts
```

### CSRF Manager:
```powershell
copy frontend\csrf-manager.ts ..\your-frontend\src\utils\csrf-manager.ts
```

---

## 4️⃣ إنشاء CSRF_SECRET جديد

```powershell
# PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
# Linux/Mac
openssl rand -hex 32
```

---

## 5️⃣ فحص سريع

```powershell
# هل CSRF_SECRET موجود؟
cd tf1-backend
node -e "require('dotenv').config(); console.log('CSRF_SECRET:', process.env.CSRF_SECRET ? '✓ موجود' : '✗ مفقود');"

# هل السيرفر يعمل؟
curl http://localhost:4000/health

# هل CSRF يعمل؟
curl http://localhost:4000/api/v1/auth/csrf-diagnostic
```

---

## 6️⃣ اختبار Login مع Token

```powershell
# الحصول على token
$TOKEN = (curl http://localhost:4000/api/v1/auth/csrf-token | ConvertFrom-Json).token

# اختبار login
curl -X POST http://localhost:4000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -H "X-CSRF-Token: $TOKEN" `
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 7️⃣ تنظيف (إذا لزم)

```powershell
# مسح node_modules وإعادة التثبيت
cd tf1-backend
Remove-Item node_modules -Recurse -Force
npm install
npm run dev
```

---

## 8️⃣ استكشاف الأخطاء

```powershell
# عرض محتويات .env (بدون كلمات السر)
cd tf1-backend
Get-Content .env | Select-String "CSRF"

# فحص إذا كان السيرفر يستمع
netstat -an | Select-String ":4000"

# عرض logs
npm run dev
# (راقب الرسائل)
```

---

## 9️⃣ Production Setup

```bash
# إنشاء secret جديد للإنتاج
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# في .env.production
CSRF_SECRET=your-new-production-secret-here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
# لا تضع CSRF_DEV_BYPASS في الإنتاج!
```

---

## 🔟 Development Bypass (للتجربة فقط!)

```bash
# في .env
CSRF_DEV_BYPASS=true
```

**⚠️ تحذير:** احذف هذا قبل الإنتاج!

---

## 📚 روابط سريعة

```
التوثيق:
- START_HERE_CSRF.md
- CSRF_QUICK_FIX.md
- CSRF_COMPLETE_SOLUTION_AR.md

الاختبار:
- test-csrf.html (في المتصفح)
- test-csrf.ps1 (في Terminal)

الكود:
- frontend/useCSRF.tsx (React)
- frontend/axios-csrf.ts (Axios)
- frontend/csrf-manager.ts (عام)
```

---

## ✅ Checklist سريع

```
[ ] أضفت CSRF_SECRET إلى .env
[ ] حفظت الملف
[ ] أعدت تشغيل السيرفر
[ ] اختبرت /csrf-diagnostic → OK
[ ] نسخت frontend helper
[ ] اختبرت login → نجح
[ ] 🎉 جاهز!
```

---

## 🆘 مساعدة سريعة

```powershell
# المشكلة: CSRF token missing
# الحل:
curl http://localhost:4000/api/v1/auth/csrf-diagnostic

# المشكلة: Origin not allowed
# الحل: أضف إلى .env
ALLOWED_ORIGINS=http://localhost:3000

# المشكلة: Token expired
# الحل: زد المدة
CSRF_TOKEN_TTL_MS=7200000
```

---

## 🎯 One-Liner للاختبار الكامل

```powershell
cd tf1-backend ; curl http://localhost:4000/api/v1/auth/csrf-diagnostic ; .\test-csrf.ps1
```

---

**⏱️ الوقت:** دقيقتان فقط!

**📝 ملاحظة:** غيّر `localhost:3000` إلى عنوان frontend الخاص بك

🚀 **انسخ والصق!**
