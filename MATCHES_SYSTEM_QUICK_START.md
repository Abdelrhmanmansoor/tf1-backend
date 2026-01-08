# 🚀 Quick Start - نظام المباريات المحسّن

## البدء السريع في 5 دقائق

### 1️⃣ تثبيت Dependencies
```bash
cd tf1-backend
npm install
```

### 2️⃣ إعداد Environment Variables
أنشئ ملف `.env` في مجلد `tf1-backend`:

```env
# الأساسيات (مطلوبة)
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# JWT (مطلوبة)
JWT_SECRET=your-secret-key-here-change-in-production
MATCHES_JWT_SECRET=your-matches-secret-key-here

# Email (مطلوبة للتحقق من البريد)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@sportsplatform.com

# Frontend
FRONTEND_URL=http://localhost:3000

# Redis (اختياري - لكن موصى به للأداء)
REDIS_HOST=localhost
REDIS_PORT=6379
```

💡 **نصيحة**: راجع `ENV_VARIABLES_REQUIRED.md` لقائمة كاملة بالمتغيرات.

### 3️⃣ تشغيل MongoDB
```bash
# تأكد من تشغيل MongoDB
mongod
# أو
brew services start mongodb-community
```

### 4️⃣ (اختياري) تشغيل Redis للأداء الأفضل
```bash
# Windows: قم بتحميله من
# https://github.com/microsoftarchive/redis/releases

# Linux
sudo apt-get install redis-server
redis-server

# Mac
brew install redis
redis-server
```

### 5️⃣ تشغيل السيرفر
```bash
# Development mode
npm run dev

# Production mode
npm start
```

---

## 🧪 اختبار النظام

### التسجيل
```bash
curl -X POST http://localhost:4000/matches/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'
```

### تسجيل الدخول
```bash
curl -X POST http://localhost:4000/matches/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### إنشاء مباراة
```bash
curl -X POST http://localhost:4000/matches/api/matches \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Friday Football",
    "sport": "Football",
    "city": "Cairo",
    "area": "Nasr City",
    "location": "Sports Club",
    "date": "2026-01-20",
    "time": "18:00",
    "level": "intermediate",
    "max_players": 14
  }'
```

### عرض المباريات
```bash
curl http://localhost:4000/matches/api/matches?sport=Football&page=1&limit=10
```

---

## 📚 المستندات

- `MATCHES_SYSTEM_IMPROVEMENTS.md` - دليل شامل للتحسينات
- `MATCHES_SYSTEM_FIXES_SUMMARY.md` - ملخص جميع الإصلاحات
- `ENV_VARIABLES_REQUIRED.md` - جميع متغيرات البيئة
- `MATCHES_API_DOCUMENTATION.md` - توثيق API كامل

---

## 🎯 الميزات الجديدة

✅ **Caching System** - أداء أسرع 10x  
✅ **Advanced Search** - بحث محسّن  
✅ **Security Layers** - حماية متعددة  
✅ **Error Handling** - معالجة احترافية  
✅ **Validation** - تحقق شامل  

---

## 🆘 حل المشاكل

### مشكلة: "Cannot connect to MongoDB"
```bash
# تأكد من تشغيل MongoDB
mongod --version
```

### مشكلة: "Redis connection failed"
لا مشكلة! النظام سيستخدم in-memory cache تلقائياً.

### مشكلة: "Email not sending"
تأكد من:
- SMTP credentials صحيحة
- استخدام App Password لـ Gmail
- الإنترنت متصل

---

## 🎉 جاهز!

النظام الآن جاهز للاستخدام! 🚀

للمزيد من المعلومات، راجع الملفات الأخرى في المجلد.


