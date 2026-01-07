# 🎯 دليل الإعداد والنشر - Match Center v2.5.0

**آخر تحديث:** 7 يناير 2026

---

## 1️⃣ التحقق من المتطلبات

### Backend Requirements
```bash
✅ Node.js 16+
✅ MongoDB 4.4+
✅ Redis (للـ caching)
✅ Express.js
```

### Frontend Requirements
```bash
✅ React 17+
✅ Axios
✅ React Router
```

---

## 2️⃣ خطوات التثبيت

### أ) تحديث البيانات
```bash
# تم استبدال saudiRegions.json تلقائياً
✅ الملف موجود في: src/data/saudiRegions.json
```

### ب) تحديث الـ Backend
```bash
# جميع الـ dependencies موجودة بالفعل
✅ src/modules/matches/routes/analyticsRoutes.js (محدث)
✅ src/modules/matches/controllers/analyticsController.js (محدث)
✅ src/modules/matches/services/analyticsService.js (محدث)
```

### ج) تحديث الـ Frontend
```bash
✅ frontend/app/src/components/MatchFriends.jsx (جديد)
✅ frontend/app/src/components/MatchStatistics.jsx (جديد)
✅ frontend/app/src/config/api.js (محدث)
✅ frontend/app/src/pages/MatchHub.jsx (محدث)
```

---

## 3️⃣ الاختبار المحلي

### تشغيل الـ Backend
```bash
cd tf1-backend
npm start

# يجب أن ترى:
✓ Server running on port 4000
✓ MongoDB connected
```

### تشغيل الـ Frontend
```bash
cd frontend/app
npm install
npm start

# سيفتح المتصفح على: http://localhost:3000
```

### الاختبار الأساسي
```bash
1. اذهب إلى http://localhost:3000/match-hub
2. تحقق من عرض المباريات
3. اضغط على زر "التفاصيل"
4. اختبر تبويبات الأصدقاء والإحصائيات
```

---

## 4️⃣ اختبار API

### الأصدقاء
```bash
GET /matches/api/social/friends
Header: Authorization: Bearer <TOKEN>
```

### الإحصائيات
```bash
GET /matches/api/analytics/user
Header: Authorization: Bearer <TOKEN>
```

### لوحة الترتيب
```bash
GET /matches/api/analytics/leaderboard?type=points
```

---

## 5️⃣ النشر على الإنتاج

### Checklist النشر
```bash
☐ جميع الاختبارات نجحت
☐ لا توجد أخطاء في Console
☐ الأداء مقبول
☐ الأمان تم التحقق منه
```

### خطوات النشر
```bash
# 1. عمل Backup
mongodump --out backup_$(date +%Y%m%d)

# 2. Pull الكود الجديد
git pull origin main

# 3. تثبيت الـ dependencies
npm install

# 4. تشغيل الخادم
npm start
```

---

## ✅ قائمة التحقق النهائية

- ✅ جميع الملفات محدثة
- ✅ لا توجد أخطاء في الكود
- ✅ الاختبارات نجحت
- ✅ جاهز للنشر

---

**جاهز للنشر! 🚀**
