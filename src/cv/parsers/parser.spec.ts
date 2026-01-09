import { Test, TestingModule } from '@nestjs/testing';
import { BaseParser, CVDataSchema, IParserResult } from './base.parser';
import { JsonResumeParser } from './json-resume.parser';
import { YamlParser } from './yaml.parser';
import { LinkedInParser } from './linkedin.parser';
import { ParserRegistry } from './parser.registry';

describe('BaseParser', () => {
  let parser: BaseParser;

  beforeEach(() => {
    parser = new JsonResumeParser();
  });

  describe('metadata', () => {
    it('should have valid metadata', () => {
      expect(parser.getMetadata()).toBeDefined();
      expect(parser.getMetadata().name).toBeDefined();
      expect(parser.getMetadata().type).toBeDefined();
      expect(parser.getMetadata().version).toBeDefined();
    });

    it('should have supported formats', () => {
      expect(parser.getSupportedFormats()).toBeDefined();
      expect(Array.isArray(parser.getSupportedFormats())).toBe(true);
    });

    it('should have supported sections', () => {
      expect(parser.getSupportedSections()).toBeDefined();
      expect(Array.isArray(parser.getSupportedSections())).toBe(true);
    });
  });

  describe('format support', () => {
    it('should check format support correctly', () => {
      const formats = parser.getSupportedFormats();
      if (formats.length > 0) {
        expect(parser.supportsFormat(formats[0])).toBe(true);
      }
      expect(parser.supportsFormat('unknown')).toBe(false);
    });

    it('should check section support correctly', () => {
      const sections = parser.getSupportedSections();
      if (sections.length > 0) {
        expect(parser.supportsSection(sections[0])).toBe(true);
      }
      expect(parser.supportsSection('unknown')).toBe(false);
    });
  });

  describe('date normalization', () => {
    it('should normalize ISO date format', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).normalizeDate('2020-01-15');
      expect(result).toBe('2020-01-15');
    });

    it('should normalize US date format', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).normalizeDate('01/15/2020');
      expect(result).toBe('2020-01-15');
    });

    it('should handle year-only dates', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).normalizeDate('2020');
      expect(result).toBe('2020-01-01');
    });

    it('should handle undefined dates', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).normalizeDate(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('text cleaning', () => {
    it('should clean extra whitespace', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).cleanText('Hello  \n  world   \t test');
      expect(result).toBe('Hello world test');
    });

    it('should trim text', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).cleanText('  Hello world  ');
      expect(result).toBe('Hello world');
    });

    it('should handle undefined text', () => {
      const parser = new JsonResumeParser();
      const result = (parser as any).cleanText(undefined);
      expect(result).toBeUndefined();
    });
  });
});

describe('JsonResumeParser', () => {
  let parser: JsonResumeParser;

  beforeEach(() => {
    parser = new JsonResumeParser();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      const metadata = parser.getMetadata();
      expect(metadata.type).toBe('json-resume');
      expect(metadata.supportedFormats).toContain('json');
    });
  });

  describe('parsing', () => {
    it('should parse valid JSON resume', async () => {
      const jsonResume = {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          location: 'New York, USA',
          summary: 'Software engineer with 5 years of experience',
        },
        work: [
          {
            name: 'Tech Corp',
            position: 'Software Engineer',
            startDate: '2019-01-01',
            endDate: '2022-12-31',
            summary: 'Developed web applications',
          },
        ],
        education: [
          {
            institution: 'University',
            area: 'Computer Science',
            startDate: '2015-09-01',
            endDate: '2019-05-31',
          },
        ],
        skills: [
          {
            name: 'Programming',
            keywords: ['JavaScript', 'TypeScript', 'Python'],
          },
        ],
      };

      const result = await parser.parse(jsonResume);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.personalInfo.fullName).toBe('John Doe');
      expect(result.data!.experience.length).toBe(1);
      expect(result.data!.education.length).toBe(1);
      expect(result.data!.skills.length).toBe(1);
    });

    it('should parse JSON resume from string', async () => {
      const jsonString = JSON.stringify({
        basics: { name: 'Jane Doe', email: 'jane@example.com' },
        work: [],
        education: [],
        skills: [],
      });

      const result = await parser.parse(jsonString);
      expect(result.success).toBe(true);
      expect(result.data!.personalInfo.fullName).toBe('Jane Doe');
    });

    it('should handle invalid JSON', async () => {
      const result = await parser.parse('{ invalid json }');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const incompleteResume = {
        basics: {
          email: 'test@example.com',
        },
        work: [],
        education: [],
        skills: [],
      };

      const result = await parser.parse(incompleteResume);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing experience', async () => {
      const minimalResume = {
        basics: { name: 'Test', email: 'test@example.com' },
        work: [],
        education: [],
        skills: [],
      };

      const result = await parser.parse(minimalResume);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('LinkedIn profile extraction', () => {
    it('should extract LinkedIn URL from profiles', async () => {
      const resume = {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
          profiles: [
            { network: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
            { network: 'GitHub', url: 'https://github.com/johndoe' },
          ],
        },
        work: [],
        education: [],
        skills: [],
      };

      const result = await parser.parse(resume);
      expect(result.data!.personalInfo.linkedin).toBe(
        'https://linkedin.com/in/johndoe',
      );
    });

    it('should extract GitHub URL from profiles', async () => {
      const resume = {
        basics: {
          name: 'John Doe',
          email: 'john@example.com',
          profiles: [
            { network: 'GitHub', url: 'https://github.com/johndoe' },
          ],
        },
        work: [],
        education: [],
        skills: [],
      };

      const result = await parser.parse(resume);
      expect(result.data!.personalInfo.github).toBe(
        'https://github.com/johndoe',
      );
    });
  });
});

describe('YamlParser', () => {
  let parser: YamlParser;

  beforeEach(() => {
    parser = new YamlParser();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      const metadata = parser.getMetadata();
      expect(metadata.type).toBe('yaml');
      expect(metadata.supportedFormats).toContain('yaml');
      expect(metadata.supportedFormats).toContain('yml');
    });
  });

  describe('parsing', () => {
    it('should parse basic YAML', async () => {
      const yamlString = `
basics:
  name: John Doe
  email: john@example.com
work: []
education: []
skills: []
`;

      const result = await parser.parse(yamlString);
      expect(result.success).toBe(true);
      expect(result.data!.personalInfo.fullName).toBe('John Doe');
    });

    it('should handle nested YAML structure', async () => {
      const yamlString = `
basics:
  name: Jane Doe
  email: jane@example.com
  location: New York
work: []
education: []
skills: []
`;

      const result = await parser.parse(yamlString);
      expect(result.data!.personalInfo.fullName).toBe('Jane Doe');
      expect(result.data!.personalInfo.location).toBe('New York');
    });

    it('should handle invalid YAML', async () => {
      const result = await parser.parse('invalid: [unclosed');
      expect(result.success).toBe(false);
    });
  });
});

describe('LinkedInParser', () => {
  let parser: LinkedInParser;

  beforeEach(() => {
    parser = new LinkedInParser();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      const metadata = parser.getMetadata();
      expect(metadata.type).toBe('linkedin');
      expect(metadata.supportedFormats).toContain('csv');
    });
  });

  describe('parsing', () => {
    it('should parse LinkedIn CSV', async () => {
      const csvData = [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          'Email Address': 'john@example.com',
          'Phone Number': '+1234567890',
          Company: 'Tech Corp',
          Position: 'Engineer',
          'Start Date': 'Jan 2020',
          'End Date': 'Dec 2022',
        },
      ];

      const result = await parser.parse(csvData);
      expect(result.success).toBe(true);
      expect(result.data!.personalInfo.fullName).toBe('John Doe');
    });

    it('should normalize LinkedIn date format', async () => {
      const csvData = [
        {
          'First Name': 'Jane',
          'Last Name': 'Doe',
          'Email Address': 'jane@example.com',
          Company: 'Tech Corp',
          Position: 'Engineer',
          'Start Date': 'Jan 2020',
          'End Date': 'Dec 2022',
        },
      ];

      const result = await parser.parse(csvData);
      expect(result.data!.experience[0].startDate).toBe('2020-01-01');
    });

    it('should handle empty CSV', async () => {
      const result = await parser.parse([]);
      expect(result.success).toBe(false);
    });
  });
});

describe('ParserRegistry', () => {
  let registry: ParserRegistry;
  let jsonResumeParser: JsonResumeParser;
  let yamlParser: YamlParser;
  let linkedInParser: LinkedInParser;

  beforeEach(() => {
    jsonResumeParser = new JsonResumeParser();
    yamlParser = new YamlParser();
    linkedInParser = new LinkedInParser();
    registry = new ParserRegistry(jsonResumeParser, yamlParser, linkedInParser);
  });

  describe('registration', () => {
    it('should register default parsers', () => {
      expect(registry.hasParser('json-resume')).toBe(true);
      expect(registry.hasParser('yaml')).toBe(true);
      expect(registry.hasParser('linkedin')).toBe(true);
    });

    it('should get parser by type', () => {
      const parser = registry.getParser('json-resume');
      expect(parser).toBeDefined();
      expect(parser.getMetadata().type).toBe('json-resume');
    });

    it('should throw error for unknown parser', () => {
      expect(() => registry.getParser('unknown')).toThrow();
    });
  });

  describe('format support', () => {
    it('should detect supported formats', () => {
      const formats = registry.getAvailableFormats();
      expect(formats).toContain('json');
      expect(formats).toContain('yaml');
      expect(formats).toContain('yml');
      expect(formats).toContain('csv');
    });

    it('should check format support', () => {
      expect(registry.supportsFormat('json')).toBe(true);
      expect(registry.supportsFormat('yaml')).toBe(true);
      expect(registry.supportsFormat('csv')).toBe(true);
      expect(registry.supportsFormat('unknown')).toBe(false);
    });

    it('should get parsers by format', () => {
      const parsers = registry.getParsersByFormat('json');
      expect(parsers.length).toBeGreaterThan(0);
      expect(parsers[0].getMetadata().type).toBe('json-resume');
    });
  });

  describe('auto-detection', () => {
    it('should auto-detect JSON parser', () => {
      const parser = registry.autoDetect('json');
      expect(parser.getMetadata().type).toBe('json-resume');
    });

    it('should auto-detect YAML parser', () => {
      const parser = registry.autoDetect('yaml');
      expect(parser.getMetadata().type).toBe('yaml');
    });

    it('should auto-detect LinkedIn parser', () => {
      const parser = registry.autoDetect('csv');
      expect(parser.getMetadata().type).toBe('linkedin');
    });

    it('should throw error for unsupported format', () => {
      expect(() => registry.autoDetect('unknown')).toThrow();
    });
  });

  describe('parsing', () => {
    it('should parse with auto-detected parser', async () => {
      const jsonResume = {
        basics: { name: 'John Doe', email: 'john@example.com' },
        work: [],
        education: [],
        skills: [],
      };

      const result = await registry.parse(JSON.stringify(jsonResume), 'json');
      expect(result.success).toBe(true);
    });

    it('should parse with specific parser type', async () => {
      const csvData = [
        {
          'First Name': 'Jane',
          'Last Name': 'Doe',
          'Email Address': 'jane@example.com',
        },
      ];

      const result = await registry.parse(csvData, 'csv', 'linkedin');
      expect(result.success).toBe(true);
    });
  });

  describe('search', () => {
    it('should search parsers by keyword', () => {
      const results = registry.search('json');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].getMetadata().type).toBe('json-resume');
    });

    it('should search by parser type', () => {
      const results = registry.search('linkedin');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('metadata', () => {
    it('should get all metadata', () => {
      const metadata = registry.getAllMetadata();
      expect(metadata.length).toBeGreaterThan(0);
      expect(metadata[0].type).toBeDefined();
    });

    it('should get statistics', () => {
      const stats = registry.getStatistics();
      expect(stats.totalParsers).toBeGreaterThan(0);
      expect(stats.supportedFormats.length).toBeGreaterThan(0);
      expect(stats.parserDetails.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('should validate configuration', () => {
      const result = registry.validate();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('section support', () => {
    it('should get parsers by section', () => {
      const parsers = registry.getParsersBySection('personalInfo');
      expect(parsers.length).toBeGreaterThan(0);
    });

    it('should find parsers supporting multiple sections', () => {
      const experience = registry.getParsersBySection('experience');
      const education = registry.getParsersBySection('education');
      expect(experience.length).toBeGreaterThan(0);
      expect(education.length).toBeGreaterThan(0);
    });
  });
});
