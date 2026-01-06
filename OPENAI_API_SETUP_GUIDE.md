# دليل إعداد OpenAI API للسيرة الذاتية
# OpenAI API Setup Guide for CV Builder

## المشكلة | Problem
API الخاص بـ ChatGPT المدفوع لا يعمل في صفحة السيرة الذاتية.

## الحل | Solution

### 1. إضافة API Key في Environment Variables

الكود يبحث عن أحد المتغيرات التالية:
- `AI_API_KEY` (الأولوية)
- `OPENAI_API_KEY` (بديل)

#### في Render.com أو أي منصة deployment:

1. اذهب إلى **Environment** أو **Environment Variables**
2. أضف المتغير التالي:

```
AI_API_KEY=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
```

**⚠️ مهم جداً**: تأكد من:
- عدم وجود مسافات قبل أو بعد الـ key
- عدم وجود علامات اقتباس حول الـ key
- حفظ التغييرات وإعادة تشغيل الخادم

#### في ملف `.env` المحلي:

```env
AI_API_KEY=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
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_MAX_TOKENS=500
AI_ENABLE_FALLBACK=true
```

### 2. متغيرات Environment الإضافية (اختيارية)

```env
# Provider: 'openai' أو 'gemini'
AI_PROVIDER=openai

# Model: 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo', إلخ
AI_MODEL=gpt-4o-mini

# Timeout بالمللي ثانية (افتراضي: 30000 = 30 ثانية)
AI_TIMEOUT_MS=30000

# عدد المحاولات عند الفشل (افتراضي: 2)
AI_MAX_RETRIES=2

# الحد الأقصى للـ tokens (افتراضي: 500)
AI_MAX_TOKENS=500

# تفعيل الاستجابة البديلة عند الفشل (افتراضي: true)
AI_ENABLE_FALLBACK=true
```

### 3. التحقق من الإعداد

بعد إضافة الـ API key، يمكنك التحقق من أن كل شيء يعمل:

#### Endpoint للتحقق:
```
GET /api/v1/cv/ai/status
```

**Response المتوقع:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "hasApiKey": true,
    "enableFallback": true,
    "timeout": 30000,
    "maxRetries": 2,
    "configured": true,
    "validation": {
      "valid": true,
      "message": "API key is valid",
      "messageAr": "مفتاح API صحيح"
    }
  }
}
```

### 4. اختبار API

يمكنك اختبار API مباشرة:

```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### 5. استكشاف الأخطاء | Troubleshooting

#### المشكلة: "API key not configured"
**الحل**: تأكد من إضافة `AI_API_KEY` في environment variables وإعادة تشغيل الخادم.

#### المشكلة: "Invalid API key"
**الحل**: 
- تحقق من أن الـ API key صحيح
- تأكد من عدم وجود مسافات إضافية
- تحقق من أن الـ API key نشط في OpenAI dashboard

#### المشكلة: "Rate limit exceeded"
**الحل**: 
- انتظر قليلاً قبل المحاولة مرة أخرى
- تحقق من حدود الاستخدام في OpenAI dashboard
- يمكنك زيادة `AI_MAX_RETRIES` للسماح بمحاولات أكثر

#### المشكلة: "Timeout"
**الحل**: 
- زيادة `AI_TIMEOUT_MS` إلى قيمة أكبر (مثلاً 60000)
- تحقق من سرعة الاتصال بالإنترنت

### 6. الميزات المدعومة

بعد إعداد API بشكل صحيح، ستكون الميزات التالية متاحة:

1. **توليد الملخص المهني** (`summary`)
2. **تحسين أوصاف الوظائف** (`description`)
3. **اقتراح المهارات** (`skills`)
4. **توليد خطاب التقديم** (`coverLetter`)
5. **تحسين السيرة الذاتية لـ ATS** (`optimizeATS`)

### 7. الأمان | Security

⚠️ **مهم جداً**:
- لا تضع API key في الكود مباشرة
- استخدم environment variables دائماً
- لا تشارك API key مع أي شخص
- راجع استخدام API في OpenAI dashboard بانتظام
- ضع حدود للاستخدام لتجنب التكاليف غير المتوقعة

### 8. التكلفة | Cost

- `gpt-4o-mini`: أرخص خيار (موصى به)
- `gpt-3.5-turbo`: خيار اقتصادي
- `gpt-4`: أغلى لكن أقوى

يمكنك مراقبة الاستخدام والتكلفة في: https://platform.openai.com/usage

---

## ملاحظات إضافية | Additional Notes

- الكود يدعم **fallback responses** عند فشل API
- الكود يدعم **retry logic** مع exponential backoff
- الكود يسجل جميع طلبات AI للتحليل
- الكود يدعم **timeout handling** لتجنب الانتظار الطويل

---

تم إصلاح المشكلة! ✅
Issue fixed! ✅

