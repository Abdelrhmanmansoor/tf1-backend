# 🚀 CSRF Quick Fix Guide - حل سريع لمشكلة CSRF

## ⚠️ المشكلة / Problem
```
CSRF token missing. Please refresh the page and try again.
WARN CSRF: Token missing in header
```

## ✅ الحلول السريعة / Quick Solutions

### 🔴 الحل الأول: إضافة CSRF_SECRET (إلزامي!)

**الخطوات:**

```powershell
# 1. انتقل إلى مجلد Backend
cd tf1-backend

# 2. إنشاء أو فتح ملف .env
notepad .env

# 3. أضف هذه الأسطر في نهاية الملف:
```

```bash
# ==============================================
# CSRF PROTECTION (REQUIRED)
# ==============================================
CSRF_SECRET=314c505cdb3e165a87b041461d02a40cf17e82113be58fc757336a7b53db6e8d
CSRF_TOKEN_TTL_MS=3600000

# ==============================================
# CORS ORIGINS (Update with your frontend URL)
# ==============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,https://tf1one.com,https://www.tf1one.com
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

```powershell
# 4. احفظ الملف واعد تشغيل السيرفر
npm run dev
# أو
pm2 restart all
```

---

### 🔵 الحل الثاني: اختبار CSRF Token

استخدم هذا الـ endpoint للتشخيص:

```bash
# PowerShell
curl http://localhost:4000/api/v1/auth/csrf-diagnostic

# أو في المتصفح:
# http://localhost:4000/api/v1/auth/csrf-diagnostic
```

**النتيجة المتوقعة:**
```json
{
  "status": "OK",
  "csrf": {
    "secretConfigured": true,
    "tokenGenerated": true,
    "token": "...",
    "cookieSet": true
  },
  "cors": {
    "allowedOrigins": ["http://localhost:3000"],
    "credentialsEnabled": true
  }
}
```

---

### 🟢 الحل الثالث: تحديث Frontend (الحل الجذري)

#### أ) إذا كنت تستخدم **Fetch API**:

```typescript
// 1. أنشئ ملف: src/utils/csrf.ts
export class CSRFManager {
  private static token: string | null = null;
  private static API_URL = 'http://localhost:4000/api/v1';

  static async getToken(): Promise<string> {
    if (this.token) return this.token;

    try {
      const response = await fetch(`${this.API_URL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include', // مهم جدًا!
      });
      
      const data = await response.json();
      this.token = data.token || data.data?.token;
      return this.token!;
    } catch (error) {
      console.error('CSRF fetch failed:', error);
      throw new Error('Failed to get CSRF token');
    }
  }

  static clearToken() {
    this.token = null;
  }
}

// 2. استخدم في Login:
async function login(email: string, password: string) {
  // احصل على CSRF token أولاً
  const csrfToken = await CSRFManager.getToken();

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include', // مهم جدًا!
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken, // أضف الـ token هنا!
    },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}
```

#### ب) إذا كنت تستخدم **Axios**:

```typescript
// 1. أنشئ ملف: src/api/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api/v1',
  withCredentials: true, // مهم جدًا!
});

let csrfToken: string | null = null;

// Fetch CSRF token
async function fetchCSRFToken() {
  const response = await api.get('/auth/csrf-token');
  csrfToken = response.data?.token || response.data?.data?.token;
  return csrfToken;
}

// Request interceptor - أضف CSRF token تلقائيًا
api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  
  // للطلبات التي تعدل البيانات
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    if (!csrfToken) {
      await fetchCSRFToken();
    }
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});

// Response interceptor - جدد الـ token عند الخطأ
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && 
        error.response?.data?.code?.includes('CSRF')) {
      // جدد الـ token وأعد المحاولة
      await fetchCSRFToken();
      if (error.config && !error.config._retry) {
        error.config._retry = true;
        error.config.headers['X-CSRF-Token'] = csrfToken;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// 2. استخدامه:
import api from './api/axios';

async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  // CSRF token يُضاف تلقائيًا!
  return response.data;
}
```

#### ج) حل **React Hook** جاهز:

```typescript
// src/hooks/useCSRF.ts
import { useState, useEffect, useCallback } from 'react';

export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4000/api/v1/auth/csrf-token', {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch CSRF token');
      
      const data = await response.json();
      const newToken = data.token || data.data?.token;
      setToken(newToken);
      return newToken;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken(); // احصل على token عند تحميل الـ component
  }, [fetchToken]);

  return { token, loading, error, refetch: fetchToken };
}

// الاستخدام في Component:
function LoginForm() {
  const { token, refetch } = useCSRF();

  async function handleLogin(email: string, password: string) {
    if (!token) {
      await refetch(); // احصل على token إذا لم يكن موجود
    }

    const response = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token!, // استخدم الـ token
      },
      body: JSON.stringify({ email, password }),
    });

    return response.json();
  }

  return (/* Your login form */);
}
```

---

### 🟡 الحل الرابع: تعطيل CSRF مؤقتًا (للتطوير فقط!)

⚠️ **استخدم هذا فقط للتجربة - ليس للإنتاج!**

```javascript
// في server.js أو في route معين
app.post('/api/v1/auth/login', (req, res, next) => {
  req.skipCSRF = true; // تعطيل CSRF لهذا الـ route
  next();
}, loginController);
```

---

## 📊 التشخيص / Diagnostic

استخدم الأوامر التالية للتأكد من أن كل شيء يعمل:

```powershell
# 1. تحقق من وجود CSRF_SECRET
cd tf1-backend
node -e "require('dotenv').config(); console.log('CSRF_SECRET:', process.env.CSRF_SECRET ? 'موجود ✓' : 'مفقود ✗');"

# 2. اختبر الـ CSRF token endpoint
curl http://localhost:4000/api/v1/auth/csrf-token

# 3. اختبر login مع token
# أولاً احصل على token:
$TOKEN = (curl http://localhost:4000/api/v1/auth/csrf-token | ConvertFrom-Json).token

# ثم استخدمه في login:
curl -X POST http://localhost:4000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -H "X-CSRF-Token: $TOKEN" `
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🎯 الأولويات / Priority

1. ✅ **إضافة CSRF_SECRET إلى .env** (أولوية قصوى!)
2. ✅ **تحديث Frontend** ليرسل X-CSRF-Token header
3. ✅ **اختبار الحل** باستخدام curl أو Postman
4. ✅ **التأكد من CORS** - أن ALLOWED_ORIGINS يحتوي على عنوان الـ Frontend

---

## 🔗 روابط مفيدة / Useful Links

- [CSRF_IMPLEMENTATION_SUMMARY.md](./CSRF_IMPLEMENTATION_SUMMARY.md)
- [CSRF_FRONTEND_IMPLEMENTATION.md](../CSRF_FRONTEND_IMPLEMENTATION.md)
- [ADD_CSRF_SECRET.txt](../ADD_CSRF_SECRET.txt)

---

## 💡 ملاحظات مهمة / Important Notes

1. **CSRF_SECRET** يجب أن يكون موجودًا في `.env` (لن يعمل النظام بدونه في Production)
2. **credentials: 'include'** ضروري في جميع طلبات fetch/axios
3. **X-CSRF-Token** header يجب أن يُضاف في كل طلب POST/PUT/PATCH/DELETE
4. الـ token صالح لمدة ساعة واحدة افتراضيًا (يمكن تغييره عبر CSRF_TOKEN_TTL_MS)
5. في حالة انتهاء الـ token، احصل على token جديد من `/api/v1/auth/csrf-token`

---

## 🆘 إذا استمرت المشكلة / If Problem Persists

```powershell
# 1. أعد تشغيل السيرفر
cd tf1-backend
npm run dev

# 2. امسح الـ cookies في المتصفح (F12 > Application > Cookies > Clear)

# 3. افحص الـ logs:
# افتح Terminal وشغل السيرفر وشاهد الرسائل

# 4. استخدم diagnostic endpoint:
curl http://localhost:4000/api/v1/auth/csrf-diagnostic
```

---

## ✨ المميزات الجديدة / New Features

✅ Automatic token retry على الـ Frontend
✅ Better error messages (عربي + English)
✅ Diagnostic endpoint للتشخيص السريع
✅ Header-only pattern (لا حاجة للـ cookie في الـ validation)
✅ Support for cross-origin requests (Vercel + Render)

---

**وقت التطبيق:** 5-10 دقائق فقط! ⏱️

**الصعوبة:** سهل ⭐⭐☆☆☆
