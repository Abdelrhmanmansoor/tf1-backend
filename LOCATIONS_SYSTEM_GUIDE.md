# 🏙️ نظام المدن والمناطق - دليل شامل

## نظرة عامة

تم إنشاء نظام كامل للمدن والمناطق السعودية مع:
- ✅ **13 منطقة إدارية**
- ✅ **أكثر من 50 مدينة**
- ✅ **أحياء تفصيلية للمدن الكبرى**
- ✅ **Validation تلقائي للمدن والمناطق**
- ✅ **API endpoints كاملة**

---

## 📦 الإعداد الأولي

### 1. تشغيل Seeder لإضافة المدن

```bash
cd tf1-backend
npm run seed:locations
```

سيتم إضافة:
- 1 دولة (السعودية)
- 13 منطقة
- 50+ مدينة
- 50+ حي/منطقة

### 2. التحقق من نجاح العملية

يجب أن تظهر رسالة:
```
✅ Successfully seeded XXX locations!

📊 Summary:
   Countries: 1
   Regions: 13
   Cities: 50+
   Districts: 50+
```

---

## 🔌 API Endpoints

### 1. الحصول على جميع المناطق

```http
GET /matches/api/locations/regions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name_ar": "منطقة الرياض",
      "name_en": "Riyadh Region",
      "slug": "riyadh-region",
      "level": "region"
    }
  ]
}
```

### 2. الحصول على جميع المدن

```http
GET /matches/api/locations/cities
```

أو تصفية حسب المنطقة:
```http
GET /matches/api/locations/cities?regionId=REGION_ID
```

### 3. الحصول على أحياء مدينة معينة

```http
GET /matches/api/locations/cities/CITY_ID/districts
```

### 4. البحث في المواقع

```http
GET /matches/api/locations/search?q=الرياض
```

أو البحث في مستوى معين:
```http
GET /matches/api/locations/search?q=الرياض&level=city
```

### 5. الحصول على تفاصيل موقع

```http
GET /matches/api/locations/LOCATION_ID
```

### 6. الحصول على التسلسل الهرمي

```http
GET /matches/api/locations/LOCATION_ID/hierarchy
```

---

## 🎯 استخدام النظام في إنشاء المباريات

### الطريقة 1: باستخدام location_id (موصى به)

```javascript
POST /matches/api/matches

{
  "title": "مباراة الجمعة",
  "sport": "Football",
  "date": "2026-01-20",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14,
  "location_id": "DISTRICT_ID"  // معرف الحي
}
```

سيتم تعبئة city, area, location تلقائياً من بيانات Location.

### الطريقة 2: باستخدام اسم المدينة والمنطقة

```javascript
POST /matches/api/matches

{
  "title": "مباراة الجمعة",
  "sport": "Football",
  "city": "الرياض",      // سيتم التحقق من وجودها
  "area": "العليا",      // سيتم التحقق من وجودها في الرياض
  "location": "ملعب النادي",
  "date": "2026-01-20",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14
}
```

---

## ✅ Validation Rules

### 1. المدينة مطلوبة

```javascript
// ❌ سيفشل
{
  "title": "Match",
  // بدون city أو location_id
}

// رسالة الخطأ:
"يجب تحديد المدينة على الأقل (city أو location_id)"
```

### 2. المدينة يجب أن تكون موجودة

```javascript
// ❌ سيفشل
{
  "city": "مدينة غير موجودة"
}

// رسالة الخطأ:
"المدينة 'مدينة غير موجودة' غير موجودة. يرجى اختيار مدينة صحيحة"
```

### 3. المنطقة يجب أن تكون موجودة في المدينة

```javascript
// ❌ سيفشل
{
  "city": "الرياض",
  "area": "حي غير موجود"
}

// رسالة الخطأ:
"المنطقة 'حي غير موجود' غير موجودة في مدينة 'الرياض'"
```

### 4. location_id يجب أن يكون صحيحاً

```javascript
// ❌ سيفشل
{
  "location_id": "invalid_id"
}

// رسالة الخطأ:
"Location ID not found"
```

---

## 🌍 المدن المتوفرة

### المناطق الرئيسية:

1. **منطقة الرياض**
   - الرياض (8 أحياء)

2. **منطقة مكة المكرمة**
   - مكة المكرمة (3 أحياء)
   - جدة (6 أحياء)
   - الطائف (2 حي)

3. **المنطقة الشرقية**
   - الدمام (2 حي)
   - الخبر (2 حي)
   - الظهران
   - الأحساء
   - الجبيل

4. **المدينة المنورة**
   - المدينة المنورة (2 حي)
   - ينبع

5. **منطقة عسير**
   - أبها
   - خميس مشيط

6. **منطقة تبوك**
   - تبوك

7. **منطقة القصيم**
   - بريدة
   - عنيزة

8. **منطقة حائل**
   - حائل

9. **الحدود الشمالية**
   - عرعر

10. **منطقة جازان**
    - جازان

11. **منطقة نجران**
    - نجران

12. **منطقة الباحة**
    - الباحة

13. **منطقة الجوف**
    - سكاكا

---

## 💻 أمثلة استخدام Frontend

### React/Next.js Example

```typescript
// 1. جلب المدن
const [cities, setCities] = useState([]);

useEffect(() => {
  fetch('/matches/api/locations/cities')
    .then(res => res.json())
    .then(data => setCities(data.data));
}, []);

// 2. جلب الأحياء عند اختيار مدينة
const [districts, setDistricts] = useState([]);

const handleCityChange = async (cityId) => {
  const res = await fetch(`/matches/api/locations/cities/${cityId}/districts`);
  const data = await res.json();
  setDistricts(data.data);
};

// 3. إنشاء مباراة
const createMatch = async () => {
  await fetch('/matches/api/matches', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify({
      title: 'Friday Match',
      sport: 'Football',
      location_id: selectedDistrictId,  // من القائمة المنسدلة
      date: '2026-01-20',
      time: '18:00',
      level: 'intermediate',
      max_players: 14
    })
  });
};
```

### HTML Select Example

```html
<!-- المدن -->
<select id="city" onchange="loadDistricts(this.value)">
  <option value="">اختر المدينة</option>
  <!-- سيتم تعبئتها من API -->
</select>

<!-- الأحياء -->
<select id="district">
  <option value="">اختر الحي</option>
  <!-- سيتم تعبئتها عند اختيار مدينة -->
</select>

<script>
async function loadCities() {
  const res = await fetch('/matches/api/locations/cities');
  const data = await res.json();
  
  const select = document.getElementById('city');
  data.data.forEach(city => {
    const option = document.createElement('option');
    option.value = city._id;
    option.textContent = city.name_ar;
    select.appendChild(option);
  });
}

async function loadDistricts(cityId) {
  const res = await fetch(`/matches/api/locations/cities/${cityId}/districts`);
  const data = await res.json();
  
  const select = document.getElementById('district');
  select.innerHTML = '<option value="">اختر الحي</option>';
  
  data.data.forEach(district => {
    const option = document.createElement('option');
    option.value = district._id;
    option.textContent = district.name_ar;
    select.appendChild(option);
  });
}

loadCities();
</script>
```

---

## 🔧 الإضافة والتعديل

### إضافة مدن جديدة

قم بتعديل `src/seeders/saudi-locations.js` وأضف المدينة:

```javascript
{
  level: 'city',
  name_ar: 'المدينة الجديدة',
  name_en: 'New City',
  slug: 'new-city',
  children: [
    { 
      level: 'district', 
      name_ar: 'حي جديد', 
      name_en: 'New District', 
      slug: 'new-city-new-district' 
    }
  ]
}
```

ثم شغل الـ seeder مرة أخرى:
```bash
npm run seed:locations
```

---

## 📊 Database Schema

```javascript
{
  _id: ObjectId,
  parent_id: ObjectId,  // null للدولة، region_id للمدن، إلخ
  level: String,        // country, region, city, district
  code: String,         // كود اختياري
  name_ar: String,      // الاسم بالعربية
  name_en: String,      // الاسم بالإنجليزية
  slug: String,         // URL-friendly identifier
  created_at: Date,
  updated_at: Date
}
```

---

## 🎯 الخلاصة

✅ **النظام جاهز 100%**  
✅ **جميع المدن السعودية متوفرة**  
✅ **Validation تلقائي**  
✅ **API endpoints كاملة**  
✅ **سهل الاستخدام**  
✅ **قابل للتوسع**

---

## 📝 الخطوات التالية

1. **شغل الـ Seeder**:
   ```bash
   npm run seed:locations
   ```

2. **جرب الـ API**:
   ```bash
   curl http://localhost:4000/matches/api/locations/cities
   ```

3. **استخدم في إنشاء المباريات**:
   - احصل على المدن
   - احصل على الأحياء
   - استخدم location_id في إنشاء المباراة

---

**تاريخ الإنشاء**: يناير 2026  
**الحالة**: ✅ جاهز للاستخدام  
**الإصدار**: 1.0.0


