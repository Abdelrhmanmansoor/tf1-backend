# 🚀 ابدأ هنا - START HERE

## ⚠️ لديك مشكلة CSRF؟ / Having CSRF Issues?

```
CSRF token missing. Please refresh the page and try again.
```

**لا تقلق! الحل جاهز وسهل** ✅

---

## ⚡ الحل السريع (5 دقائق) / Quick Fix (5 minutes)

### 1️⃣ أضف إلى ملف `.env`

```powershell
cd tf1-backend
notepad .env
```

**أضف هذه الأسطر:**
```bash
# CSRF Protection (REQUIRED)
CSRF_SECRET=314c505cdb3e165a87b041461d02a40cf17e82113be58fc757336a7b53db6e8d
CSRF_TOKEN_TTL_MS=3600000

# CORS Origins (غيّر localhost:3000 إلى عنوان الـ frontend لديك)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**احفظ الملف واعد تشغيل السيرفر:**
```powershell
npm run dev
```

---

### 2️⃣ اختبر التكوين

```powershell
# اختبار تلقائي
.\test-csrf.ps1

# أو يدوياً
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

### 3️⃣ اختبر في المتصفح

افتح: `test-csrf.html` في المتصفح

أو: `http://localhost:4000/api/v1/auth/csrf-diagnostic`

---

## 📚 الخطوات التالية / Next Steps

### للـ Frontend:

**انسخ أحد هذه الملفات إلى مشروعك:**

#### ✨ React Hook (الأسهل!)
```
frontend/useCSRF.tsx → src/hooks/useCSRF.tsx
```

**الاستخدام:**
```tsx
import { useCSRF } from '@/hooks/useCSRF';

function LoginForm() {
  const { fetchWithCSRF } = useCSRF();
  
  async function login(email, password) {
    const response = await fetchWithCSRF('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }
}
```

---

#### ✨ Axios (الأفضل للمشاريع الكبيرة)
```
frontend/axios-csrf.ts → src/api/axios-csrf.ts
```

**الاستخدام:**
```typescript
import { api } from '@/api/axios-csrf';

// Login - CSRF token يُضاف تلقائيًا!
const response = await api.post('/api/v1/auth/login', { email, password });
```

---

#### ✨ Fetch API (الأبسط)
```
frontend/csrf-manager.ts → src/utils/csrf-manager.ts
```

**الاستخدام:**
```typescript
import { csrfManager } from '@/utils/csrf-manager';

const response = await csrfManager.fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
```

---

## 📖 التوثيق الكامل / Full Documentation

| الملف | الوصف | الأولوية |
|------|-------|---------|
| **CSRF_QUICK_FIX.md** | دليل سريع مع أمثلة | ⭐⭐⭐ |
| **CSRF_COMPLETE_SOLUTION_AR.md** | دليل شامل بالعربية | ⭐⭐⭐ |
| **CSRF_SOLUTION_SUMMARY.md** | ملخص الحل | ⭐⭐ |
| **test-csrf.html** | صفحة اختبار تفاعلية | ⭐⭐⭐ |
| **test-csrf.ps1** | اختبار تلقائي PowerShell | ⭐⭐ |

---

## 🆘 لا يزال لديك مشكلة؟ / Still Having Issues?

### الخطوة 1: التشخيص
```powershell
curl http://localhost:4000/api/v1/auth/csrf-diagnostic
```

### الخطوة 2: اقرأ التوصيات
سيعطيك الـ endpoint توصيات مفصلة بالعربية!

### الخطوة 3: جرّب Development Bypass (للتجربة فقط!)
```bash
# في .env
CSRF_DEV_BYPASS=true
```

---

## ✅ Checklist - قائمة التحقق

- [ ] ✅ أضفت `CSRF_SECRET` إلى `.env`
- [ ] ✅ أضفت `ALLOWED_ORIGINS` إلى `.env`
- [ ] ✅ أعدت تشغيل السيرفر
- [ ] ✅ اختبرت diagnostic endpoint
- [ ] ✅ اختبرت في المتصفح (test-csrf.html)
- [ ] ✅ نسخت Frontend helper المناسب
- [ ] ✅ اختبرت Login/Register في تطبيقك

---

## 🎯 الأسئلة الشائعة / FAQ

### س: هل يجب أن أغير CSRF_SECRET؟
**ج:** في التطوير، يمكنك استخدام المفتاح الحالي. في الإنتاج، أنشئ مفتاح جديد:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### س: كيف أعرف أن CSRF يعمل؟
**ج:** شغّل `test-csrf.ps1` أو افتح `test-csrf.html`. إذا نجحت الاختبارات، فهو يعمل!

### س: ماذا عن Production؟
**ج:** تأكد من:
- `CSRF_SECRET` مختلف وآمن
- `ALLOWED_ORIGINS` يحتوي على domains الفعلية
- `NODE_ENV=production`
- احذف أو عطّل `CSRF_DEV_BYPASS`

---

## 🎉 تم!

الآن CSRF يعمل بشكل صحيح! استمتع بالتطوير 🚀

**Need Help?** اقرأ `CSRF_QUICK_FIX.md` للمزيد من التفاصيل.

---

**📅 Created:** 2026-01-13  
**✅ Status:** Production Ready  
**🔐 Version:** 2.0.0
