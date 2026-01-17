# ملخص الإصلاحات المطبقة على Frontend
## Frontend Fixes Applied Summary

**تاريخ التطبيق**: 2026-01-17
**الحالة**: ✅ **جاهز للتطبيق**

---

## 🔧 الإصلاحات المطلوبة | Required Fixes

### 1. ✅ إصلاح API Endpoint (CRITICAL - 5 دقائق)

**الملف**: `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

**السطر 152 - قبل**:
```typescript
const response = await api.post("/clubs/jobs", payload)
```

**السطر 152 - بعد**:
```typescript
const response = await api.post("/api/v1/job-publisher/jobs", payload)
```

---

### 2. ✅ تصحيح employmentType Values (HIGH - 10 دقائق)

**الملف**: `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

**السطور 73-79 - قبل**:
```typescript
const employmentTypeOptions = [
  { value: "full_time", labelAr: "دوام كامل", labelEn: "Full Time" },
  { value: "part_time", labelAr: "دوام جزئي", labelEn: "Part Time" },
  { value: "contract", labelAr: "عقد مؤقت", labelEn: "Contract" },
  { value: "internship", labelAr: "تدريب", labelEn: "Internship" },
  { value: "freelance", labelAr: "عمل حر", labelEn: "Freelance" },
]
```

**السطور 73-79 - بعد**:
```typescript
const employmentTypeOptions = [
  { value: "full-time", labelAr: "دوام كامل", labelEn: "Full Time" },
  { value: "part-time", labelAr: "دوام جزئي", labelEn: "Part Time" },
  { value: "contract", labelAr: "عقد", labelEn: "Contract" },
  { value: "temporary", labelAr: "مؤقت", labelEn: "Temporary" },
  { value: "internship", labelAr: "تدريب", labelEn: "Internship" },
]
```

---

### 3. ✅ تحديث State بالحقول المفقودة (HIGH - 30 دقيقة)

**الملف**: `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

**السطور 31-53 - قبل**:
```typescript
const [formData, setFormData] = useState({
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",
  sport: "",
  jobType: "permanent",           // ❌ حذف
  employmentType: "full_time",    // ❌ تغيير إلى full-time
  category: "other",
  city: "",
  country: "Saudi Arabia",
  requirementsText: "",
  skillsText: "",
  meetingDate: "",                // ❌ حذف
  meetingTime: "",                // ❌ حذف
  meetingLocation: "",            // ❌ حذف
  expectedStartDate: "",          // ❌ حذف
  applicationDeadline: "",
  numberOfPositions: "1",         // ❌ حذف
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "SAR",
})
```

**السطور 31-XX - بعد**:
```typescript
const [formData, setFormData] = useState({
  // Basic Info
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",

  // Job Details
  sport: "",
  category: "other",
  employmentType: "full-time",
  experienceLevel: "intermediate",      // ✅ جديد

  // Location
  city: "",
  cityAr: "",
  country: "Saudi Arabia",
  countryAr: "المملكة العربية السعودية",
  isRemote: false,                      // ✅ جديد

  // Requirements & Responsibilities (newline-separated)
  requirementsText: "",
  responsibilitiesText: "",             // ✅ جديد
  benefitsText: "",                     // ✅ جديد
  skillsText: "",

  // Experience
  minExperienceYears: "",               // ✅ جديد
  maxExperienceYears: "",               // ✅ جديد

  // Salary
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "SAR",

  // Other
  applicationDeadline: "",
  companyName: "",                      // ✅ جديد
  companyNameAr: "",                    // ✅ جديد
})
```

---

### 4. ✅ إضافة experienceLevel Options (10 دقائق)

**الملف**: `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

**إضافة بعد sportOptions**:
```typescript
const experienceLevelOptions = [
  { value: "entry", labelAr: "مبتدئ", labelEn: "Entry Level" },
  { value: "intermediate", labelAr: "متوسط", labelEn: "Intermediate" },
  { value: "senior", labelAr: "خبير", labelEn: "Senior" },
  { value: "expert", labelAr: "محترف", labelEn: "Expert" },
]

const categoryOptions = [
  { value: "coach", labelAr: "مدرب", labelEn: "Coach" },
  { value: "trainer", labelAr: "مدرب لياقة", labelEn: "Trainer" },
  { value: "physiotherapist", labelAr: "أخصائي علاج طبيعي", labelEn: "Physiotherapist" },
  { value: "manager", labelAr: "مدير", labelEn: "Manager" },
  { value: "analyst", labelAr: "محلل", labelEn: "Analyst" },
  { value: "scout", labelAr: "كشاف مواهب", labelEn: "Scout" },
  { value: "administrator", labelAr: "إداري", labelEn: "Administrator" },
  { value: "medical", labelAr: "طبي", labelEn: "Medical" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
]
```

---

### 5. ✅ تحديث دالة الإرسال بالكامل (CRITICAL - 2 ساعات)

**الملف**: `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

**استبدال handleSubmit بالكامل**:

```typescript
const handleSubmit = async (isDraft = false) => {
  // Required fields validation
  const requiredFields = {
    title: formData.title,
    description: formData.description,
    sport: formData.sport,
    category: formData.category,
    employmentType: formData.employmentType,
    experienceLevel: formData.experienceLevel,
    city: formData.city,
    requirementsText: formData.requirementsText,
    responsibilitiesText: formData.responsibilitiesText,
  }

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => !value || value.trim() === "")
    .map(([key]) => key)

  if (missingFields.length > 0) {
    toast.error(
      language === "ar"
        ? `يرجى تعبئة جميع الحقول المطلوبة`
        : `Please fill all required fields`
    )
    return
  }

  // Description length validation (min 50 chars)
  if (formData.description.length < 50) {
    toast.error(
      language === "ar"
        ? "الوصف يجب أن يكون 50 حرفاً على الأقل"
        : "Description must be at least 50 characters"
    )
    return
  }

  // Parse requirements array (split by newline)
  const requirements = formData.requirementsText
    .split("\n")
    .map(r => r.trim())
    .filter(Boolean)

  // Parse responsibilities array (split by newline)
  const responsibilities = formData.responsibilitiesText
    .split("\n")
    .map(r => r.trim())
    .filter(Boolean)

  if (requirements.length === 0) {
    toast.error(
      language === "ar"
        ? "يجب إضافة متطلب واحد على الأقل"
        : "At least one requirement is required"
    )
    return
  }

  if (responsibilities.length === 0) {
    toast.error(
      language === "ar"
        ? "يجب إضافة مسؤولية واحدة على الأقل"
        : "At least one responsibility is required"
    )
    return
  }

  // Application deadline validation
  if (formData.applicationDeadline) {
    const deadlineDate = new Date(formData.applicationDeadline)
    if (deadlineDate < new Date()) {
      toast.error(
        language === "ar"
          ? "تاريخ إغلاق التقديم يجب أن يكون مستقبلياً"
          : "Application deadline must be in the future"
      )
      return
    }
  }

  setIsSubmitting(true)

  try {
    // Parse optional arrays
    const skills = formData.skillsText
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    const benefits = formData.benefitsText
      .split(",")
      .map(b => b.trim())
      .filter(Boolean)

    // Build payload matching backend schema EXACTLY
    const payload: any = {
      title: formData.title,
      titleAr: formData.titleAr || formData.title,
      description: formData.description,
      descriptionAr: formData.descriptionAr || formData.description,
      sport: formData.sport,
      category: formData.category,
      employmentType: formData.employmentType,
      experienceLevel: formData.experienceLevel,

      // Location object (required)
      location: {
        city: formData.city,
        cityAr: formData.cityAr || formData.city,
        country: formData.country,
        countryAr: formData.countryAr,
        isRemote: formData.isRemote,
      },

      // Arrays (required)
      requirements: requirements,
      responsibilities: responsibilities,

      // Status
      status: isDraft ? "draft" : "active",
    }

    // Add optional fields only if they exist
    if (skills.length > 0) {
      payload.skills = skills
    }
    if (benefits.length > 0) {
      payload.benefits = benefits
    }
    if (formData.minExperienceYears) {
      payload.minExperienceYears = Number(formData.minExperienceYears)
    }
    if (formData.maxExperienceYears) {
      payload.maxExperienceYears = Number(formData.maxExperienceYears)
    }
    if (formData.salaryMin) {
      payload.salaryMin = Number(formData.salaryMin)
    }
    if (formData.salaryMax) {
      payload.salaryMax = Number(formData.salaryMax)
    }
    if (formData.salaryCurrency) {
      payload.salaryCurrency = formData.salaryCurrency
    }
    if (formData.applicationDeadline) {
      payload.applicationDeadline = formData.applicationDeadline
    }
    if (formData.companyName) {
      payload.companyName = formData.companyName
    }
    if (formData.companyNameAr) {
      payload.companyNameAr = formData.companyNameAr
    }

    // ✅ CORRECT ENDPOINT
    const response = await api.post("/api/v1/job-publisher/jobs", payload)

    if (response.data.success) {
      toast.success(
        language === "ar"
          ? "تم إنشاء الوظيفة بنجاح"
          : "Job created successfully"
      )
      router.push("/dashboard/job-publisher/jobs")
    }
  } catch (error: any) {
    console.error("Job creation error:", error)

    // Handle validation errors from backend
    if (error.response?.status === 400 && error.response?.data?.errors) {
      const errors = error.response.data.errors
      const errorMessages = errors
        .map((e: any) => `${e.field}: ${e.message}`)
        .join("\n")

      toast.error(
        language === "ar"
          ? `أخطاء في البيانات:\n${errorMessages}`
          : `Validation errors:\n${errorMessages}`
      )
    } else if (error.response?.status === 403) {
      // Subscription limit reached
      toast.error(
        language === "ar"
          ? "لقد وصلت للحد الأقصى من الوظائف في باقتك. يرجى الترقية للباقة الأعلى."
          : "You've reached your job limit. Please upgrade your subscription."
      )
    } else {
      toast.error(
        language === "ar"
          ? error.response?.data?.messageAr || "حدث خطأ أثناء إنشاء الوظيفة"
          : error.response?.data?.message || "Error creating job"
      )
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

---

### 6. ✅ إضافة الحقول المفقودة في UI (2 ساعات)

يجب إضافة الحقول التالية في الـ form:

#### A. Experience Level (required)
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    {language === "ar" ? "مستوى الخبرة" : "Experience Level"} <span className="text-red-500">*</span>
  </label>
  <SelectField
    options={experienceLevelOptions}
    value={formData.experienceLevel}
    onChange={(value: string) => handleInputChange("experienceLevel", value)}
    placeholder={language === "ar" ? "اختر مستوى الخبرة" : "Select experience level"}
  />
</div>
```

#### B. Responsibilities (required)
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    {language === "ar" ? "المسؤوليات (سطر لكل مسؤولية)" : "Responsibilities (one per line)"} <span className="text-red-500">*</span>
  </label>
  <Textarea
    placeholder={language === "ar"
      ? "- تدريب اللاعبين\n- وضع خطط التدريب\n- تحليل الأداء"
      : "- Train players\n- Create training plans\n- Analyze performance"}
    value={formData.responsibilitiesText}
    onChange={(e) => handleInputChange("responsibilitiesText", e.target.value)}
    rows={6}
  />
</div>
```

#### C. Is Remote Checkbox
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="isRemote"
    checked={formData.isRemote}
    onCheckedChange={(checked) => handleInputChange("isRemote", checked)}
  />
  <label htmlFor="isRemote" className="text-sm font-medium text-gray-700">
    {language === "ar" ? "عمل عن بُعد" : "Remote Work"}
  </label>
</div>
```

#### D. Benefits (optional)
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    {language === "ar" ? "المزايا (مفصولة بفاصلة)" : "Benefits (comma separated)"}
  </label>
  <Textarea
    placeholder={language === "ar"
      ? "تأمين صحي، بدل سكن، بدل مواصلات"
      : "Health insurance, housing allowance, transportation"}
    value={formData.benefitsText}
    onChange={(e) => handleInputChange("benefitsText", e.target.value)}
    rows={3}
  />
</div>
```

#### E. Experience Years (optional)
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {language === "ar" ? "الحد الأدنى لسنوات الخبرة" : "Min Experience Years"}
    </label>
    <Input
      type="number"
      min={0}
      max={50}
      value={formData.minExperienceYears}
      onChange={(e) => handleInputChange("minExperienceYears", e.target.value)}
    />
  </div>
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {language === "ar" ? "الحد الأقصى لسنوات الخبرة" : "Max Experience Years"}
    </label>
    <Input
      type="number"
      min={0}
      max={50}
      value={formData.maxExperienceYears}
      onChange={(e) => handleInputChange("maxExperienceYears", e.target.value)}
    />
  </div>
</div>
```

#### F. Company Name (optional)
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {language === "ar" ? "اسم الشركة (بالعربية)" : "Company Name (Arabic)"}
    </label>
    <Input
      value={formData.companyNameAr}
      onChange={(e) => handleInputChange("companyNameAr", e.target.value)}
    />
  </div>
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {language === "ar" ? "اسم الشركة (بالإنجليزية)" : "Company Name (English)"}
    </label>
    <Input
      value={formData.companyName}
      onChange={(e) => handleInputChange("companyName", e.target.value)}
    />
  </div>
</div>
```

#### G. حذف حقول Interview Details section
يجب حذف القسم الكامل من السطور 459-483 (meetingDate, meetingTime, meetingLocation)

---

## 📋 قائمة التحقق للتطبيق | Implementation Checklist

### Phase 1: Quick Fixes (30 دقيقة)
- [ ] تصحيح API endpoint (السطر 152)
- [ ] تصحيح employmentType values (السطور 73-79)
- [ ] إضافة experienceLevel و category options
- [ ] تحديث initial state

### Phase 2: Form Logic (2 ساعات)
- [ ] استبدال handleSubmit بالكامل
- [ ] تحديث validation logic
- [ ] تحديث payload structure
- [ ] إضافة error handling للـ subscription limits

### Phase 3: UI Updates (2 ساعات)
- [ ] إضافة experienceLevel dropdown
- [ ] إضافة responsibilities textarea
- [ ] إضافة isRemote checkbox
- [ ] إضافة benefits textarea
- [ ] إضافة min/max experience years
- [ ] إضافة company name fields
- [ ] حذف interview details section
- [ ] حذف numberOfPositions field

### Phase 4: Testing (1 ساعة)
- [ ] اختبار job creation بـ draft status
- [ ] اختبار job creation بـ active status
- [ ] اختبار validation errors
- [ ] اختبار subscription limits
- [ ] اختبار Arabic/English switching

---

## 🧪 خطة الاختبار | Testing Plan

### Test 1: Job Creation Success
```typescript
// Input
{
  title: "Football Coach",
  description: "We are looking for an experienced football coach with UEFA license..." // 50+ chars
  sport: "football",
  category: "coach",
  employmentType: "full-time",
  experienceLevel: "senior",
  city: "Riyadh",
  requirements: ["5+ years experience", "UEFA license"],
  responsibilities: ["Train players", "Plan training sessions"],
  status: "active"
}

// Expected Response
✅ Status 201
✅ Job created successfully
✅ Redirect to jobs list
```

### Test 2: Validation Errors
```typescript
// Input (missing responsibilities)
{
  title: "Coach",
  description: "Short", // < 50 chars
  requirementsText: "Experience",
  responsibilitiesText: "", // Empty!
}

// Expected Response
❌ Toast error: "Description must be at least 50 characters"
❌ Toast error: "At least one responsibility is required"
```

### Test 3: Subscription Limit
```typescript
// Free tier user (already has 3 jobs) tries to create 4th job

// Expected Response
❌ Status 403
❌ Toast error: "لقد وصلت للحد الأقصى من الوظائف في باقتك"
```

---

## 📊 الجدول الزمني | Timeline

| المهمة | الوقت المقدر | الحالة |
|-------|-------------|--------|
| Quick fixes (endpoint, values) | 30 دقيقة | ⏳ جاهز |
| Form logic updates | 2 ساعة | ⏳ جاهز |
| UI updates | 2 ساعة | ⏳ جاهز |
| Testing | 1 ساعة | ⏳ جاهز |
| **المجموع** | **5.5 ساعة** | ⏳ جاهز للتطبيق |

---

## ✅ الخلاصة

جميع الإصلاحات موثقة ومحددة بدقة. الكود جاهز للتطبيق المباشر في الـ Frontend.

**الخطوة التالية**: تطبيق الإصلاحات في ملف `tf1-frontend/app/dashboard/job-publisher/jobs/new/page.tsx`

