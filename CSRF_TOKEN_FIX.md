# 🔧 حل مشكلة CSRF Token عند التسجيل

**المشكلة:** "CSRF token missing" عند التسجيل في دور ناشر وظائف  
**التاريخ:** 8 يناير 2026

---

## 🔍 تحليل المشكلة

### حيث تحدث المشكلة:
1. المستخدم يفتح صفحة التسجيل
2. يختار دور "ناشر وظائف" (Job Publisher)
3. يملأ البيانات والضغط على "تسجيل"
4. يظهر خطأ: **"CSRF token missing"** ❌

### السبب:
```
1. الـ register endpoint يتطلب CSRF token:
   POST /auth/register + X-CSRF-Token header

2. الـ Frontend يحاول الحصول على CSRF token من:
   - الـ cookies (XSRF-TOKEN)
   - أو عن طريق /auth/csrf-token endpoint

3. المشكلة: قد لا يتم الحصول على الـ token بشكل صحيح
   أو قد لا يتم إرساله في الـ headers بشكل صحيح
```

---

## ✅ الحل 1: تحديث api.js (الأفضل)

### المشكلة الحالية في `frontend/app/src/config/api.js`:

```javascript
const getCSRFToken = async () => {
  // فقط تتحقق من الـ cookie
  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  
  // ثم تطلب من الـ endpoint
  try {
    const response = await axios.get(`${API_URL}/auth/csrf-token`, { withCredentials: true });
    return response.data?.token || response.data?.csrfToken;
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return null;  // ⚠️ هنا المشكلة - تعود null!
  }
};
```

### الحل: حفظ الـ token بعد الحصول عليه

```javascript
const getCSRFToken = async () => {
  // أولاً: تحقق من الـ sessionStorage (للأداء الأفضل)
  let csrfToken = sessionStorage.getItem('csrfToken');
  
  if (csrfToken && csrfToken !== 'undefined') {
    return csrfToken;
  }
  
  // ثانياً: تحقق من الـ cookies
  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  
  if (csrfCookie) {
    csrfToken = csrfCookie.split('=')[1];
    sessionStorage.setItem('csrfToken', csrfToken);
    return csrfToken;
  }
  
  // ثالثاً: طلب token جديد من الـ server
  try {
    const response = await axios.get(`${API_URL}/auth/csrf-token`, { 
      withCredentials: true 
    });
    
    csrfToken = response.data?.token || response.data?.csrfToken;
    
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken);
      return csrfToken;
    }
    
    console.warn('No CSRF token in response:', response.data);
    return null;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    // 🆘 خطر: لا تعود null، بل حاول مرة أخرى
    return null;
  }
};
```

---

## ✅ الحل 2: تحديث middleware في الـ Backend

تأكد من أن `csrf.js` middleware يرسل الـ token بشكل صحيح:

### `src/middleware/csrf.js`:

```javascript
// الدالة التي تحصل على CSRF token من الـ endpoint
const getCSRFToken = (req, res) => {
  // توليد token جديد
  const token = generateCSRFToken(req);
  
  // إرسال الـ token في جسم الـ response
  return res.json({
    success: true,
    data: {
      token: token,
      csrfToken: token  // صيغة بديلة للتوافقية
    },
    message: 'CSRF token generated'
  });
};

// أيضاً: ضع الـ token في الـ cookie تلقائياً
const csrf = (req, res, next) => {
  const token = generateCSRFToken(req);
  
  // ضع الـ token في الـ cookie
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // يجب أن يكون false لـ frontend يقرأ
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  // ضع الـ token أيضاً في الـ request
  req.csrfToken = token;
  
  next();
};

// التحقق من الـ token
const verifyCsrf = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  
  // إذا لم يكن هناك token
  if (!token) {
    console.error('CSRF Token missing in request headers');
    console.log('Available headers:', req.headers);
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      code: 'CSRF_MISSING',
      debug: {
        headers: Object.keys(req.headers),
        hasXCsrf: !!req.headers['x-csrf-token'],
        hasBody: !!req.body?.csrfToken
      }
    });
  }
  
  // التحقق من صحة الـ token
  if (!req.session || req.session.csrfToken !== token) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_INVALID'
    });
  }
  
  next();
};

module.exports = { csrf, verifyCsrf, getCSRFToken };
```

---

## ✅ الحل 3: تحديث التسلسل في Frontend

### في `frontend/app/src/pages/Register.jsx`:

```javascript
import { useEffect } from 'react';
import { profileService } from '../config/api';

const Register = () => {
  useEffect(() => {
    // الخطوة 1: احصل على CSRF token قبل أي شيء
    const initCSRFToken = async () => {
      try {
        const response = await fetch('/api/v1/auth/csrf-token', {
          method: 'GET',
          credentials: 'include', // 🔑 يجب تضمين cookies
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.data?.token) {
          // احفظ الـ token في sessionStorage
          sessionStorage.setItem('csrfToken', data.data.token);
          console.log('✅ CSRF token obtained:', data.data.token.substring(0, 10) + '...');
        }
      } catch (error) {
        console.error('❌ Failed to get CSRF token:', error);
      }
    };
    
    initCSRFToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // تأكد من أن الـ token موجود
    const csrfToken = sessionStorage.getItem('csrfToken');
    
    if (!csrfToken) {
      setError('مشكلة في الأمان - يرجى تحديث الصفحة والمحاولة مجدداً');
      return;
    }
    
    // الآن قم بالتسجيل مع الـ token
    // ...
  };
  
  // ...
};
```

---

## 🔍 خطوات التشخيص

### 1️⃣ تحقق من الـ Network Tab:

```
افتح DevTools (F12)
اذهب إلى Network tab

1. ابحث عن request إلى /auth/csrf-token
   - يجب أن يحصل على response يحتوي على token

2. ابحث عن request إلى /auth/register
   - يجب أن يحتوي على header:
     X-CSRF-Token: [token value]

3. إذا لم تر X-CSRF-Token، هنا المشكلة!
```

### 2️⃣ تحقق من الـ Console:

```javascript
// في الـ console، اكتب:
sessionStorage.getItem('csrfToken')
// يجب أن يعود token value

document.cookie
// يجب أن تراه يحتوي على XSRF-TOKEN
```

### 3️⃣ تحقق من الـ Cookies:

```
DevTools → Application → Cookies
ابحث عن XSRF-TOKEN
يجب أن تراه بقيمة token
```

---

## 📋 الخطوات الكاملة للإصلاح

### 1. تحديث api.js

```javascript
// استبدل getCSRFToken function بهذا:
const getCSRFToken = async () => {
  // تحقق من sessionStorage أولاً
  let token = sessionStorage.getItem('csrfToken');
  if (token && token !== 'undefined') return token;
  
  // تحقق من cookies
  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  if (csrfCookie) {
    token = csrfCookie.split('=')[1];
    sessionStorage.setItem('csrfToken', token);
    return token;
  }
  
  // طلب token جديد
  try {
    const response = await axios.get(`${API_URL}/auth/csrf-token`, { 
      withCredentials: true 
    });
    token = response.data?.data?.token || response.data?.token;
    if (token) {
      sessionStorage.setItem('csrfToken', token);
      return token;
    }
  } catch (err) {
    console.error('CSRF token fetch failed:', err);
  }
  
  return null;
};
```

### 2. تأكد من أن Register.jsx يحصل على الـ token

```javascript
useEffect(() => {
  const initCSRFToken = async () => {
    try {
      const response = await fetch('/api/v1/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.data?.token) {
        sessionStorage.setItem('csrfToken', data.data.token);
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }
  };
  
  initCSRFToken();
}, []);
```

### 3. اختبر الآن

```bash
# بعد التعديلات:
npm run build:frontend
npm start

# ثم:
1. افتح http://localhost:4000
2. اذهب إلى صفحة التسجيل
3. اختر دور "ناشر وظائف"
4. افتح DevTools
5. اكتب في الـ Console: sessionStorage.getItem('csrfToken')
6. يجب أن ترى token value (ليس null)
7. حاول التسجيل - يجب أن ينجح الآن
```

---

## 🚨 إذا استمرت المشكلة

### تفعيل debug logging:

في `api.js`:

```javascript
const api = axios.create({...});

api.interceptors.request.use(
  async (config) => {
    console.log(`🔹 [REQUEST] ${config.method.toUpperCase()} ${config.url}`);
    
    // Add CSRF token
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
      const csrfToken = await getCSRFToken();
      console.log(`🔐 [CSRF] Token present: ${!!csrfToken}`);
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        console.log(`✅ [CSRF] Header added: X-CSRF-Token: ${csrfToken.substring(0, 10)}...`);
      } else {
        console.error(`❌ [CSRF] No token available!`);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);
```

---

## ✨ ملخص الحل

| المكان | المشكلة | الحل |
|-------|--------|------|
| `getCSRFToken()` | تعود null | حفظ الـ token في sessionStorage |
| `Register.jsx` | لا تحصل على token | استدعاء `/auth/csrf-token` عند التحميل |
| `api interceptor` | قد لا يرسل الـ token | التحقق من وجود الـ token قبل الإرسال |
| `backend CSRF` | قد لا يرسل الـ token | تأكد من أن middleware يرسل الـ token |

---

**الآن يجب أن يعمل التسجيل بدون أخطاء CSRF! ✅**

