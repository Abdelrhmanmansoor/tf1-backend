# 🚀 دليل الدمج التقني الشامل

**الإصدار**: 1.0  
**آخر تحديث**: يناير 9، 2026  
**الحالة**: جاهز للتنفيذ

---

## 📋 فهرس المحتويات

1. [الخطوة الأولى](#خطوة-1-الإعداد)
2. [دمج النماذج](#خطوة-2-دمج-النماذج)
3. [دمج Parsers](#خطوة-3-دمج-parsers)
4. [دمج Services](#خطوة-4-دمج-services)
5. [دمج Database](#خطوة-5-دمج-database)
6. [الاختبار](#خطوة-6-الاختبار)

---

## ✅ الخطوة 1: الإعداد

### 1.1 إنشاء هيكل المجلدات

```bash
# في Backend
mkdir -p src/modules/cv/{
  controllers,
  services,
  models,
  schemas,
  parsers,
  templates/{latex,html,partials},
  utils,
  pipes,
  guards
}

# في Frontend
mkdir -p app/cv/{
  components,
  hooks,
  services,
  types,
  utils
}
```

### 1.2 تثبيت Dependencies

```bash
# في Backend
npm install --save \
  @nestjs/swagger \
  zod \
  zod-to-json-schema \
  latex-parse \
  handlebars \
  puppeteer-core \
  browserless \
  sharp

# في Frontend
npm install --save \
  react-hook-form \
  zod \
  zustand \
  react-pdf \
  zustand-temporal
```

### 1.3 إضافة Environment Variables

```bash
# .env
CV_STORAGE_PATH=./uploads/cv
CV_ENABLE_LATEX=true
CV_ENABLE_PDF=true
CV_ENABLE_HTML=true
OPENAI_API_KEY=xxx
BROWSERLESS_TOKEN=xxx
MAX_UPLOAD_SIZE=10485760
```

---

## 📦 الخطوة 2: دمج النماذج

### 2.1 إنشاء Prisma Schema

```prisma
// prisma/schema.prisma

// إضافة CV Model
model CV {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title     String
  slug      String    @unique
  data      Json      // CVData object
  template  String    @default("awesome-cv")
  
  visibility String   @default("private") // public | private
  locked    Boolean   @default(false)
  
  // Analytics
  viewCount Int       @default(0)
  downloadCount Int   @default(0)
  
  // Metadata
  metadata  Json?     // Custom metadata
  
  // Relationships
  versions  CVVersion[]
  exports   CVExport[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@index([userId])
  @@index([slug])
}

model CVVersion {
  id      String  @id @default(cuid())
  cvId    String
  cv      CV      @relation(fields: [cvId], references: [id], onDelete: Cascade)
  
  versionNumber Int
  data    Json    // CVData snapshot
  
  createdAt DateTime @default(now())
  
  @@unique([cvId, versionNumber])
}

model CVExport {
  id      String  @id @default(cuid())
  cvId    String
  cv      CV      @relation(fields: [cvId], references: [id], onDelete: Cascade)
  
  format  String  // pdf | html | json | zip
  template String
  
  fileSize Int?
  fileName String?
  filePath String?
  
  downloadUrl String?
  expiresAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.2 إضافة النماذج من Resumake.io

```typescript
// src/modules/cv/templates/latex/awesome-cv.template.ts

import { Injectable } from '@nestjs/common';
import { stripIndent } from 'common-tags';
import { CVData } from '@cv/schemas';
import { ITemplate } from '@cv/interfaces';

@Injectable()
export class AwesomeCVTemplate implements ITemplate {
  name = 'awesome-cv';
  title = 'Awesome CV';
  category = 'modern';
  language = 'latex';

  async render(data: CVData): Promise<string> {
    return stripIndent`
      %!TEX TS-program = xelatex
      %!TEX encoding = UTF-8 Unicode
      
      \\documentclass[]{awesome-cv}
      \\usepackage{textcomp}
      
      ${this.renderHeader(data)}
      
      \\begin{document}
      
      ${this.renderMakecvtitle(data)}
      
      ${this.renderSections(data)}
      
      \\end{document}
    `;
  }

  private renderHeader(data: CVData): string {
    return stripIndent`
      \\fontdir[fonts/]
      
      \\colorlet{awesome}{awesome-red}
      
      \\definecolor{awesome}{HTML}{FFA500}
      \\definecolor{darktext}{HTML}{414141}
    `;
  }

  private renderMakecvtitle(data: CVData): string {
    return stripIndent`
      \\makecvheader
      
      \\vspace{1.5mm}
    `;
  }

  private renderSections(data: CVData): string {
    let output = '';
    
    if (data.basics) {
      output += this.renderBasics(data.basics);
    }
    
    if (data.sections.experience?.items?.length) {
      output += this.renderExperience(data.sections.experience.items);
    }
    
    if (data.sections.education?.items?.length) {
      output += this.renderEducation(data.sections.education.items);
    }
    
    return output;
  }

  private renderBasics(basics: any): string {
    return stripIndent`
      \\cvsection{Summary}
      \\begin{cvparagraph}
      ${basics.headline || basics.name}
      \\end{cvparagraph}
    `;
  }

  private renderExperience(items: any[]): string {
    return stripIndent`
      \\cvsection{Experience}
      
      ${items
        .map(job => {
          return stripIndent`
            \\cventry
            {${job.position}}
            {${job.company}}
            {${job.location || ''}}
            {${this.formatDate(job.startDate)} -- ${this.formatDate(job.endDate) || 'Present'}}
            {
              ${job.summary || job.description || ''}
            }
          `;
        })
        .join('\n')}
    `;
  }

  private renderEducation(items: any[]): string {
    return stripIndent`
      \\cvsection{Education}
      
      ${items
        .map(edu => {
          return stripIndent`
            \\cventry
            {${edu.studyType} in ${edu.area}}
            {${edu.institution}}
            {${edu.location || ''}}
            {${this.formatDate(edu.startDate)} -- ${this.formatDate(edu.endDate) || 'Present'}}
            {}
          `;
        })
        .join('\n')}
    `;
  }

  private formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
}
```

### 2.3 تسجيل النماذج

```typescript
// src/modules/cv/templates/template.registry.ts

import { Injectable } from '@nestjs/common';
import { AwesomeCVTemplate } from './latex/awesome-cv.template';
import { ModernCVTemplate } from './latex/modern-cv.template';
import { StandardTemplate } from './latex/standard.template';
// ... import other templates

@Injectable()
export class TemplateRegistry {
  private templates: Map<string, ITemplate>;

  constructor(
    awesomeCV: AwesomeCVTemplate,
    modernCV: ModernCVTemplate,
    standard: StandardTemplate,
    // ... inject other templates
  ) {
    this.templates = new Map([
      ['awesome-cv', awesomeCV],
      ['modern-cv', modernCV],
      ['standard', standard],
      // ... register all templates
    ]);
  }

  getTemplate(name: string): ITemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new NotFoundException(`Template ${name} not found`);
    }
    return template;
  }

  listTemplates(): ITemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByLanguage(language: 'latex' | 'html'): ITemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.language === language
    );
  }
}
```

---

## 🔄 الخطوة 3: دمج Parsers

### 3.1 إنشاء Base Parser

```typescript
// src/modules/cv/parsers/base.parser.ts

import { CVData } from '@cv/schemas';

export interface IParser {
  validate(data: any): boolean;
  parse(data: any): CVData;
  format: string;
}

export abstract class BaseParser implements IParser {
  abstract format: string;

  abstract validate(data: any): boolean;
  abstract parse(data: any): CVData;

  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected formatDate(date: string | undefined): string {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return date;
    }
  }

  protected createDefaultCV(): CVData {
    return {
      basics: {
        name: '',
        email: '',
        phone: '',
        location: '',
        headline: '',
        url: { label: '', href: '' },
        customFields: [],
        picture: {
          url: '',
          size: 120,
          aspectRatio: 1,
          borderRadius: 0,
          effects: { hidden: false, border: false, grayscale: false },
        },
      },
      sections: {
        summary: { name: 'Summary', columns: 1, separateLinks: true, visible: true, id: 'summary', content: '' },
        experience: { name: 'Experience', columns: 1, separateLinks: true, visible: true, id: 'experience', items: [] },
        education: { name: 'Education', columns: 1, separateLinks: true, visible: true, id: 'education', items: [] },
        skills: { name: 'Skills', columns: 1, separateLinks: true, visible: true, id: 'skills', items: [] },
      },
      metadata: {
        template: 'awesome-cv',
        layout: [['summary', 'experience', 'education', 'skills']],
        notes: '',
      },
    };
  }
}
```

### 3.2 JSON Resume Parser

```typescript
// src/modules/cv/parsers/json-resume.parser.ts

import { Injectable } from '@nestjs/common';
import { BaseParser } from './base.parser';
import { CVData } from '@cv/schemas';

@Injectable()
export class JSONResumeParser extends BaseParser {
  format = 'json-resume';

  validate(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.basics &&
      typeof data.basics.name === 'string'
    );
  }

  parse(data: any): CVData {
    const cv = this.createDefaultCV();

    // Parse basics
    if (data.basics) {
      cv.basics = {
        ...cv.basics,
        name: data.basics.name || '',
        email: data.basics.email || '',
        phone: data.basics.phone || '',
        location: data.basics.location || '',
        headline: data.basics.summary || '',
        url: {
          label: '',
          href: data.basics.url || '',
        },
      };
    }

    // Parse work experience
    if (Array.isArray(data.work)) {
      cv.sections.experience.items = data.work.map((job: any) => ({
        id: this.generateId(),
        position: job.position || '',
        company: job.name || '',
        location: job.location || '',
        startDate: this.formatDate(job.startDate),
        endDate: this.formatDate(job.endDate),
        summary: job.summary || '',
        url: { label: '', href: job.url || '' },
      }));
    }

    // Parse education
    if (Array.isArray(data.education)) {
      cv.sections.education.items = data.education.map((edu: any) => ({
        id: this.generateId(),
        institution: edu.institution || '',
        studyType: edu.studyType || '',
        area: edu.area || '',
        score: edu.score || '',
        startDate: this.formatDate(edu.startDate),
        endDate: this.formatDate(edu.endDate),
        summary: edu.summary || '',
        url: { label: '', href: edu.url || '' },
      }));
    }

    // Parse skills
    if (Array.isArray(data.skills)) {
      cv.sections.skills.items = data.skills.map((skill: any) => ({
        id: this.generateId(),
        name: skill.name || '',
        description: skill.level || '',
        keywords: skill.keywords || [],
      }));
    }

    return cv;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### 3.3 Parser Registry

```typescript
// src/modules/cv/services/parser.service.ts

import { Injectable } from '@nestjs/common';
import { JSONResumeParser } from '@cv/parsers';
import { ReactiveResumeParser } from '@cv/parsers';
import { LinkedInParser } from '@cv/parsers';
import { CVData } from '@cv/schemas';

@Injectable()
export class ParserService {
  constructor(
    private jsonResumeParser: JSONResumeParser,
    private reactiveResumeParser: ReactiveResumeParser,
    private linkedInParser: LinkedInParser,
  ) {}

  async parse(data: any, format?: string): Promise<CVData> {
    // Auto-detect format if not provided
    if (!format) {
      format = this.detectFormat(data);
    }

    const parser = this.getParser(format);
    if (!parser.validate(data)) {
      throw new BadRequestException(`Invalid ${format} format`);
    }

    return parser.parse(data);
  }

  private detectFormat(data: any): string {
    if (data.basics && data.work) return 'json-resume';
    if (data.data?.basics) return 'reactive-resume';
    if (data.profile?.name) return 'linkedin';
    return 'json-resume';
  }

  private getParser(format: string) {
    switch (format) {
      case 'json-resume':
        return this.jsonResumeParser;
      case 'reactive-resume':
        return this.reactiveResumeParser;
      case 'linkedin':
        return this.linkedInParser;
      default:
        throw new BadRequestException(`Unknown format: ${format}`);
    }
  }
}
```

---

## 🔌 الخطوة 4: دمج Services

### 4.1 CV Service الرئيسي

```typescript
// src/modules/cv/services/cv.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CVData } from '@cv/schemas';

@Injectable()
export class CVService {
  constructor(
    private prisma: PrismaService,
    private parser: ParserService,
    private exporter: ExportService,
    private validation: ValidationService,
  ) {}

  async create(userId: string, data: any): Promise<any> {
    // Validate input
    await this.validation.validateCVData(data);

    // Create slug
    const slug = this.generateSlug(data.title);

    // Save to database
    return this.prisma.cv.create({
      data: {
        userId,
        title: data.title,
        slug,
        data: data as any,
        template: data.template || 'awesome-cv',
      },
    });
  }

  async findOne(id: string, userId?: string): Promise<any> {
    const cv = await this.prisma.cv.findUnique({ where: { id } });

    if (!cv) throw new NotFoundException('CV not found');
    if (userId && cv.userId !== userId) throw new ForbiddenException();

    return cv;
  }

  async update(id: string, userId: string, data: any): Promise<any> {
    const cv = await this.findOne(id, userId);

    // Save version
    const maxVersion = await this.prisma.cvVersion.findFirst({
      where: { cvId: id },
      orderBy: { versionNumber: 'desc' },
    });

    await this.prisma.cvVersion.create({
      data: {
        cvId: id,
        versionNumber: (maxVersion?.versionNumber || 0) + 1,
        data: cv.data,
      },
    });

    return this.prisma.cv.update({
      where: { id },
      data: { data: data as any },
    });
  }

  async export(
    id: string,
    format: 'pdf' | 'html' | 'json',
    template?: string,
  ): Promise<string> {
    const cv = await this.findOne(id);

    let url: string;
    switch (format) {
      case 'pdf':
        url = await this.exporter.toPDF(cv.data, template || cv.template);
        break;
      case 'html':
        url = await this.exporter.toHTML(cv.data, template || cv.template);
        break;
      case 'json':
        url = await this.exporter.toJSON(cv.data);
        break;
    }

    // Log export
    await this.prisma.cvExport.create({
      data: {
        cvId: id,
        format,
        template: template || cv.template,
        downloadUrl: url,
      },
    });

    return url;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
```

---

## 📊 الخطوة 5: دمج Database

### 5.1 Migration الأولى

```bash
npx prisma migrate dev --name init_cv_system
```

### 5.2 Seeding Sample Data

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample CV data
  const sampleCV = {
    basics: {
      name: 'أحمد محمد',
      email: 'ahmed@example.com',
      phone: '+966-12-3456789',
      location: 'الرياض',
      headline: 'مطور برمجيات متقدم',
    },
    sections: {
      experience: {
        items: [
          {
            position: 'Senior Developer',
            company: 'Tech Company',
            startDate: '2020-01-01',
            endDate: '2024-01-01',
            summary: 'قيادة فريق التطوير',
          },
        ],
      },
      education: {
        items: [
          {
            institution: 'جامعة الملك سعود',
            studyType: 'بكالوريوس',
            area: 'علوم الحاسوب',
            startDate: '2016-09-01',
            endDate: '2020-05-31',
          },
        ],
      },
    },
  };

  console.log('Seeding database...');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🧪 الخطوة 6: الاختبار

### 6.1 Unit Tests للـ Parsers

```typescript
// src/modules/cv/parsers/__tests__/json-resume.parser.spec.ts

describe('JSONResumeParser', () => {
  let parser: JSONResumeParser;

  beforeEach(() => {
    parser = new JSONResumeParser();
  });

  describe('validate', () => {
    it('should validate correct JSON Resume', () => {
      const data = {
        basics: { name: 'John Doe' },
        work: [],
        education: [],
      };
      expect(parser.validate(data)).toBe(true);
    });

    it('should reject invalid data', () => {
      expect(parser.validate({})).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse JSON Resume correctly', () => {
      const data = {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        work: [
          {
            position: 'Developer',
            name: 'Tech Corp',
            startDate: '2020-01-01',
          },
        ],
      };

      const result = parser.parse(data);

      expect(result.basics.name).toBe('John Doe');
      expect(result.sections.experience.items.length).toBe(1);
    });
  });
});
```

### 6.2 Integration Tests

```typescript
// src/modules/cv/__tests__/cv.controller.spec.ts

describe('CVController', () => {
  let controller: CVController;
  let service: CVService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CVController],
      providers: [CVService, ParserService, ExportService],
    }).compile();

    controller = module.get<CVController>(CVController);
    service = module.get<CVService>(CVService);
  });

  it('should create CV', async () => {
    const createCVDto = {
      title: 'My Resume',
      data: { basics: { name: 'John' } },
    };

    const result = await controller.create('user-123', createCVDto);
    expect(result).toHaveProperty('id');
  });
});
```

---

## 📦 ملف Configuration موحد

### config/cv.config.ts

```typescript
export const cvConfig = {
  // Templates
  defaultTemplate: 'awesome-cv',
  templates: {
    latex: ['awesome-cv', 'modern-cv', 'standard', 'classic', 'creative'],
    html: ['standard', 'modern', 'minimal'],
  },

  // Export
  export: {
    pdf: {
      enabled: true,
      engine: 'browserless',
      timeout: 30000,
    },
    html: {
      enabled: true,
      engine: 'handlebars',
    },
    json: {
      enabled: true,
      format: 'json-resume',
    },
  },

  // Storage
  storage: {
    path: process.env.CV_STORAGE_PATH || './uploads/cv',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  // Parsing
  parsing: {
    formats: ['json-resume', 'reactive-resume', 'linkedin'],
    autoDetect: true,
  },
};
```

---

## ✅ Checklist النشر

- [ ] تثبيت Dependencies
- [ ] إنشاء Migrations
- [ ] تسجيل Templates
- [ ] تسجيل Parsers
- [ ] اختبار Unit Tests
- [ ] اختبار Integration Tests
- [ ] توثيق APIs
- [ ] تحديث README
- [ ] عمل Deployment
- [ ] اختبار شامل في الإنتاج

---

**الحالة**: جاهز للتطبيق! 🎉
