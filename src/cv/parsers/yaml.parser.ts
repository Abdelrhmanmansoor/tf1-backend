import { Injectable } from '@nestjs/common';
import { BaseParser, CVData, IParserMetadata, IParserResult } from './base.parser';

/**
 * YAML Parser
 *
 * Parses CV data from YAML format
 * Converts YAML to JSON internally for processing
 *
 * Example YAML format:
 * basics:
 *   name: John Doe
 *   email: john@example.com
 *   phone: "+1234567890"
 * work:
 *   - company: "..."
 *     position: "..."
 *     startDate: "2020-01-01"
 * ...
 */
@Injectable()
export class YamlParser extends BaseParser {
  metadata: IParserMetadata = {
    name: 'YAML Parser',
    type: 'yaml',
    version: '1.0.0',
    supportedFormats: ['yaml', 'yml'],
    supportedSections: [
      'personalInfo',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'languages',
      'volunteer',
      'publications',
      'awards',
    ],
    description: 'Parses CV data from YAML format',
  };

  /**
   * Parse YAML format
   * Note: This is a simplified parser that handles basic YAML structure
   * For production, consider using a proper YAML library like js-yaml
   *
   * @param input YAML string
   * @param options Parse options
   * @returns Parse result
   */
  async parseRaw(
    input: any,
    options?: Record<string, any>,
  ): Promise<IParserResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Convert YAML to JSON-like object
      let resume: any = input;

      if (typeof input === 'string') {
        try {
          resume = this.parseYaml(input);
        } catch (parseError) {
          return {
            success: false,
            errors: [
              `Invalid YAML format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            ],
            warnings: [],
            metadata: {
              parserType: this.metadata.type,
              parseTime: 0,
              dataQuality: 0,
            },
          };
        }
      }

      // Extract basics (personal info)
      const basics = resume.basics || {};
      const personalInfo = {
        fullName: basics.name || '',
        email: basics.email || '',
        phone: basics.phone,
        location: basics.location,
        summary: basics.summary,
        website: basics.url || basics.website,
        linkedin: basics.linkedin,
        github: basics.github,
      };

      if (!personalInfo.fullName) {
        errors.push('basics.name is required');
      }
      if (!personalInfo.email) {
        errors.push('basics.email is required');
      }

      // Extract work experience
      const experience = (resume.work || []).map((work: any) => ({
        company: work.name || work.company || '',
        position: work.position || '',
        startDate: this.normalizeDate(work.startDate) || '',
        endDate: work.endDate ? this.normalizeDate(work.endDate) : undefined,
        description: this.cleanText(work.summary || work.description),
        highlights: work.highlights || [],
      }));

      if (experience.length === 0) {
        warnings.push('No work experience found in YAML');
      }

      // Extract education
      const education = (resume.education || []).map((edu: any) => ({
        institution: edu.institution || edu.school || '',
        area: edu.area || edu.studyType || edu.fieldOfStudy,
        studyType: edu.studyType || edu.degree,
        startDate: this.normalizeDate(edu.startDate),
        endDate: edu.endDate ? this.normalizeDate(edu.endDate) : undefined,
        score: edu.score || edu.gpa,
      }));

      if (education.length === 0) {
        warnings.push('No education found in YAML');
      }

      // Extract skills
      const skills = this.parseSkills(resume.skills);

      if (skills.length === 0) {
        warnings.push('No skills found in YAML');
      }

      // Extract projects
      const projects = (resume.projects || []).map((project: any) => ({
        name: project.name || '',
        description: this.cleanText(project.description),
        url: project.url || project.repository,
        technologies: project.technologies || project.keywords || [],
        startDate: this.normalizeDate(project.startDate),
        endDate: project.endDate ? this.normalizeDate(project.endDate) : undefined,
      }));

      // Extract certifications
      const certifications = (resume.certificates || resume.certifications || []).map(
        (cert: any) => ({
          name: cert.name || cert.title || '',
          issuer: cert.issuer || cert.organization,
          issueDate: this.normalizeDate(cert.date || cert.issueDate),
          expirationDate: cert.expirationDate
            ? this.normalizeDate(cert.expirationDate)
            : undefined,
          credentialUrl: cert.url || cert.credentialUrl,
        }),
      );

      // Extract languages
      const languages = (resume.languages || []).map((lang: any) => ({
        language: lang.language || lang.name || '',
        proficiency: lang.fluency || lang.proficiency,
      }));

      // Extract volunteer experience
      const volunteer = (resume.volunteer || []).map((vol: any) => ({
        organization: vol.organization || '',
        position: vol.position || vol.role,
        startDate: this.normalizeDate(vol.startDate),
        endDate: vol.endDate ? this.normalizeDate(vol.endDate) : undefined,
        description: this.cleanText(vol.summary || vol.description),
      }));

      // Extract publications
      const publications = (resume.publications || []).map((pub: any) => ({
        name: pub.name || pub.title || '',
        publisher: pub.publisher,
        releaseDate: this.normalizeDate(pub.releaseDate || pub.date),
        url: pub.url,
        summary: this.cleanText(pub.summary || pub.description),
      }));

      // Extract awards
      const awards = (resume.awards || []).map((award: any) => ({
        title: award.title || award.name || '',
        date: this.normalizeDate(award.date),
        awarder: award.awarder || award.issuer,
        summary: this.cleanText(award.summary || award.description),
      }));

      const cvData: CVData = {
        personalInfo,
        experience,
        education,
        skills,
        projects,
        certifications,
        languages,
        volunteer,
        publications,
        awards,
      };

      return {
        success: errors.length === 0,
        data: cvData,
        errors,
        warnings,
        metadata: {
          parserType: this.metadata.type,
          parseTime: 0,
          dataQuality: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        metadata: {
          parserType: this.metadata.type,
          parseTime: 0,
          dataQuality: 0,
        },
      };
    }
  }

  /**
   * Simple YAML parser
   * Note: This is a basic implementation. For production, use js-yaml library
   *
   * @param yamlString YAML string to parse
   * @returns Parsed object
   */
  private parseYaml(yamlString: string): any {
    const lines = yamlString.split('\n');
    const result: any = {};
    let currentSection: any = result;
    let stack: Array<{ obj: any; level: number }> = [];

    for (const line of lines) {
      const trimmedLine = line.replace(/^\s+|\s+$/g, '');

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Calculate indentation level
      const indentation = (line.length - line.trimStart().length) / 2;

      // Handle lists
      if (trimmedLine.startsWith('- ')) {
        const value = trimmedLine.substring(2).trim();
        if (Array.isArray(currentSection)) {
          this.parseYamlValue(value, currentSection);
        }
        continue;
      }

      // Handle key-value pairs
      if (trimmedLine.includes(':')) {
        const [key, value] = trimmedLine.split(':').map((s) => s.trim());

        // Adjust stack based on indentation
        while (
          stack.length > 0 &&
          stack[stack.length - 1].level >= indentation
        ) {
          stack.pop();
        }

        currentSection =
          stack.length > 0 ? stack[stack.length - 1].obj : result;

        if (!value) {
          // Nested object
          const nestedObj: any = {};
          currentSection[key] = nestedObj;
          stack.push({ obj: nestedObj, level: indentation });
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // Array
          currentSection[key] = this.parseYamlArray(value);
        } else {
          // Value
          currentSection[key] = this.parseYamlValue(value);
        }
      }
    }

    return result;
  }

  /**
   * Parse YAML array
   *
   * @param arrayString Array string like "[item1, item2]"
   * @returns Parsed array
   */
  private parseYamlArray(arrayString: string): any[] {
    const content = arrayString.slice(1, -1);
    return content.split(',').map((item) => this.parseYamlValue(item.trim()));
  }

  /**
   * Parse YAML value
   *
   * @param value Value to parse
   * @param array Optional array to push to
   * @returns Parsed value
   */
  private parseYamlValue(value: string, array?: any[]): any {
    value = value.trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse booleans
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numbers
    if (!isNaN(Number(value)) && value !== '') {
      return Number(value);
    }

    // Add to array if provided
    if (array) {
      array.push(value);
    }

    return value;
  }

  /**
   * Parse skills from various formats
   *
   * @param skills Skills data
   * @returns Formatted skills array
   */
  private parseSkills(
    skills: any,
  ): Array<{ category: string; skills: string[] }> {
    const result: Array<{ category: string; skills: string[] }> = [];

    if (Array.isArray(skills)) {
      for (const skill of skills) {
        if (typeof skill === 'string') {
          result.push({ category: skill, skills: [skill] });
        } else if (skill.name) {
          result.push({
            category: skill.name,
            skills: skill.keywords || skill.skills || [skill.name],
          });
        }
      }
    }

    return result;
  }
}
