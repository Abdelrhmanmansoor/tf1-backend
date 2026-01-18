# 400 Validation Error Debugging Checklist

## 🔍 Complete Checklist for Job Creation Validation

### ✅ 1. Required Fields Check

#### Frontend Must Send:
- [ ] `title` (string, min 3 chars)
- [ ] `description` (string, min 50 chars)
- [ ] `sport` (enum value)
- [ ] `category` (enum value)
- [ ] `jobType` (enum: permanent/seasonal/temporary/trial/internship/volunteer)
- [ ] `employmentType` (enum: full_time/part_time/contract/freelance)
- [ ] `city` (string)

#### Common Mistakes:
- ❌ Sending empty strings `""`
- ❌ Sending `null` or `undefined`
- ❌ Not trimming whitespace
- ❌ Missing required fields entirely

---

### ✅ 2. Data Types Validation

| Field | Expected Type | Common Mistake |
|-------|---------------|----------------|
| `title` | `string` | Sending as number |
| `description` | `string` | Too short (< 50 chars) |
| `jobType` | `string` (enum) | Wrong enum value |
| `employmentType` | `string` (enum) | Using `full-time` instead of `full_time` |
| `salaryMin` | `number` | Sending as string `"5000"` |
| `salaryMax` | `number` | Sending as string |
| `applicationDeadline` | `ISO 8601 string` | Sending Date object or invalid format |
| `responsibilities` | `Array<{responsibility, responsibilityAr}>` | Sending `string[]` |
| `benefits` | `Array<{benefit, benefitAr}>` | Sending `string[]` |
| `requirements` | `object` | Sending `string[]` |

---

### ✅ 3. Enum Values Check

#### jobType (MUST match exactly):
```javascript
// ✅ Correct
'permanent', 'seasonal', 'temporary', 'trial', 'internship', 'volunteer'

// ❌ Wrong
'full-time', 'Permanent', 'PERMANENT'
```

#### employmentType (MUST use underscore):
```javascript
// ✅ Correct
'full_time', 'part_time', 'contract', 'freelance'

// ❌ Wrong
'full-time', 'part-time', 'Full Time', 'fulltime'
```

#### sport:
```javascript
// ✅ Correct
'football', 'basketball', 'volleyball', 'handball', 'tennis', 'swimming', 'athletics', 'other'
```

#### category:
```javascript
// ✅ Correct
'coach', 'trainer', 'physiotherapist', 'manager', 'analyst', 'scout', 'administrator', 'medical', 'other'
```

---

### ✅ 4. Array/Object Structure

#### responsibilities (MUST be array of objects):
```javascript
// ✅ Correct
[
  { responsibility: "Train players", responsibilityAr: "تدريب اللاعبين" },
  { responsibility: "Plan strategies", responsibilityAr: "تخطيط الاستراتيجيات" }
]

// ❌ Wrong
["Train players", "Plan strategies"]  // Array of strings
"Train players, Plan strategies"       // Single string
```

#### benefits (MUST be array of objects):
```javascript
// ✅ Correct
[
  { benefit: "Health insurance", benefitAr: "تأمين صحي" },
  { benefit: "Free meals", benefitAr: "وجبات مجانية" }
]

// ❌ Wrong
["Health insurance", "Free meals"]  // Array of strings
```

#### requirements (MUST be object):
```javascript
// ✅ Correct
{
  description: "Must have experience",
  minimumExperience: 3,
  skills: ["coaching", "leadership"]
}

// ❌ Wrong
["Experience required", "Leadership skills"]  // Array
"Must have 3 years experience"                // String
```

---

### ✅ 5. Nested Objects

#### requirements.ageRange:
```javascript
// ✅ Correct
requirements: {
  ageRange: {
    min: 25,
    max: 45
  }
}

// ❌ Wrong
requirements: {
  ageRange: "25-45"  // String instead of object
}
```

---

### ✅ 6. Date Formats

#### applicationDeadline (MUST be ISO 8601):
```javascript
// ✅ Correct
"2026-02-15T00:00:00.000Z"
new Date("2026-02-15").toISOString()

// ❌ Wrong
"2026-02-15"           // Not ISO format
"15/02/2026"           // Wrong format
new Date()             // Date object (not serialized)
1737763200000          // Timestamp number
```

---

### ✅ 7. Number vs String

#### salary fields:
```javascript
// ✅ Correct
{
  salaryMin: 5000,      // Number
  salaryMax: 10000      // Number
}

// ❌ Wrong
{
  salaryMin: "5000",    // String
  salaryMax: "10,000"   // String with comma
}
```

#### minimumExperience:
```javascript
// ✅ Correct
requirements: {
  minimumExperience: 3  // Number
}

// ❌ Wrong
requirements: {
  minimumExperience: "3 years"  // String
}
```

---

### ✅ 8. Key Names (Case Sensitive!)

```javascript
// ✅ Correct keys
jobType, employmentType, titleAr, descriptionAr, responsibilityAr, benefitAr

// ❌ Wrong keys
JobType, job_type, employment_type, title_ar, descriptionArabic
```

---

### ✅ 9. Optional vs Required

#### Always Required:
- title, description, sport, category, jobType, employmentType, city

#### Optional (can be omitted):
- titleAr, descriptionAr, country, requirements, responsibilities, benefits
- salaryMin, salaryMax, applicationDeadline

#### Omit vs Empty:
```javascript
// ✅ Correct (omit if empty)
{
  title: "Coach",
  // Don't include benefits if none
}

// ❌ Wrong (sending empty values)
{
  title: "Coach",
  benefits: [],          // Empty array
  requirements: {},      // Empty object
  titleAr: ""           // Empty string
}
```

---

### ✅ 10. Special Characters & Encoding

```javascript
// ✅ Correct
{
  title: "كرة القدم",                    // Arabic text OK
  description: "Special chars: @#$%"   // Special chars OK (will be sanitized)
}

// ❌ Wrong
{
  title: "Test\x00",      // Null bytes
  description: "<script>" // HTML/XSS attempts (will be blocked by sanitizer)
}
```

---

## 🐛 Debugging Steps

### Step 1: Check Frontend Payload
```javascript
// Before sending
console.log("📤 Payload being sent:", JSON.stringify(payload, null, 2))
```

### Step 2: Check Backend Logs
```bash
# Look for request ID in logs
grep "REQUEST_ID" backend.log
```

### Step 3: Check Validation Errors
```javascript
// Backend response will include:
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "employmentType",
      "message": "\"employmentType\" must be one of [full_time, part_time, contract, freelance]",
      "type": "any.only",
      "value": "full-time"  // ❌ This is the wrong value
    }
  ],
  "requestId": "abc-123-def"
}
```

---

## 🔧 Quick Fixes

### Fix 1: employmentType hyphen → underscore
```javascript
// ❌ Wrong
employmentType: "full-time"

// ✅ Correct
employmentType: "full_time"
```

### Fix 2: responsibilities string[] → object[]
```javascript
// ❌ Wrong
responsibilities: ["Train players", "Plan strategies"]

// ✅ Correct
responsibilities: [
  { responsibility: "Train players", responsibilityAr: "Train players" },
  { responsibility: "Plan strategies", responsibilityAr: "Plan strategies" }
]
```

### Fix 3: requirements array → object
```javascript
// ❌ Wrong
requirements: ["Experience", "Skills"]

// ✅ Correct
requirements: {
  description: "Experience, Skills",
  skills: ["coaching", "leadership"]
}
```

### Fix 4: Date to ISO string
```javascript
// ❌ Wrong
applicationDeadline: new Date("2026-02-15")

// ✅ Correct
applicationDeadline: new Date("2026-02-15").toISOString()
```

### Fix 5: Numbers not strings
```javascript
// ❌ Wrong
salaryMin: "5000"

// ✅ Correct
salaryMin: Number("5000")  // or parseInt("5000")
```

---

## 📋 Pre-Flight Validation (Client-Side)

```javascript
function validateBeforeSending(payload) {
  const errors = []

  // Required fields
  if (!payload.title || payload.title.length < 3) {
    errors.push("Title must be at least 3 characters")
  }

  if (!payload.description || payload.description.length < 50) {
    errors.push("Description must be at least 50 characters")
  }

  // Enum values
  const validJobTypes = ['permanent', 'seasonal', 'temporary', 'trial', 'internship', 'volunteer']
  if (!validJobTypes.includes(payload.jobType)) {
    errors.push(`Invalid jobType: ${payload.jobType}`)
  }

  const validEmploymentTypes = ['full_time', 'part_time', 'contract', 'freelance']
  if (!validEmploymentTypes.includes(payload.employmentType)) {
    errors.push(`Invalid employmentType: ${payload.employmentType}`)
  }

  // Array structures
  if (payload.responsibilities && !Array.isArray(payload.responsibilities)) {
    errors.push("responsibilities must be an array")
  }

  if (payload.responsibilities) {
    payload.responsibilities.forEach((item, index) => {
      if (!item.responsibility) {
        errors.push(`responsibilities[${index}] missing 'responsibility' field`)
      }
    })
  }

  return errors
}
```

---

## 🎯 Backend Validation Response Format

```json
{
  "success": false,
  "message": "Validation error",
  "messageAr": "خطأ في التحقق من البيانات",
  "errors": [
    {
      "field": "employmentType",
      "message": "\"employmentType\" must be one of [full_time, part_time, contract, freelance]",
      "type": "any.only",
      "value": "full-time",
      "label": "employmentType"
    }
  ],
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "debug": {
    "receivedData": { ... },
    "expectedSchema": { ... }
  }
}
```

---

## 📞 Support

If validation still fails after checking all above:

1. Check backend logs with requestId
2. Compare payload with Joi schema in `src/validators/jobPublisherValidation.js`
3. Compare payload with Mongoose schema in `src/modules/club/models/Job.js`
4. Use DTO transformation in frontend (`lib/dto/JobDTO.ts`)
