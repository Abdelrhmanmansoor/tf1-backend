# ⚡ مرجع سريع - نظام المباريات

## 🚀 البدء السريع (3 دقائق)

```bash
# 1. التثبيت
cd tf1-backend
npm install

# 2. إضافة المدن (مرة واحدة فقط)
npm run seed:locations

# 3. التشغيل
npm run dev
```

---

## 📋 أهم الـ Endpoints

### Locations
```http
GET  /matches/api/locations/cities          # جميع المدن
GET  /matches/api/locations/cities/:id/districts  # أحياء المدينة
GET  /matches/api/locations/search?q=الرياض  # بحث
```

### Matches
```http
POST /matches/api/matches                   # إنشاء
GET  /matches/api/matches                   # قائمة
POST /matches/api/matches/:id/join          # انضمام
```

---

## 💻 إنشاء مباراة

### مع location_id (موصى به)
```javascript
{
  "title": "مباراة الجمعة",
  "sport": "Football",
  "location_id": "DISTRICT_ID",
  "date": "2026-01-20",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14
}
```

### مع city/area
```javascript
{
  "title": "مباراة الجمعة",
  "sport": "Football",
  "city": "الرياض",
  "area": "العليا",
  "location": "النادي",
  "date": "2026-01-20",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14
}
```

---

## ✅ Validation Rules

| الحقل | المطلوب؟ | القواعد |
|-------|---------|---------|
| `city` | ✅ | يجب أن تكون موجودة |
| `area` | ❌ | يجب أن تكون موجودة في المدينة |
| `location_id` | ❌ | بديل لـ city/area |
| `date` | ✅ | تاريخ مستقبلي |
| `time` | ✅ | HH:MM format |
| `level` | ✅ | beginner/intermediate/advanced |
| `max_players` | ✅ | 2-100 |

---

## 🔧 npm Scripts

```bash
npm run dev              # Development mode
npm start                # Production mode
npm run seed:locations   # إضافة المدن السعودية
npm test                 # Run tests
```

---

## 📚 الملفات المهمة

| الملف | الاستخدام |
|------|-----------|
| `MATCHES_SYSTEM_QUICK_START.md` | للبدء السريع |
| `LOCATIONS_SYSTEM_GUIDE.md` | نظام المواقع |
| `LOCATIONS_FRONTEND_EXAMPLES.md` | أمثلة Frontend |
| `COMPLETE_MATCHES_SYSTEM_SUMMARY.md` | ملخص شامل |

---

## 🐛 حل المشاكل الشائعة

### "location_id is required"
```javascript
// الحل: استخدم city/area بدلاً منه
{
  "city": "الرياض",
  "area": "العليا"
}
```

### "المدينة غير موجودة"
```bash
# الحل: شغّل الـ seeder
npm run seed:locations
```

### "Cannot connect to Redis"
```javascript
// لا مشكلة! سيستخدم in-memory cache تلقائياً
```

---

## 🎯 Environment Variables المهمة

```env
# الأساسيات
PORT=4000
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# JWT
JWT_SECRET=your-secret
MATCHES_JWT_SECRET=your-matches-secret

# Redis (اختياري)
REDIS_HOST=localhost
```

---

## 📊 Status Codes

| Code | المعنى |
|------|--------|
| 200 | نجح |
| 201 | تم الإنشاء |
| 400 | خطأ في البيانات |
| 401 | غير مصرح |
| 404 | غير موجود |
| 500 | خطأ في السيرفر |

---

## 💡 نصائح سريعة

1. **استخدم location_id** - أسرع وأدق
2. **شغّل Seeder** - قبل أول استخدام
3. **استخدم Redis** - للأداء الأفضل
4. **راجع الـ Logs** - عند حدوث أخطاء

---

**النسخة**: 2.1.0  
**آخر تحديث**: يناير 2026

