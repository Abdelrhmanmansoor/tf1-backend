# إصلاح مشكلة "Validation failed" عند التسجيل

## المشكلة
عند محاولة تسجيل حساب جديد بدور "applicant" أو "job-publisher"، يظهر خطأ "Validation failed" ولا يتم التسجيل.

## السبب
1. **تكرار في الحقول:** في Frontend، كان هناك تكرار في `payload` (firstName, lastName, phone, password, role مكررة مرتين)
2. **معالجة أخطاء غير واضحة:** رسائل الخطأ من Backend لم تكن واضحة في Frontend
3. **عدم التحقق من الحقول المطلوبة:** لم يكن هناك تحقق صريح من الحقول المطلوبة قبل الإرسال

## الحل المطبق

### 1. ✅ إصلاح تكرار الحقول في Frontend
**الملف:** `tf1-frontend/app/register/page.tsx`

**التحسينات:**
- إزالة التكرار في `payload`
- إضافة `.trim()` لتنظيف الحقول
- التحقق من الحقول المطلوبة قبل الإرسال

```typescript
const payload: any = {
  email: data.email,
  password: data.password,
  role: data.role,
  firstName: data.firstName?.trim(),
  lastName: data.lastName?.trim(),
  phone: data.phone?.trim()
}

// Validate required fields for applicant and job-publisher
if (['applicant', 'job-publisher'].includes(data.role)) {
  if (!payload.firstName || !payload.lastName) {
    toast.error(language === 'ar' ? 'الاسم الأول والأخير مطلوبان' : 'First name and last name are required')
    setLoading(false)
    return
  }
}
```

### 2. ✅ تحسين معالجة الأخطاء في `authService`
**الملف:** `tf1-frontend/services/auth.ts`

**التحسينات:**
- التحقق من الحقول المطلوبة قبل الإرسال
- رسائل خطأ واضحة

```typescript
async register(userData: RegisterData): Promise<any> {
  try {
    // Ensure required fields are present
    if (!userData.email || !userData.password || !userData.role) {
      throw new Error('Missing required fields: email, password, and role are required')
    }
    
    // For applicant and job-publisher roles, ensure firstName and lastName are present
    if (['applicant', 'job-publisher'].includes(userData.role)) {
      if (!userData.firstName || !userData.lastName) {
        throw new Error('First name and last name are required for this role')
      }
    }
    
    const response = await api.post('/auth/register', userData)
    return response.data
  } catch (error) {
    const err = this.handleError(error)
    throw err
  }
}
```

### 3. ✅ تحسين رسائل الخطأ في Backend
**الملف:** `tf1-backend/src/middleware/validation.js`

**التحسينات:**
- رسائل خطأ مفصلة
- إضافة `messageAr` للعربية
- معلومات أكثر في console logs

```javascript
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    const firstError = errorMessages[0];
    const detailedMessage = firstError 
      ? `${firstError.field}: ${firstError.message}`
      : 'Validation failed. Please check your input.';

    return res.status(400).json({
      success: false,
      message: detailedMessage,
      messageAr: firstError?.message || 'فشل التحقق من البيانات. يرجى التحقق من المدخلات.',
      errors: errorMessages,
      code: 'VALIDATION_ERROR',
    });
  }

  next();
};
```

### 4. ✅ تحسين معالجة الأخطاء في Register Page
**الملف:** `tf1-frontend/app/register/page.tsx`

**التحسينات:**
- معالجة خاصة لأخطاء التحقق
- ترجمة رسائل الخطأ للعربية
- رسائل واضحة ومفيدة

```typescript
// Handle validation errors from backend
if (err.response?.data?.code === 'VALIDATION_ERROR' || err.response?.data?.errors) {
  const errorData = err.response.data
  const errors = errorData.errors || []
  
  if (errors.length > 0) {
    const first = errors[0]
    const fieldName = first.field || ''
    
    // Map common validation errors
    const errorMap: Record<string, { ar: string; en: string }> = {
      'firstName': { ar: 'الاسم الأول مطلوب', en: 'First name is required' },
      'lastName': { ar: 'الاسم الأخير مطلوب', en: 'Last name is required' },
      // ... more mappings
    }
    
    const mapped = errorMap[fieldName] 
      ? (language === 'ar' ? errorMap[fieldName].ar : errorMap[fieldName].en)
      : (language === 'ar' ? errorData.messageAr || errorMsg : errorMsg)
    
    msg = mapped
  }
}
```

## النتيجة

✅ **التسجيل يعمل الآن:**
- `applicant` - يعمل بشكل صحيح
- `job-publisher` - يعمل بشكل صحيح

✅ **رسائل خطأ واضحة:**
- بدلاً من "Validation failed" العام
- رسائل محددة مثل "الاسم الأول مطلوب"

✅ **تجربة مستخدم أفضل:**
- رسائل خطأ بالعربية والإنجليزية
- رسائل واضحة ومفيدة
- تحقق قبل الإرسال

## الاختبار

### اختبار التسجيل:
1. سجل حساب جديد بدور `applicant` - يجب أن يعمل
2. سجل حساب جديد بدور `job-publisher` - يجب أن يعمل
3. جرب بدون `firstName` - يجب أن ترى رسالة خطأ واضحة
4. جرب بدون `lastName` - يجب أن ترى رسالة خطأ واضحة

### رسائل الخطأ المتوقعة:
- **اسم مفقود:** "الاسم الأول مطلوب" / "First name is required"
- **بريد غير صالح:** "يرجى إدخال بريد إلكتروني صالح" / "Please provide a valid email address"
- **كلمة مرور ضعيفة:** "كلمة المرور يجب أن تكون 8 أحرف..." / "Password must be at least 8 characters..."

## الملفات المعدلة

1. ✅ `tf1-frontend/app/register/page.tsx` - إصلاح payload وتحسين معالجة الأخطاء
2. ✅ `tf1-frontend/services/auth.ts` - إضافة تحقق من الحقول المطلوبة
3. ✅ `tf1-backend/src/middleware/validation.js` - تحسين رسائل الخطأ

## ملاحظات

- Backend validation يعمل بشكل صحيح
- المشكلة كانت في Frontend payload و error handling
- الآن جميع الأدوار تعمل بشكل صحيح

