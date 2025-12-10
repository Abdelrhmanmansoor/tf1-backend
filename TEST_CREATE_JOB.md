# اختبار إنشاء وظيفة جديدة

## ✅ تم إصلاح المشكلة

تم تحسين الـ controller ليعطي رسائل خطأ واضحة بالعربي والإنجليزي.

---

## 🔧 الـ Endpoint

```
POST /api/v1/clubs/jobs
```

**Headers:**
```
Authorization: Bearer YOUR_CLUB_TOKEN
Content-Type: application/json
```

---

## 📝 مثال على البيانات المطلوبة (الحد الأدنى)

```json
{
  "title": "مدرب كرة قدم",
  "titleAr": "مدرب كرة قدم",
  "description": "نبحث عن مدرب كرة قدم محترف للفريق الأول",
  "descriptionAr": "نبحث عن مدرب كرة قدم محترف للفريق الأول",
  "jobType": "permanent",
  "category": "coach",
  "employmentType": "full_time",
  "applicationDeadline": "2024-12-31T23:59:59.999Z"
}
```

---

## 📋 مثال كامل مع جميع الحقول

```json
{
  "title": "Football Coach",
  "titleAr": "مدرب كرة قدم",
  "description": "We are looking for an experienced football coach to lead our first team. The ideal candidate should have proven experience in coaching professional teams and developing player skills.",
  "descriptionAr": "نبحث عن مدرب كرة قدم ذو خبرة لقيادة فريقنا الأول. يجب أن يكون لدى المرشح المثالي خبرة مثبتة في تدريب الفرق المحترفة وتطوير مهارات اللاعبين.",
  
  "jobType": "permanent",
  "category": "coach",
  "employmentType": "full_time",
  
  "sport": "football",
  "position": "Head Coach",
  "city": "Riyadh",
  "country": "Saudi Arabia",
  
  "requirements": {
    "description": "UEFA Pro License or equivalent coaching certification",
    "descriptionAr": "رخصة UEFA Pro أو شهادة تدريب معادلة",
    "minimumExperience": 5,
    "educationLevel": "bachelor",
    "certifications": ["UEFA Pro License", "First Aid Certificate"],
    "skills": ["Tactical Analysis", "Player Development", "Team Management"],
    "ageRange": {
      "min": 30,
      "max": 55
    },
    "gender": "any",
    "languages": ["arabic", "english"]
  },
  
  "responsibilities": [
    {
      "responsibility": "Lead team training sessions",
      "responsibilityAr": "قيادة جلسات التدريب الجماعية"
    },
    {
      "responsibility": "Develop match strategies",
      "responsibilityAr": "تطوير استراتيجيات المباريات"
    },
    {
      "responsibility": "Manage player performance",
      "responsibilityAr": "إدارة أداء اللاعبين"
    }
  ],
  
  "workSchedule": "Monday to Saturday, 8:00 AM - 5:00 PM",
  "workScheduleAr": "من الاثنين إلى السبت، 8:00 صباحاً - 5:00 مساءً",
  
  "benefits": [
    {
      "benefit": "Competitive salary",
      "benefitAr": "راتب تنافسي"
    },
    {
      "benefit": "Health insurance",
      "benefitAr": "تأمين صحي"
    },
    {
      "benefit": "Annual bonus",
      "benefitAr": "مكافأة سنوية"
    }
  ],
  
  "salary": {
    "min": 15000,
    "max": 25000,
    "currency": "SAR",
    "period": "monthly",
    "negotiable": true
  },
  
  "expectedStartDate": "2025-01-15",
  "applicationDeadline": "2024-12-31T23:59:59.999Z",
  
  "numberOfPositions": 1,
  "urgency": "normal",
  "status": "active"
}
```

---

## 🎯 الحقول المطلوبة (Required)

يجب أن تتضمن البيانات هذه الحقول على الأقل:

1. ✅ **title** - عنوان الوظيفة (إنجليزي)
2. ✅ **description** - وصف الوظيفة (إنجليزي)
3. ✅ **jobType** - نوع الوظيفة
   - Options: `permanent`, `seasonal`, `temporary`, `trial`, `internship`, `volunteer`
4. ✅ **category** - فئة الوظيفة
   - Options: `coach`, `player`, `specialist`, `administrative`, `security_maintenance`, `medical`, `other`
5. ✅ **employmentType** - نوع التوظيف
   - Options: `full_time`, `part_time`, `contract`, `freelance`
6. ✅ **applicationDeadline** - تاريخ انتهاء التقديم
   - Format: ISO 8601 date string (e.g., `"2024-12-31T23:59:59.999Z"`)

---

## 📊 رسائل الخطأ المحتملة

### 1. حقل مفقود

```json
{
  "success": false,
  "message": "Job title is required",
  "messageAr": "عنوان الوظيفة مطلوب"
}
```

### 2. خطأ في التحقق من البيانات

```json
{
  "success": false,
  "message": "Validation failed",
  "messageAr": "فشل التحقق من البيانات",
  "errors": [
    {
      "field": "jobType",
      "message": "jobType must be one of: permanent, seasonal, temporary, trial, internship, volunteer"
    }
  ]
}
```

### 3. نجاح العملية

```json
{
  "success": true,
  "message": "Job posting created successfully",
  "messageAr": "تم نشر الوظيفة بنجاح",
  "job": {
    "_id": "675...",
    "title": "Football Coach",
    "titleAr": "مدرب كرة قدم",
    "clubId": "674...",
    "status": "active",
    "createdAt": "2024-12-10T...",
    ...
  }
}
```

---

## 🧪 اختبار باستخدام cURL

```bash
curl -X POST http://localhost:5000/api/v1/clubs/jobs \
  -H "Authorization: Bearer YOUR_CLUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "مدرب كرة قدم",
    "titleAr": "مدرب كرة قدم",
    "description": "نبحث عن مدرب كرة قدم محترف",
    "descriptionAr": "نبحث عن مدرب كرة قدم محترف",
    "jobType": "permanent",
    "category": "coach",
    "employmentType": "full_time",
    "applicationDeadline": "2024-12-31T23:59:59.999Z"
  }'
```

---

## 🧪 اختبار باستخدام Postman

1. **Method:** POST
2. **URL:** `http://localhost:5000/api/v1/clubs/jobs`
3. **Headers:**
   - `Authorization`: `Bearer YOUR_CLUB_TOKEN`
   - `Content-Type`: `application/json`
4. **Body (raw JSON):** انسخ أحد الأمثلة أعلاه

---

## 🔍 التحقق من الـ Logs

بعد إرسال الطلب، تحقق من console logs في السيرفر:

```
📝 Creating job posting with data: { title: '...', ... }
✅ Job posting created successfully: 675...
```

أو في حالة الخطأ:

```
❌ Error creating job posting: ValidationError: ...
```

---

## ✅ الحل

تم تحسين الـ controller في:
- `src/modules/club/controllers/clubController.js`

التحسينات:
1. ✅ رسائل خطأ واضحة بالعربي والإنجليزي
2. ✅ التحقق من جميع الحقول المطلوبة قبل الحفظ
3. ✅ معالجة أخطاء Validation بشكل صحيح
4. ✅ معالجة أخطاء Duplicate Key
5. ✅ إضافة console.log للتتبع

---

## 🚀 الخطوات التالية

1. شغّل السيرفر
2. احصل على Club Token من تسجيل الدخول
3. جرّب إنشاء وظيفة باستخدام أحد الأمثلة أعلاه
4. تحقق من الـ response والـ logs

إذا استمرت المشكلة، أرسل لي:
- الـ request body الذي ترسله
- الـ response الذي تحصل عليه
- الـ console logs من السيرفر
