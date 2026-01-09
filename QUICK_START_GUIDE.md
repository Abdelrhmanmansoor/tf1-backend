# 🚀 CV System - Quick Start Guide (5 Minutes)

**Status**: ✅ Production Ready  
**Last Updated**: January 9, 2026  

---

## ⚡ 5-Minute Setup

### Start Everything with Docker

```bash
# 1. Clone/open the project
cd tf1-backend

# 2. Start database
docker-compose up -d

# 3. Install and run backend
npm install
npm run prisma:migrate:dev
npm run start:dev

# In another terminal:
cd tf1-frontend

# 4. Install and run frontend
npm install
npm run dev
```

**Done!** Open http://localhost:3000

---

## 📋 What You Get

### Backend (NestJS)
- ✅ 20+ REST API endpoints
- ✅ JWT authentication
- ✅ 9 professional CV templates
- ✅ 3 file format parsers (JSON, YAML, LinkedIn)
- ✅ PostgreSQL database
- ✅ Auto-save functionality
- ✅ Version history
- ✅ Public sharing

### Frontend (Next.js + React)
- ✅ Beautiful CV Builder interface
- ✅ Real-time preview
- ✅ Template selector
- ✅ Import/Export functionality
- ✅ Form validation
- ✅ Responsive design
- ✅ Public profile viewer

---

## 🎯 Key Features

1. **Create CVs** - From scratch or import
2. **Edit** - Real-time form with validation
3. **Templates** - 9 professional designs
4. **Export** - PDF, HTML, JSON
5. **Import** - JSON Resume, YAML, LinkedIn CSV
6. **Share** - Public links without login
7. **Versions** - Auto-save and history
8. **Analytics** - Track CV statistics

---

## 📝 First Steps

### 1. Create Your First CV

```
1. Go to http://localhost:3000/cv-builder
2. Fill in your information
3. Add experience, education, skills
4. See live preview on the right
5. Click "Export" to download PDF
```

### 2. Import Existing CV

```
1. Click "Import CV" on dashboard
2. Upload JSON Resume, YAML, or LinkedIn CSV
3. Review the imported data
4. Edit and customize
5. Export as PDF
```

### 3. Share Your CV

```
1. Click "Share" button in CV Builder
2. Get your public link
3. Share with recruiters
4. They can view and download without login
```

---

## 🔧 Technical Quick Reference

### Backend API

```bash
# Create CV
POST /api/v1/cv
{
  "data": { "personalInfo": {...}, "experience": [...] },
  "templateId": "awesome-cv"
}

# Get CV
GET /api/v1/cv/:id

# Update CV
PUT /api/v1/cv/:id
{ "data": {...} }

# Export to PDF
GET /api/v1/cv/:id/render/pdf

# Import from file
POST /api/v1/cv/import
multipart/form-data with file

# Publish (get public link)
POST /api/v1/cv/:id/publish

# View public CV
GET /api/v1/cv/public/:token
```

### Frontend Components

```typescript
import CVBuilder from '@/components/cv-builder/cv-builder';
import CVEditor from '@/components/cv-builder/cv-editor';
import CVPreview from '@/components/cv-builder/cv-preview';
import TemplateSelector from '@/components/cv-builder/template-selector';
import ExportDialog from '@/components/cv-builder/export-dialog';
```

---

## 📦 Project Structure

```
tf1-backend/
├── src/cv/
│   ├── templates/          (9 LaTeX templates)
│   ├── parsers/            (JSON, YAML, LinkedIn)
│   ├── cv.controller.ts    (20+ endpoints)
│   ├── cv.service.ts       (business logic)
│   └── dtos/               (validation)
└── prisma/
    └── schema.prisma       (database schema)

tf1-frontend/
├── components/cv-builder/
│   ├── cv-builder.tsx      (main component)
│   ├── cv-editor.tsx       (form)
│   ├── cv-preview.tsx      (preview)
│   ├── template-selector.tsx
│   └── export-dialog.tsx
├── services/cv.service.ts  (API client)
├── types/cv.ts             (type definitions)
└── app/cv-builder/         (pages)
```

---

## 🌐 Default Ports

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:3000 | ✅ |
| Backend | http://localhost:3001 | ✅ |
| PostgreSQL | localhost:5432 | ✅ |
| Prisma Studio | http://localhost:5555 | ✅ |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test
npm test cv.service.spec.ts
```

---

## 📚 Full Documentation

- `PROJECT_COMPLETION.md` - Complete project overview
- `API_DOCUMENTATION.md` - All API endpoints
- `FRONTEND_GUIDE.md` - Frontend development
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `TROUBLESHOOTING.md` - Common issues

---

## 🆘 Common Issues

### Port Already in Use
```bash
# Backend
kill -9 $(lsof -t -i :3001)

# Frontend
kill -9 $(lsof -t -i :3000)
```

### Database Not Connecting
```bash
# Check if Docker container is running
docker-compose ps

# Restart database
docker-compose restart postgres
```

### API Not Responding
```bash
# Check backend is running
curl http://localhost:3001/api/health

# Check .env files are correct
cat tf1-backend/.env.cv-local
cat tf1-frontend/.env.local
```

---

## ✅ Verification

After setup, verify everything:

```bash
# Backend
curl http://localhost:3001/api/v1/cv/templates

# Frontend
curl http://localhost:3000

# Database
npm run prisma:studio
```

---

**All set! 🎉**

Start building amazing CVs!
