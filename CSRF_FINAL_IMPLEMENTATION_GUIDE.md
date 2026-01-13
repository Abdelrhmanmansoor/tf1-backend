# 🔐 الحل النهائي لـ CSRF Protection - 3 نقاط أساسية

## ✅ الوضع الحالي للـ Backend (جاهز بالكامل!)

كل الإعدادات المطلوبة موجودة بالفعل في Backend:

---

## 📌 النقطة 1: Frontend لازم يعمل GET csrf-token قبل login

### الـ Endpoint موجود:
```
GET /api/v1/auth/csrf-token
```

### كود الـ Frontend (React/Next.js):

```javascript
// ✅ الطريقة الصحيحة - قبل أي login أو register
const getCSRFToken = async () => {
  try {
    const response = await fetch('https://tf1-backend.onrender.com/api/v1/auth/csrf-token', {
      method: 'GET',
      credentials: 'include', // ⚠️ مهم جداً - لإرسال واستقبال cookies
    });
    
    const data = await response.json();
    return data.token; // Token للاستخدام في Header
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
};
```

### أو باستخدام Axios:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://tf1-backend.onrender.com/api/v1',
  withCredentials: true, // ⚠️ مهم جداً
});

const getCSRFToken = async () => {
  const response = await api.get('/auth/csrf-token');
  return response.data.token;
};
```

---

## 📌 النقطة 2: POST login لازم يبعت credentials: include + X-CSRF-Token

### Response من csrf-token يعمل شيئين:
1. ✅ يرجع `token` في JSON body
2. ✅ يحفظ `XSRF-TOKEN` cookie تلقائياً

### كود Login الصحيح:

```javascript
const login = async (email, password) => {
  // الخطوة 1: الحصول على CSRF token
  const csrfToken = await getCSRFToken();
  
  // الخطوة 2: إرسال طلب Login
  const response = await fetch('https://tf1-backend.onrender.com/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include', // ✅ لإرسال XSRF-TOKEN cookie
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken, // ✅ Token في Header
    },
    body: JSON.stringify({ email, password }),
  });
  
  return response.json();
};
```

### باستخدام Axios مع Interceptor (أفضل):

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://tf1-backend.onrender.com/api/v1',
  withCredentials: true,
});

// متغير لحفظ الـ CSRF token
let csrfToken = null;

// Interceptor - يضيف الـ token تلقائياً لكل request
api.interceptors.request.use(async (config) => {
  // جلب token جديد إذا غير موجود أو لـ POST/PUT/PATCH/DELETE
  if (!csrfToken || ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase())) {
    const response = await axios.get(`${config.baseURL}/auth/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = response.data.token;
  }
  
  // إضافة الـ token للـ header
  config.headers['X-CSRF-Token'] = csrfToken;
  return config;
});

// الاستخدام ببساطة:
const login = async (email, password) => {
  return api.post('/auth/login', { email, password });
};
```

---

## 📌 النقطة 3: Backend Cookie Settings (موجودة بالفعل ✅)

### ملف `src/middleware/csrf.js` يحتوي على:

```javascript
// Production + Cross-domain:
{
  httpOnly: false,        // false لأن JS يحتاج قراءة الـ cookie
  secure: true,           // ✅ HTTPS فقط
  sameSite: 'none',       // ✅ مطلوب للـ cross-domain
  maxAge: 600,            // 10 دقائق
  path: '/',
}

// Development:
{
  httpOnly: false,
  secure: false,
  sameSite: 'lax',
  maxAge: 600,
  path: '/',
}
```

### CORS Settings في `server.js`:

```javascript
app.use(cors({
  origin: allowedOrigins,           // ✅ Allowlist محدد
  credentials: true,                 // ✅ مطلوب للـ cookies
  allowedHeaders: ['X-CSRF-Token'], // ✅ مسموح
  exposedHeaders: ['X-CSRF-Token'], // ✅ Frontend يقدر يقرأه
}));
```

---

## 🔄 Flow الكامل:

```
┌──────────────────────────────────────────────────────────────────┐
│                       CSRF Protection Flow                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User يفتح صفحة Login                                          │
│     │                                                             │
│     ▼                                                             │
│  2. Frontend يستدعي GET /auth/csrf-token                         │
│     │   credentials: include                                      │
│     │                                                             │
│     ▼                                                             │
│  3. Backend يرجع:                                                 │
│     • JSON: { token: "xxx.yyy" }                                  │
│     • Cookie: XSRF-TOKEN=xxx.yyy (SameSite=None, Secure)         │
│     │                                                             │
│     ▼                                                             │
│  4. User يملأ الـ Form ويضغط Login                                │
│     │                                                             │
│     ▼                                                             │
│  5. Frontend يرسل POST /auth/login:                               │
│     • Header: X-CSRF-Token: xxx.yyy                              │
│     • Cookie: XSRF-TOKEN=xxx.yyy (تلقائي مع credentials:include) │
│     • Body: { email, password }                                   │
│     │                                                             │
│     ▼                                                             │
│  6. Backend يتحقق:                                                │
│     ✓ Header token == Cookie token                                │
│     ✓ Signature صحيح                                              │
│     ✓ Token غير منتهي الصلاحية                                    │
│     │                                                             │
│     ▼                                                             │
│  7. Login ناجح! ✅                                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧪 اختبار من Terminal:

```bash
# 1. احصل على CSRF token
curl -c cookies.txt -b cookies.txt \
  "https://tf1-backend.onrender.com/api/v1/auth/csrf-token"

# سيرجع شيء مثل:
# {"success":true,"token":"eyJub25jZSI6IjEyMzQ...","data":{...}}

# 2. استخدم الـ token في Login
curl -c cookies.txt -b cookies.txt \
  -X POST "https://tf1-backend.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <TOKEN_FROM_STEP_1>" \
  -d '{"email":"test@test.com","password":"password123"}'
```

---

## 📝 ملخص Environment Variables المطلوبة:

### Backend (.env):
```env
# ✅ مطلوب للـ Production
CSRF_SECRET=your-secret-key-here
CSRF_TOKEN_TTL_MS=600000

# ✅ CORS Origins
ALLOWED_ORIGINS=https://tf1one.com,https://www.tf1one.com

# ✅ اختياري - للتحكم بالـ cookies
FRONTEND_URL=https://tf1one.com
```

### Frontend (.env):
```env
NEXT_PUBLIC_API_URL=https://tf1-backend.onrender.com/api/v1
# أو
REACT_APP_API_URL=https://tf1-backend.onrender.com/api/v1
```

---

## ⚠️ أخطاء شائعة وحلولها:

| الخطأ | السبب | الحل |
|-------|-------|------|
| `CSRF_TOKEN_MISSING` | Frontend لم يرسل token | أضف `credentials: 'include'` + `X-CSRF-Token` header |
| `CSRF_TOKEN_MISMATCH` | Token في Header ≠ Cookie | تأكد من استخدام نفس الـ token |
| `CSRF_TOKEN_EXPIRED` | Token أكثر من 10 دقائق | استدعي `/csrf-token` مرة أخرى |
| `CSRF_ORIGIN_INVALID` | Origin غير مسموح | أضف الـ domain للـ `ALLOWED_ORIGINS` |
| Cookie لا تصل | SameSite/Secure خاطئ | Production يحتاج HTTPS |

---

## ✅ Checklist نهائي:

### Frontend:
- [ ] استدعاء `GET /auth/csrf-token` قبل login
- [ ] إضافة `credentials: 'include'` لكل request
- [ ] إضافة `X-CSRF-Token` header لـ POST/PUT/PATCH/DELETE
- [ ] عدم حفظ الـ token في localStorage (يبقى في memory)

### Backend (موجود بالفعل ✅):
- [x] Endpoint `/auth/csrf-token` موجود
- [x] `verifyCsrf` middleware على login
- [x] Cookie settings: `SameSite=None` + `Secure` في production
- [x] CORS: `credentials: true` + allowlist
- [x] `X-CSRF-Token` في `allowedHeaders` و `exposedHeaders`

---

## 🎯 الخلاصة:

**Backend جاهز 100%** - الـ Frontend فقط يحتاج:

1. ✅ `GET /csrf-token` قبل login (مع `credentials: 'include'`)
2. ✅ `POST /login` مع `X-CSRF-Token` header (مع `credentials: 'include'`)
3. ✅ Backend يتعامل مع الباقي تلقائياً!
