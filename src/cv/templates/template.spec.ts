/**
 * Template System Unit Tests
 * Tests for all template classes and registry
 */

import { Test, TestingModule } from '@nestjs/testing';
import TemplateRegistry from './template.registry';
import TemplateRenderingService from './template-rendering.service';
import { AwesomeCVTemplate } from './awesome-cv.template';
import { ModernCVTemplate } from './modern-cv.template';
import { ClassicTemplate } from './classic.template';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('Template Registration', () => {
    it('should register all default templates', () => {
      expect(registry.getTemplateIds().length).toBe(9);
    });

    it('should retrieve template by ID', () => {
      const template = registry.getTemplate('awesome-cv');
      expect(template).toBeInstanceOf(AwesomeCVTemplate);
    });

    it('should return undefined for non-existent template', () => {
      const template = registry.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('Template Metadata', () => {
    it('should get template metadata', () => {
      const metadata = registry.getTemplateMetadata('awesome-cv');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('AwesomeCV');
      expect(metadata?.displayName).toBe('Awesome CV');
    });

    it('should get all templates', () => {
      const templates = registry.getAllTemplates();
      expect(templates.length).toBe(9);
    });

    it('should filter templates by category', () => {
      const modernTemplates = registry.getTemplatesByCategory('modern');
      expect(modernTemplates.length).toBeGreaterThan(0);
      expect(modernTemplates.every((t) => t.category === 'modern')).toBe(true);
    });

    it('should filter templates by format', () => {
      const latexTemplates = registry.getTemplatesByFormat('latex');
      expect(latexTemplates.length).toBeGreaterThan(0);
      expect(latexTemplates.every((t) => t.format === 'latex')).toBe(true);
    });
  });

  describe('Template Validation', () => {
    it('should validate template sections', () => {
      const result = registry.validateSections('awesome-cv', [
        'personalInfo',
        'experience',
      ]);
      expect(result.valid).toBe(true);
      expect(result.unsupported.length).toBe(0);
    });

    it('should detect unsupported sections', () => {
      const result = registry.validateSections('classic', [
        'personalInfo',
        'unsupportedSection',
      ]);
      expect(result.valid).toBe(false);
      expect(result.unsupported).toContain('unsupportedSection');
    });

    it('should check if template exists', () => {
      expect(registry.exists('awesome-cv')).toBe(true);
      expect(registry.exists('non-existent')).toBe(false);
    });
  });

  describe('Template Search and Statistics', () => {
    it('should search templates by keyword', () => {
      const results = registry.searchTemplates('modern');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((t) =>
          t.displayName.toLowerCase().includes('modern')
        )
      ).toBe(true);
    });

    it('should get template statistics', () => {
      const stats = registry.getStatistics();
      expect(stats.total).toBe(9);
      expect(stats.byCategory).toBeDefined();
      expect(stats.byFormat).toBeDefined();
    });

    it('should get popular templates', () => {
      const popular = registry.getPopularTemplates(3);
      expect(popular.length).toBe(3);
      expect(popular[0].id).toBe('awesome-cv');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid template', () => {
      expect(() => {
        registry.getValidTemplate('non-existent');
      }).toThrow();
    });

    it('should return default template', () => {
      const template = registry.getDefaultTemplate();
      expect(template).toBeInstanceOf(AwesomeCVTemplate);
    });
  });
});

describe('BaseTemplate', () => {
  let template: AwesomeCVTemplate;

  beforeEach(() => {
    template = new AwesomeCVTemplate();
  });

  describe('Template Metadata', () => {
    it('should have valid metadata', () => {
      const metadata = template.getMetadata();
      expect(metadata.id).toBe('awesome-cv');
      expect(metadata.name).toBe('AwesomeCV');
      expect(metadata.category).toBe('modern');
      expect(metadata.format).toBe('latex');
    });

    it('should list supported sections', () => {
      const sections = template.getSections();
      expect(sections).toContain('personalInfo');
      expect(sections).toContain('experience');
      expect(sections).toContain('education');
    });
  });

  describe('Data Validation', () => {
    it('should validate complete CV data', () => {
      const cvData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        experience: [
          {
            jobTitle: 'Developer',
            company: 'Acme Corp',
          },
        ],
        education: [
          {
            fieldOfStudy: 'Computer Science',
            institution: 'University',
          },
        ],
      };

      const result = template.validateCVData(cvData);
      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields', () => {
      const cvData = {
        personalInfo: { name: 'John Doe' },
        // Missing experience and education
      };

      const result = template.validateCVData(cvData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render template successfully', async () => {
      const cvData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          location: 'New York',
          title: 'Software Developer',
        },
        experience: [
          {
            jobTitle: 'Senior Developer',
            company: 'Tech Company',
            location: 'New York',
            startDate: new Date('2020-01-01'),
            endDate: new Date('2023-12-31'),
            description: 'Led development of new features',
            currentlyWorking: false,
          },
        ],
        education: [
          {
            fieldOfStudy: 'Computer Science',
            institution: 'State University',
            location: 'Boston',
            graduationYear: '2019',
            endDate: new Date('2019-05-01'),
          },
        ],
        summary: 'Experienced software developer with 5+ years of experience',
        skills: [
          {
            category: 'Languages',
            items: ['JavaScript', 'Python', 'Java'],
          },
        ],
      };

      const rendered = await template.render(cvData);
      expect(rendered).toBeDefined();
      expect(rendered.length).toBeGreaterThan(0);
      expect(rendered).toContain('John Doe');
    });
  });

  describe('Theme Application', () => {
    it('should apply theme to template', () => {
      const themedLatex = template.applyTheme('blue');
      expect(themedLatex).toBeDefined();
      expect(themedLatex.length).toBeGreaterThan(0);
    });

    it('should support multiple themes', () => {
      const themes = ['blue', 'red', 'green', 'purple'];
      themes.forEach((theme) => {
        const result = template.applyTheme(theme);
        expect(result).toBeDefined();
      });
    });
  });
});

describe('TemplateRenderingService', () => {
  let service: TemplateRenderingService;
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
    service = new TemplateRenderingService(registry);
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should pass health check', async () => {
      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('HTML Rendering', () => {
    it('should render to HTML', async () => {
      const cvData = {
        personalInfo: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567890',
          location: 'Boston',
          title: 'Product Manager',
        },
        experience: [
          {
            jobTitle: 'Product Manager',
            company: 'Tech Startup',
            location: 'Boston',
            startDate: new Date('2021-01-01'),
            currentlyWorking: true,
            description: 'Managed product roadmap',
          },
        ],
        education: [
          {
            fieldOfStudy: 'Business Administration',
            institution: 'Business School',
            location: 'Boston',
            endDate: new Date('2020-05-01'),
          },
        ],
      };

      const result = await service.renderToHTML('modern-cv', cvData);
      expect(result.success).toBe(true);
      expect(result.format).toBe('html');
      expect(result.buffer).toBeDefined();
    });
  });
});
