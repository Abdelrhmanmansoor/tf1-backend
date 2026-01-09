# 🎨 Phase 5: Frontend - CV Builder System

**Status**: 📋 PLANNED  
**Timeline**: 3-5 days  
**Technology**: React/Next.js  

---

## 📌 Overview

The Frontend (Phase 5) will be the **CV Builder** - an interactive web interface for creating, editing, and exporting CVs. It will use the APIs created in Phase 4 to manage all CV operations.

---

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PHASE 5: FRONTEND                    │
│                   CV Builder Interface                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │          CV Builder Components                     │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │   Editor     │  │   Preview    │              │ │
│  │  │              │  │              │              │ │
│  │  │ • Form      │  │ • Live PDF   │              │ │
│  │  │ • Sections  │  │ • Template   │              │ │
│  │  │ • Auto-save │  │ • Sync       │              │ │
│  │  └──────────────┘  └──────────────┘              │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │   Templates  │  │   Sharing    │              │ │
│  │  │              │  │              │              │ │
│  │  │ • Selector   │  │ • Publish    │              │ │
│  │  │ • Preview    │  │ • Share link │              │ │
│  │  │ • Switch     │  │ • Download   │              │ │
│  │  └──────────────┘  └──────────────┘              │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                            ↓                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │      REST API Client (Hooks/Services)           │   │
│  │  • API calls                                    │   │
│  │  • File upload                                  │   │
│  │  • Error handling                               │   │
│  └─────────────────────────────────────────────────┘   │
│                            ↓                             │
├─────────────────────────────────────────────────────────┤
│              PHASE 4: BACKEND APIS ✅                   │
│                                                         │
│  • CVController (20+ endpoints)                        │
│  • CVService (business logic)                          │
│  • Templates (9 professional templates)                │
│  • Parsers (3 file format parsers)                     │
│  • Database (PostgreSQL with 15 tables)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Frontend Architecture

### Component Structure

```
App (Main)
│
├── Layout
│   ├── Navbar
│   ├── Sidebar
│   └── Footer
│
├── Pages
│   ├── Dashboard
│   │   └── CVList
│   │
│   ├── CVBuilder
│   │   ├── Editor
│   │   │   ├── FormSections
│   │   │   ├── SectionEditor
│   │   │   └── AutoSave
│   │   │
│   │   ├── Preview
│   │   │   ├── PDFPreview
│   │   │   └── TemplateSelector
│   │   │
│   │   └── Export
│   │       ├── ExportDialog
│   │       └── DownloadButton
│   │
│   ├── Templates
│   │   ├── TemplateGrid
│   │   └── TemplatePreview
│   │
│   ├── Import
│   │   ├── FileUpload
│   │   ├── FormatSelector
│   │   └── ImportPreview
│   │
│   ├── PublicProfile
│   │   └── PublicCVViewer
│   │
│   └── Settings
│       └── UserPreferences
│
├── Hooks (Custom)
│   ├── useCV
│   ├── useCVList
│   ├── useFileUpload
│   ├── useAutoSave
│   └── useTemplates
│
├── Services
│   ├── api.service.ts
│   ├── cv.service.ts
│   ├── export.service.ts
│   └── import.service.ts
│
└── Stores (State Management)
    ├── cvStore
    ├── uiStore
    └── notificationStore
```

---

## 📱 Key Components

### 1. **CV Builder**
The main editor where users create/edit CVs
```typescript
<CVBuilder cvId={cvId} />

Features:
- Form sections for each CV section
- Real-time preview
- Template switching
- Auto-save functionality
- Undo/Redo support
```

### 2. **Editor Component**
Form-based CV data editor
```typescript
<CVEditor cv={cv} onChange={handleChange} />

Sections:
- Personal Information
- Work Experience
- Education
- Skills
- Projects
- Certifications
- Languages
- Volunteer
- Publications
- Awards
```

### 3. **Preview Component**
Live preview of CV in selected template
```typescript
<CVPreview cv={cv} templateId={templateId} />

Features:
- Real-time update
- PDF preview
- Template switching
- Zoom controls
```

### 4. **Template Selector**
Choose and preview templates
```typescript
<TemplateSelector 
  templates={templates}
  selectedTemplate={templateId}
  onSelect={handleTemplateChange}
/>

Shows:
- Thumbnail preview
- Template name
- Category
- Features
```

### 5. **File Upload**
Import CV from file
```typescript
<CVImport onImport={handleImport} />

Supports:
- JSON Resume
- YAML
- LinkedIn CSV
- Auto-detect format
```

### 6. **Export Dialog**
Export CV to different formats
```typescript
<ExportDialog cv={cv} onExport={handleExport} />

Formats:
- PDF download
- HTML preview
- JSON download
- Share link
```

### 7. **Public Profile**
View published CVs without login
```typescript
<PublicCVViewer token={publicToken} />

Features:
- No authentication required
- PDF download
- Print support
```

---

## 🔄 User Workflows

### Workflow 1: Create CV from Scratch
```
1. User clicks "New CV"
2. Selects template (optional)
3. Fills in form sections
   - Auto-save every change
4. Switches templates (optional)
5. Exports (PDF/JSON/etc)
6. Publishes (optional)
```

### Workflow 2: Import CV from File
```
1. User uploads file
2. System auto-detects format
3. Shows data quality score
4. Displays parsed data
5. Shows any warnings
6. User confirms import
7. CV created with parsed data
8. User can edit/adjust
```

### Workflow 3: Switch Template
```
1. User in CV Builder
2. Opens template selector
3. Browses templates
4. Previews template
5. Clicks "Apply"
6. CV re-renders with new template
7. User can switch back anytime
```

### Workflow 4: Export CV
```
1. User in CV Builder
2. Clicks "Export"
3. Selects format (PDF/HTML/JSON)
4. Optionally selects template
5. Downloads file
6. Or previews in browser
```

### Workflow 5: Share CV
```
1. User clicks "Publish"
2. CV becomes public
3. Gets unique share link
4. Can copy link
5. Share with others
6. Others view without login
7. Others can download/print
```

---

## 🎨 UI/UX Features

### Editor Features
- ✅ Real-time validation
- ✅ Section collapse/expand
- ✅ Add/remove items (experience, education, etc.)
- ✅ Drag-and-drop reordering
- ✅ Rich text editing
- ✅ Auto-save notifications
- ✅ Undo/Redo functionality

### Preview Features
- ✅ Live PDF preview
- ✅ Template preview
- ✅ Scroll sync (editor ↔ preview)
- ✅ Zoom controls
- ✅ Full-screen view
- ✅ Responsive design

### Import Features
- ✅ Drag-and-drop upload
- ✅ File selection dialog
- ✅ Format auto-detection
- ✅ Data preview
- ✅ Quality indicator
- ✅ Warning messages

### Export Features
- ✅ Multiple formats (PDF, HTML, JSON)
- ✅ Format preview
- ✅ Direct download
- ✅ Share link generation
- ✅ Copy to clipboard
- ✅ Email sharing

---

## 📊 Data Flow

### Create CV Flow
```
User Form Input
     ↓
CVEditor Component
     ↓
State Management (Store)
     ↓
Auto-save Hook
     ↓
API Service
     ↓
POST /api/v1/cv
     ↓
Backend (CVService)
     ↓
Database (Save)
     ↓
Response
     ↓
UI Update
```

### Preview Flow
```
Form Data Change
     ↓
Preview Component
     ↓
Call Template Rendering API
     ↓
GET /api/v1/cv/:id/render/html
     ↓
Backend (CVService)
     ↓
TemplateRegistry
     ↓
Generate HTML
     ↓
Response (HTML)
     ↓
Display Preview
```

### Import Flow
```
File Upload
     ↓
FileUpload Component
     ↓
POST /api/v1/cv/import
     ↓
Backend (CVService)
     ↓
ParserRegistry
     ↓
Parse File
     ↓
Validate Data
     ↓
Response (CVData + Quality)
     ↓
Display Preview
     ↓
User Confirms
     ↓
CV Created
```

---

## 🔧 Technology Stack

### Core
- **React 18+** - UI framework
- **Next.js 14+** - Framework & routing
- **TypeScript** - Type safety

### State Management
- **Zustand** or **Redux Toolkit** - Global state
- **React Context** - Local state

### Styling
- **Tailwind CSS** - Utility CSS
- **CSS Modules** - Component styles
- **Shadcn/ui** - UI components

### Form Handling
- **React Hook Form** - Form management
- **Zod** - Validation

### API Communication
- **Axios** or **Fetch API** - HTTP client
- **SWR** or **React Query** - Data fetching

### File Handling
- **React Dropzone** - File upload
- **PapaParse** - CSV parsing

### PDF/Export
- **jsPDF** - PDF generation (client-side preview)
- **html2canvas** - Screenshot for preview

### Notifications
- **React Toastify** or **Sonner** - Notifications
- **React Hot Toast** - Toast messages

---

## 📋 Component Examples

### CVEditor Component
```typescript
interface CVEditorProps {
  cv: CVData;
  onChange: (cv: CVData) => void;
  isLoading?: boolean;
}

export function CVEditor({ cv, onChange }: CVEditorProps) {
  return (
    <div className="cv-editor">
      <PersonalInfoSection 
        data={cv.personalInfo}
        onChange={(info) => onChange({ ...cv, personalInfo: info })}
      />
      <ExperienceSection 
        data={cv.experience}
        onChange={(exp) => onChange({ ...cv, experience: exp })}
      />
      {/* ... more sections */}
    </div>
  );
}
```

### Preview Component
```typescript
interface PreviewProps {
  cv: CVData;
  templateId: string;
}

export function Preview({ cv, templateId }: PreviewProps) {
  const { data: html, isLoading } = useCVPreview(cv, templateId);
  
  return (
    <div className="preview">
      {isLoading ? <Loading /> : <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
```

### TemplateSelector Component
```typescript
interface TemplateSelectorProps {
  templates: Template[];
  selected: string;
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ templates, selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="template-grid">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selected === template.id}
          onClick={() => onSelect(template.id)}
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Key Features for Phase 5

### Essential Features
- ✅ CV creation with form
- ✅ Real-time preview
- ✅ Template switching
- ✅ Auto-save functionality
- ✅ Export to PDF/JSON
- ✅ File import
- ✅ Public sharing
- ✅ Error handling
- ✅ Loading states
- ✅ Form validation

### Nice-to-Have Features
- ⏳ Undo/Redo
- ⏳ Multiple CVs management
- ⏳ CV version history
- ⏳ Analytics dashboard
- ⏳ Collaboration features
- ⏳ Template customization
- ⏳ Theme selector
- ⏳ Dark mode support

---

## 🚀 Phase 5 Timeline

| Day | Tasks |
|-----|-------|
| **Day 1** | Component structure, basic layout |
| **Day 2** | Editor & Preview components |
| **Day 3** | Template selector, Import feature |
| **Day 4** | Export, Sharing, API integration |
| **Day 5** | Testing, Polish, Documentation |

**Estimated Duration**: 3-5 days

---

## ✨ What Frontend Receives from Backend

### From Phase 4 APIs
1. **CV CRUD Endpoints** - Create, read, update, delete
2. **Import Endpoint** - Parse files and create CVs
3. **Export Endpoints** - Generate PDF/HTML/JSON
4. **Template Endpoints** - List and preview templates
5. **Public Endpoints** - Share CVs without auth
6. **Statistics Endpoints** - User analytics

### From Phase 2 (Templates)
- 9 professional templates
- Color schemes
- Rendering capabilities

### From Phase 3 (Parsers)
- File parsing support
- Format detection
- Data quality scoring

### From Phase 1 (Database)
- Data persistence
- User management
- Event tracking

---

## 🎉 Final System

```
┌─────────────────────────────────────────────┐
│      Frontend (React/Next.js)               │
│      CV Builder Interface                   │
│      Phase 5 ✅ (To be built)                │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Backend APIs (NestJS)                  │
│      CVController, CVService                │
│      Phase 4 ✅ (Just built)                 │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Integration Services                   │
│      Templates (Phase 2) ✅                  │
│      Parsers (Phase 3) ✅                    │
│      Database (Phase 1) ✅                   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      PostgreSQL Database                    │
│      15 tables, 30+ indexes                 │
│      Phase 1 ✅                              │
└─────────────────────────────────────────────┘

COMPLETE CV SYSTEM! 🎉
```

---

## 📝 Notes

- All APIs are ready and documented in Phase 4
- Templates are production-ready from Phase 2
- Parsers are battle-tested from Phase 3
- Database is optimized from Phase 1
- Frontend can start immediately with API integration

---

**Status**: 📋 PLANNED  
**Next**: Build Phase 5 Frontend  
**Estimated Time**: 3-5 days  
**Total Project Completion**: 95% (after Phase 5)
