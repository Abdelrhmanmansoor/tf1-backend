# 🔧 Duplicate Index Fix - Deployment Issue

## المشكلة
كانت هناك تحذيرات من Mongoose عن duplicate indexes:
```
[MONGOOSE] Warning: Duplicate schema index on {"name":1} found.
[MONGOOSE] Warning: Duplicate schema index on {"sessionId":1} found.
```

## السبب
المشكلة تحدث عندما يتم تعريف index بطريقتين:
1. `index: true` في تعريف الحقل
2. `schema.index()` في نهاية الـ schema

## الملفات التي تم إصلاحها

### 1. `src/modules/cv/models/CV.js`
**المشكلة:**
- `sessionId: { index: true }` في تعريف الحقل
- `cvSchema.index({ sessionId: 1 });` في نهاية الـ schema

**الحل:**
- إزالة `index: true` من تعريف الحقل
- الاحتفاظ بـ `cvSchema.index({ sessionId: 1 });` فقط

### 2. `src/modules/matches/models/Team.js`
**المشكلة:**
- `name: { unique: true }` في تعريف الحقل (ينشئ index تلقائياً)
- `teamSchema.index({ name: 1 });` في نهاية الـ schema

**الحل:**
- إزالة `unique: true` من تعريف الحقل
- استخدام `teamSchema.index({ name: 1 }, { unique: true });` بدلاً من ذلك

### 3. `src/modules/coach/models/CoachEarnings.js`
**المشكلة:**
- `coachId: { index: true }`
- `paymentStatus: { index: true }`
- `month: { index: true }`
- `year: { index: true }`
- ثم compound indexes تحتوي على هذه الحقول

**الحل:**
- إزالة `index: true` من جميع الحقول
- الاحتفاظ بـ compound indexes فقط
- إضافة single field index لـ `studentId` فقط لأنه ليس جزء من compound index

### 4. `src/models/BlockedUser.js`
**المشكلة:**
- `userId: { index: true }`
- `blockedUserId: { index: true }`
- ثم compound index `{ userId: 1, blockedUserId: 1 }`

**الحل:**
- إزالة `index: true` من `userId` و `blockedUserId`
- الاحتفاظ بـ compound index فقط

## القاعدة العامة

### ✅ افعل:
```javascript
// استخدم schema.index() فقط
schema.index({ field: 1 });
schema.index({ field1: 1, field2: 1 }); // compound index
```

### ❌ لا تفعل:
```javascript
// لا تخلط بين الطريقتين
field: { type: String, index: true }, // ❌
schema.index({ field: 1 }); // ❌ duplicate!
```

### ✅ استثناء:
```javascript
// unique: true في تعريف الحقل + compound index = OK
field: { type: String, unique: true }, // ✅
schema.index({ field: 1, otherField: 1 }); // ✅ OK
```

## التحقق من الإصلاح

بعد الإصلاح، يجب ألا تظهر تحذيرات duplicate index عند تشغيل التطبيق.

## ملاحظات

- Compound indexes لا تسبب duplicate مع single field indexes عادة
- لكن `index: true` في تعريف الحقل + `schema.index()` على نفس الحقل = duplicate
- `unique: true` ينشئ index تلقائياً، لذا لا تحتاج `schema.index()` على نفس الحقل

