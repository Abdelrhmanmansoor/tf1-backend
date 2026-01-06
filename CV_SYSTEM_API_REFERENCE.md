# 📚 CV System API Reference

## Base URL
```
/api/v1/cv
```

---

## 🔐 Authentication

معظم الـ endpoints تتطلب authentication. استخدم:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

بعض الـ endpoints تدعم guest users (sessionId).

---

## 📋 Endpoints

### 1. Create or Update CV
```http
POST /api/v1/cv
Content-Type: application/json

{
  "personalInfo": {
    "fullName": "أحمد محمد",
    "jobTitle": "مطور برمجيات",
    "email": "ahmed@example.com",
    "phone": "+966501234567",
    "city": "الرياض",
    "country": "السعودية"
  },
  "summary": "ملخص احترافي...",
  "experience": [...],
  "education": [...],
  "skills": {
    "technical": ["JavaScript", "React"],
    "soft": ["Leadership"]
  },
  "language": "ar",
  "meta": {
    "template": "modern",
    "privacy": "private"
  }
}
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "CV created successfully",
  "messageAr": "تم إنشاء السيرة الذاتية بنجاح",
  "data": {
    "cv": {...}
  }
}
```

---

### 2. Get CV
```http
GET /api/v1/cv/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cv": {...},
    "stats": {
      "completionPercentage": 85,
      "isComplete": true,
      "sectionsCount": {
        "experience": 3,
        "education": 2,
        "skills": 15
      }
    }
  }
}
```

---

### 3. List All CVs (Authenticated)
```http
GET /api/v1/cv?page=1&limit=10&template=modern&privacy=private
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `template` - Filter by template
- `privacy` - Filter by privacy (public, private, shared)

---

### 4. Delete CV
```http
DELETE /api/v1/cv/:id
Authorization: Bearer YOUR_TOKEN
```

---

### 5. Duplicate CV
```http
POST /api/v1/cv/:id/duplicate
Authorization: Bearer YOUR_TOKEN (optional)
```

---

### 6. Generate PDF
```http
GET /api/v1/cv/:id/pdf?template=modern&format=A4
```

**Query Parameters:**
- `template` - Template name (standard, modern, classic, creative, minimal, executive)
- `format` - PDF format (A4, Letter, etc.)

**Or from data:**
```http
POST /api/v1/cv/generate-pdf
Content-Type: application/json

{
  "cvData": {...},
  "template": "modern",
  "format": "A4"
}
```

---

### 7. Upload CV File
```http
POST /api/v1/cv/upload
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN (optional)

Form Data:
- cvFile: [PDF/DOC/DOCX file]
- cvId: "optional-cv-id"
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "url": "/uploads/cv/cv_123.pdf",
      "originalName": "MyCV.pdf",
      "size": 245678,
      "mimeType": "application/pdf"
    }
  }
}
```

---

### 8. Download CV File
```http
GET /api/v1/cv/:cvId/download
Authorization: Bearer YOUR_TOKEN
```

---

### 9. AI Generate
```http
POST /api/v1/cv/ai/generate
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN (optional)

{
  "type": "summary",
  "data": {...},
  "language": "ar"
}
```

**Types:**
- `summary` - Generate professional summary
- `description` - Improve job description
- `skills` - Suggest skills for job title
- `coverLetter` - Generate cover letter
- `optimizeATS` - Optimize CV for ATS

---

### 10. Get AI Status
```http
GET /api/v1/cv/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "hasApiKey": true,
    "enableFallback": true,
    "validation": {
      "valid": true,
      "message": "API key is valid"
    }
  }
}
```

---

### 11. Get CV Statistics
```http
GET /api/v1/cv/stats/summary
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "complete": 3,
    "incomplete": 2
  }
}
```

---

## 🔒 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "status": "error",
  "message": "Validation error",
  "messageAr": "خطأ في التحقق",
  "errors": [...]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "status": "error",
  "message": "Authentication required",
  "messageAr": "يجب تسجيل الدخول"
}
```

### 404 Not Found
```json
{
  "success": false,
  "status": "error",
  "message": "CV not found",
  "messageAr": "السيرة الذاتية غير موجودة"
}
```

### 429 Rate Limit
```json
{
  "success": false,
  "status": "error",
  "message": "Too many requests",
  "messageAr": "تم تجاوز عدد الطلبات المسموحة",
  "retryAfter": 900
}
```

---

## 📝 Examples

### Complete CV Creation Example
```javascript
const cvData = {
  personalInfo: {
    fullName: "أحمد محمد علي",
    jobTitle: "Senior Software Developer",
    email: "ahmed@example.com",
    phone: "+966501234567",
    city: "الرياض",
    country: "السعودية",
    linkedin: "https://linkedin.com/in/ahmed",
    github: "https://github.com/ahmed"
  },
  summary: "مطور برمجيات بخبرة 5 سنوات...",
  experience: [
    {
      title: "Senior Developer",
      company: "Tech Company",
      location: "الرياض",
      startDate: "2020-01-01",
      isCurrent: true,
      descriptionBullets: [
        "Developed web applications using React and Node.js",
        "Led team of 5 developers"
      ],
      achievements: [
        "Increased application performance by 50%"
      ],
      skills: ["React", "Node.js", "MongoDB"]
    }
  ],
  education: [
    {
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      institution: "King Saud University",
      graduationDate: "2018-06-01",
      gpa: "3.8"
    }
  ],
  skills: {
    technical: ["JavaScript", "React", "Node.js", "MongoDB"],
    soft: ["Leadership", "Communication", "Problem Solving"]
  },
  languages: [
    {
      language: "Arabic",
      proficiency: "Native"
    },
    {
      language: "English",
      proficiency: "Fluent"
    }
  ],
  projects: [
    {
      name: "E-commerce Platform",
      description: "Full-stack e-commerce platform",
      technologies: ["React", "Node.js", "MongoDB"],
      url: "https://example.com"
    }
  ],
  language: "ar",
  meta: {
    template: "modern",
    privacy: "private"
  }
};

// Create CV
fetch('/api/v1/cv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(cvData)
});
```

---

## 🎯 Best Practices

1. **Always validate data** before sending
2. **Use appropriate template** for your industry
3. **Keep CV updated** regularly
4. **Use AI features** to improve content
5. **Set privacy** appropriately
6. **Generate PDF** before applying to jobs
7. **Backup your CV** regularly

---

## 📞 Support

للمساعدة والدعم، راجع:
- `CV_SYSTEM_COMPREHENSIVE_GUIDE.md` - دليل شامل
- `CV_SYSTEM_FIXES_SUMMARY.md` - ملخص الإصلاحات
- `logs/error.log` - سجل الأخطاء

