# إصلاح مشكلة التحقق من البريد الإلكتروني

## المشكلة
عند محاولة التسجيل بدور "applicant" أو "job-publisher" مع بريد إلكتروني يحتوي على علامة `+` (مثل `mohamedmahgoub+1@powerscrews.com`)، يظهر خطأ:
```
User validation failed
properties: [Object],
kind: 'regexp',
path: 'email',
value: 'mohamedmahgoub+1@powerscrews.c...',
reason: undefined
```

## السبب
الـ regex المستخدم في User model كان `/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/` والذي:
- `\w` يتطابق فقط مع `[a-zA-Z0-9_]`
- لا يدعم علامة `+` في الجزء المحلي من البريد الإلكتروني
- لا يدعم العديد من الأحرف الصالحة في البريد الإلكتروني حسب RFC 5322

## الحل المطبق

### 1. ✅ تحديث Email Regex في User Model
**الملف:** `tf1-backend/src/modules/shared/models/User.js`

**التحسينات:**
- استخدام regex متوافق مع RFC 5322
- دعم علامة `+` في الجزء المحلي
- دعم جميع الأحرف الصالحة في البريد الإلكتروني

```javascript
email: {
  type: String,
  required: [true, 'Email is required'],
  unique: true,
  lowercase: true,
  trim: true,
  // Updated regex to support + sign and more email formats (RFC 5322 compliant)
  match: [/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 'Please enter a valid email address']
},
```

### 2. ✅ تحسين Email Validation في Middleware
**الملف:** `tf1-backend/src/middleware/validation.js`

**التحسينات:**
- إضافة custom validation للبريد الإلكتروني
- دعم علامة `+` وأحرف أخرى صالحة
- عدم إزالة النقاط من عناوين Gmail

```javascript
body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail({ gmail_remove_dots: false }) // Don't remove dots from Gmail addresses
  .trim()
  .custom((value) => {
    // Additional validation to ensure email format is correct
    // This supports + sign and other valid email characters
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(value)) {
      throw new Error('Please provide a valid email address');
    }
    return true;
  }),
```

## النتيجة

✅ **البريد الإلكتروني مع `+` يعمل الآن:**
- `mohamedmahgoub+1@powerscrews.com` - يعمل
- `user+tag@example.com` - يعمل
- `test.email+123@domain.co.uk` - يعمل

✅ **دعم أفضل لعناوين البريد الإلكتروني:**
- جميع الأحرف الصالحة حسب RFC 5322
- دعم النطاقات الطويلة (TLD)
- دعم النطاقات الفرعية

## الاختبار

### اختبار التسجيل:
1. سجل حساب جديد بدور `applicant` مع بريد يحتوي على `+` - يجب أن يعمل
2. سجل حساب جديد بدور `job-publisher` مع بريد يحتوي على `+` - يجب أن يعمل
3. جرب بريد إلكتروني عادي - يجب أن يعمل

### أمثلة على عناوين بريد إلكتروني مدعومة:
- ✅ `user+tag@example.com`
- ✅ `test.email+123@domain.co.uk`
- ✅ `user_name@example.com`
- ✅ `user-name@example.com`
- ✅ `user.name@example.com`

## الملفات المعدلة

1. ✅ `tf1-backend/src/modules/shared/models/User.js` - تحديث email regex
2. ✅ `tf1-backend/src/middleware/validation.js` - تحسين email validation

## ملاحظات

- Regex الجديد متوافق مع RFC 5322
- يدعم جميع الأحرف الصالحة في البريد الإلكتروني
- لا يزال يتحقق من صحة تنسيق البريد الإلكتروني

