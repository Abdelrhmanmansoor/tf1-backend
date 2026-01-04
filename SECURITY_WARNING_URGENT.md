# ⚠️ تحذير أمني مهم - يجب اتخاذ إجراء فوري!

## 🚨 مفتاح OpenAI API مكشوف في الكود

تم اكتشاف أن مفتاح OpenAI API الموجود في ملف `.env` قد تم رفعه إلى Git وهو مكشوف للعامة.

### المفتاح المكشوف:
```
AI_API_KEY=sk-proj-BK2_BhdHK_K_4R4SLqDcdTrz-Wx9L6jMD9kJXbIY-...
```

---

## 📋 الإجراءات المطلوبة فوراً

### 1. إلغاء المفتاح القديم

**الخطوات:**
1. زيارة: https://platform.openai.com/api-keys
2. تسجيل الدخول لحسابك
3. البحث عن المفتاح المبدوء بـ `sk-proj-BK2_...`
4. النقر على **"Revoke"** أو **"Delete"**

### 2. توليد مفتاح جديد

**الخطوات:**
1. في نفس الصفحة، اضغط **"Create new secret key"**
2. اختر اسم مميز (مثل: `SportsPlatform-Production`)
3. اختر الصلاحيات المطلوبة
4. انسخ المفتاح الجديد **فوراً** (لن تراه مرة أخرى!)

### 3. تحديث ملف `.env`

**افتح ملف `.env` وحدّث:**
```bash
AI_API_KEY=sk-proj-YOUR-NEW-KEY-HERE
```

**⚠️ لا تحفظ التغييرات في Git!**

### 4. إزالة المفتاح من Git History

إذا كان الملف `.env` تم رفعه سابقاً:

```bash
# الطريقة السريعة (خطرة - تفقد التاريخ)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# ثم force push
git push origin --force --all
```

**أو استخدم BFG Repo Cleaner (أفضل):**
```bash
# تثبيت BFG
# Windows: choco install bfg
# Mac: brew install bfg

# تنظيف الملف
bfg --delete-files .env

# تنظيف السجل
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push
git push origin --force --all
```

### 5. التحقق من `.gitignore`

تأكد من وجود `.env` في `.gitignore`:

```bash
# في ملف .gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## 🔐 إجراءات أمنية إضافية

### 1. مراجعة استخدام الـ API

**تحقق من:**
- عدد الطلبات في آخر 24 ساعة
- أي استخدام غير معتاد
- الإنفاق غير المتوقع

**زيارة:** https://platform.openai.com/usage

### 2. تفعيل تنبيهات الفوترة

**الخطوات:**
1. Settings → Billing
2. Set usage limits
3. Enable email notifications

**مثال:**
- Hard limit: $50/month
- Soft limit notification: $30/month

### 3. استخدام Secrets Management

**للإنتاج، استخدم:**

**على Heroku:**
```bash
heroku config:set AI_API_KEY=sk-proj-YOUR-KEY
```

**على Vercel:**
```bash
vercel env add AI_API_KEY
```

**على Render:**
- Dashboard → Environment → Environment Variables
- أضف `AI_API_KEY`

**على AWS/Azure:**
- استخدم AWS Secrets Manager
- أو Azure Key Vault

---

## ✅ Checklist التحقق

- [ ] تم إلغاء المفتاح القديم من OpenAI
- [ ] تم توليد مفتاح جديد
- [ ] تم تحديث `.env` بالمفتاح الجديد
- [ ] تم اختبار النظام والتأكد من عمل AI
- [ ] `.env` موجود في `.gitignore`
- [ ] تم حذف `.env` من Git history
- [ ] تم تفعيل usage alerts في OpenAI
- [ ] تم تحديد حدود الإنفاق

---

## 🧪 اختبار المفتاح الجديد

بعد التحديث، اختبر:

```bash
# اختبار AI Service
curl -X POST http://localhost:4000/api/v1/cv/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "type": "skills",
    "data": "Software Engineer",
    "language": "ar"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "status": "success",
  "data": {
    "result": "البرمجة، التطوير، التحليل، ..."
  }
}
```

**إذا فشل:**
- راجع `logs/error.log`
- تأكد من نسخ المفتاح بالكامل
- تحقق من وجود مسافات زائدة

---

## 📚 موارد إضافية

- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [Environment Variables Security](https://12factor.net/config)
- [Git Secrets Management](https://git-secret.io/)

---

## ⏰ الإطار الزمني

**عاجل - خلال الساعة القادمة:**
- ✅ إلغاء المفتاح القديم
- ✅ توليد مفتاح جديد
- ✅ تحديث `.env`
- ✅ اختبار النظام

**خلال 24 ساعة:**
- 🔄 تنظيف Git history
- 🔄 إعداد usage alerts
- 🔄 مراجعة استخدام API

**خلال أسبوع:**
- 📊 مراجعة security audit
- 🔐 تطبيق secrets management في production
- 📝 توثيق الإجراءات الأمنية

---

**⚠️ هذا الأمر حساس للغاية - يرجى التعامل معه بجدية!**

في حالة أي استفسار أو مساعدة، لا تتردد في السؤال.
