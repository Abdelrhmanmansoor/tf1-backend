# 🔐 CSRF Frontend Helpers

## 📁 الملفات المتوفرة

هذا المجلد يحتوي على **4 حلول جاهزة** لإدارة CSRF tokens في Frontend:

| الملف | اللغة | الاستخدام |
|------|-------|-----------|
| `useCSRF.tsx` | TypeScript/React | React Hook - الأسهل للـ React |
| `axios-csrf.ts` | TypeScript | Axios instance جاهز - للجميع |
| `csrf-manager.ts` | TypeScript | Class متقدم - استخدام عام |
| `csrf-manager.js` | JavaScript | نسخة JS من الأعلى |

---

## 🚀 كيف تستخدمها؟

### 1️⃣ React Hook (موصى به للـ React)

**انسخ الملف:**
```bash
copy useCSRF.tsx your-frontend\src\hooks\useCSRF.tsx
```

**استخدمه:**
```tsx
import { useCSRF } from '@/hooks/useCSRF';

function LoginForm() {
  const { fetchWithCSRF, loading, error } = useCSRF();

  async function handleLogin(email: string, password: string) {
    const response = await fetchWithCSRF('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    return response.json();
  }

  return (/* Your form */);
}
```

**الميزات:**
- ✅ Auto-fetch token on mount
- ✅ Loading and error states
- ✅ Auto-retry on CSRF errors
- ✅ Easy to use in any React component

---

### 2️⃣ Axios (موصى به للجميع)

**انسخ الملف:**
```bash
copy axios-csrf.ts your-frontend\src\api\axios-csrf.ts
```

**استخدمه:**
```typescript
import { api } from '@/api/axios-csrf';

// Login - CSRF token يُضاف تلقائياً!
async function login(email: string, password: string) {
  const response = await api.post('/api/v1/auth/login', {
    email,
    password
  });
  return response.data;
}

// Register
async function register(userData: any) {
  const response = await api.post('/api/v1/auth/register', userData);
  return response.data;
}

// Logout
import { clearCSRFToken } from '@/api/axios-csrf';
async function logout() {
  await api.post('/api/v1/auth/logout');
  clearCSRFToken(); // مهم!
}
```

**الميزات:**
- ✅ Pre-configured axios instance
- ✅ Auto-inject CSRF token
- ✅ Auto-retry on errors
- ✅ Request/response interceptors
- ✅ Works with any framework

---

### 3️⃣ CSRF Manager (للاستخدام العام)

**انسخ الملف:**
```bash
# TypeScript
copy csrf-manager.ts your-frontend\src\utils\csrf-manager.ts

# أو JavaScript
copy csrf-manager.js your-frontend\src\utils\csrf-manager.js
```

**استخدمه:**
```typescript
import { csrfManager } from '@/utils/csrf-manager';

// استخدم fetch محسّن
async function login(email: string, password: string) {
  const response = await csrfManager.fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  return response.json();
}

// أو احصل على token يدوياً
const token = await csrfManager.getToken();

// استخدمه في fetch عادي
fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
  },
  body: JSON.stringify({ email, password }),
});
```

**الميزات:**
- ✅ Class-based architecture
- ✅ Token caching
- ✅ Auto-retry mechanism
- ✅ Flexible usage
- ✅ Works with any framework

---

## 📊 المقارنة

| الميزة | React Hook | Axios | CSRF Manager |
|--------|-----------|-------|--------------|
| **سهولة الاستخدام** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **React فقط؟** | ✅ نعم | ❌ لا | ❌ لا |
| **Auto-retry** | ✅ | ✅ | ✅ |
| **Token caching** | ✅ | ✅ | ✅ |
| **TypeScript** | ✅ | ✅ | ✅ JS + TS |
| **الأفضل لـ** | React Apps | أي تطبيق | Vanilla JS |

---

## 🎯 أيهم أختار؟

### استخدم **React Hook** إذا:
- ✅ تستخدم React
- ✅ تريد أسهل حل
- ✅ تريد loading/error states جاهزة

### استخدم **Axios** إذا:
- ✅ تستخدم Axios بالفعل
- ✅ تريد حل شامل لكل المشروع
- ✅ Vue/Angular/React/أي شيء

### استخدم **CSRF Manager** إذا:
- ✅ تستخدم fetch API
- ✅ لا تستخدم React
- ✅ تريد تحكم كامل

---

## ⚙️ التكوين

جميع الـ helpers تحتاج:

### 1. Backend URL
```typescript
// في .env أو في الكود
const API_URL = 'http://localhost:4000';

// أو في React
REACT_APP_API_URL=http://localhost:4000

// أو في Next.js
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. Credentials
تأكد من:
```typescript
// Fetch
credentials: 'include'

// Axios
withCredentials: true
```

---

## 🧪 الاختبار

### اختبار React Hook:
```tsx
import { useCSRF } from '@/hooks/useCSRF';

function TestComponent() {
  const { token, loading, error } = useCSRF();

  return (
    <div>
      <p>Token: {token ? '✓ موجود' : '✗ مفقود'}</p>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
    </div>
  );
}
```

### اختبار Axios:
```typescript
import { api, getCurrentToken } from '@/api/axios-csrf';

// احصل على token
const token = getCurrentToken();
console.log('Token:', token);

// اختبر request
api.get('/api/v1/auth/csrf-token')
  .then(res => console.log('Success:', res.data))
  .catch(err => console.error('Error:', err));
```

### اختبار CSRF Manager:
```typescript
import { csrfManager } from '@/utils/csrf-manager';

// احصل على token
csrfManager.getToken()
  .then(token => console.log('Token:', token));

// اختبر fetch
csrfManager.fetch('/api/v1/auth/csrf-token')
  .then(res => res.json())
  .then(data => console.log('Data:', data));
```

---

## 🔧 استكشاف الأخطاء

### "Token not found"
```typescript
// تأكد من أن Backend يعمل
curl http://localhost:4000/api/v1/auth/csrf-token

// تأكد من URL صحيح
const API_URL = 'http://localhost:4000'; // ✓
const API_URL = 'http://localhost:3000'; // ✗ خطأ!
```

### "CORS Error"
```typescript
// تأكد من credentials
fetch(url, { credentials: 'include' }); // ✓
fetch(url, {}); // ✗ خطأ!

// تأكد من ALLOWED_ORIGINS في Backend
ALLOWED_ORIGINS=http://localhost:3000
```

### "Token expired"
```typescript
// احصل على token جديد
await csrfManager.getToken(true); // force refresh

// أو زد المدة في Backend
CSRF_TOKEN_TTL_MS=7200000 // 2 hours
```

---

## 📚 أمثلة إضافية

### Example 1: Login Form (React + Hook)
```tsx
import { useState } from 'react';
import { useCSRF } from '@/hooks/useCSRF';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { fetchWithCSRF, loading } = useCSRF();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const response = await fetchWithCSRF('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Success!
        console.log('Logged in:', data);
      } else {
        // Handle error
        console.error('Login failed:', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

### Example 2: API Service (Axios)
```typescript
// src/api/auth.service.ts
import { api } from './axios-csrf';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/api/v1/auth/login', {
      email,
      password
    });
    return response.data;
  },

  async register(userData: any) {
    const response = await api.post('/api/v1/auth/register', userData);
    return response.data;
  },

  async logout() {
    const response = await api.post('/api/v1/auth/logout');
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  }
};

// Usage in component:
import { authService } from '@/api/auth.service';

async function handleLogin() {
  try {
    const user = await authService.login(email, password);
    console.log('Logged in:', user);
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

---

## 🎯 Next Steps

1. ✅ اختر الـ helper المناسب
2. ✅ انسخه إلى مشروعك
3. ✅ حدّث API_URL
4. ✅ استخدمه في Login/Register
5. ✅ اختبر!

---

## 📞 الدعم

للمزيد من المساعدة:
- 📖 `../CSRF_COMPLETE_SOLUTION_AR.md` - دليل شامل
- 📖 `../CSRF_QUICK_FIX.md` - حلول وأمثلة
- 🌐 `../test-csrf.html` - اختبار تفاعلي

---

**✅ جاهز للاستخدام!**

📅 Created: 2026-01-13  
🔐 Version: 2.0.0  
💯 Quality: Production Ready
