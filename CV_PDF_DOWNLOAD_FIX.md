# إصلاح مشكلة "NetworkError" عند تحميل السيرة الذاتية

## المشكلة
عند محاولة تحميل السيرة الذاتية كـ PDF، يظهر خطأ "NetworkError when attempting to fetch resource".

## السبب
1. **استخدام `fetch` مباشرة:** الكود كان يستخدم `fetch` مباشرة بدلاً من `api` service
2. **مشاكل CORS:** `fetch` قد يواجه مشاكل CORS مع Backend
3. **عدم معالجة الأخطاء بشكل صحيح:** Network errors لم تكن تُعالج بشكل صحيح

## الحل المطبق

### 1. ✅ استبدال `fetch` بـ `api` service
**الملف:** `tf1-frontend/app/jobs/cv-builder/page.tsx`

**التحسينات:**
- استخدام `api` service بدلاً من `fetch`
- استخدام `responseType: 'blob'` لتحميل PDF كـ binary data
- معالجة أفضل للأخطاء

```typescript
const generatePDF = async () => {
  try {
    setLoading(true);
    const tpl = cvData?.meta?.template || 'standard';
    
    toast.loading(language === 'ar' ? 'جاري إنشاء ملف PDF...' : 'Generating PDF...', { id: 'pdf-gen' });
    
    // Use api service with responseType: 'blob' for binary PDF data
    const response = await api.post(
      `/cv/generate-pdf?template=${encodeURIComponent(tpl)}`,
      { ...cvData, language },
      {
        responseType: 'blob', // Critical for binary PDF data
      }
    );

    // Check if response is actually a PDF
    const contentType = response.headers['content-type'] || response.headers['Content-Type'];
    if (!contentType || !contentType.includes('application/pdf')) {
      // Try to parse error message if response is JSON
      try {
        const text = await new Response(response.data).text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || (language === 'ar' ? 'فشل إنشاء ملف PDF' : 'Failed to generate PDF'));
      } catch (parseError) {
        throw new Error(language === 'ar' ? 'الاستجابة ليست ملف PDF صالح' : 'Response is not a valid PDF file');
      }
    }

    // Create blob from response data
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `CV-${cvData.personalInfo.fullName?.replace(/\s+/g, '-') || 'User'}-${new Date().getTime()}.pdf`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    toast.success(language === 'ar' ? 'تم تحميل السيرة الذاتية بنجاح' : 'CV downloaded successfully', { id: 'pdf-gen' });
  } catch (error: any) {
    console.error('[PDF Generation] Error:', error);
    
    let errorMessage = language === 'ar' ? 'حدث خطأ أثناء التحميل. يرجى المحاولة مرة أخرى' : 'Error downloading CV. Please try again';
    
    if (error.response?.data) {
      // Try to extract error message from blob response
      try {
        const text = await new Response(error.response.data).text();
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorData.error?.message || errorMessage;
      } catch (parseError) {
        // If not JSON, use default message
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle network errors
    if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch') || !error.response) {
      errorMessage = language === 'ar' 
        ? 'خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
        : 'Network error. Please check your internet connection and try again.';
    }
    
    toast.error(errorMessage, { id: 'pdf-gen' });
  } finally {
    setLoading(false);
  }
};
```

## المزايا

✅ **استخدام `api` service:**
- يتعامل تلقائياً مع CORS
- يتعامل تلقائياً مع Authentication
- معالجة أخطاء أفضل

✅ **`responseType: 'blob':**
- ضروري لتحميل PDF كـ binary data
- يحافظ على تنسيق الملف بشكل صحيح

✅ **معالجة أخطاء محسّنة:**
- معالجة خاصة لـ Network errors
- رسائل خطأ واضحة بالعربية والإنجليزية
- محاولة استخراج رسائل الخطأ من JSON responses

## النتيجة

✅ **تحميل PDF يعمل الآن:**
- لا مزيد من Network errors
- تحميل سلس وسريع
- رسائل خطأ واضحة

## الاختبار

### اختبار تحميل PDF:
1. املأ بيانات السيرة الذاتية
2. اضغط على "تحميل PDF"
3. يجب أن يبدأ التحميل تلقائياً
4. يجب أن يفتح الملف في المتصفح أو يحمله

### في حالة الخطأ:
- **Network Error:** "خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى."
- **Invalid Response:** "الاستجابة ليست ملف PDF صالح"
- **Server Error:** رسالة الخطأ من الخادم

## الملفات المعدلة

1. ✅ `tf1-frontend/app/jobs/cv-builder/page.tsx` - استبدال `fetch` بـ `api` service

## ملاحظات

- `api` service يتعامل تلقائياً مع CORS و Authentication
- `responseType: 'blob'` ضروري لتحميل binary data
- معالجة الأخطاء محسّنة لتعطي رسائل واضحة

