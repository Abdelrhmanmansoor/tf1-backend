import { Injectable } from '@nestjs/common';
import { BaseParser, CVData, IParserMetadata, IParserResult } from './base.parser';

/**
 * JSON Resume Parser
 *
 * Parses CV data from JSON Resume format (https://jsonresume.org/)
 * This is the standard JSON format supported by JSON Resume CLI
 *
 * Example JSON Resume format:
 * {
 *   "basics": {
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "+1234567890",
 *     "location": "New York, USA"
 *   },
 *   "work": [{ "company": "...", "position": "...", "startDate": "..." }],
 *   "education": [{ "institution": "...", "area": "...", ... }],
 *   "skills": [{ "name": "...", "level": "...", "keywords": [...] }],
 *   ...
 * }
 */
@Injectable()
export class JsonResumeParser extends BaseParser {
  metadata: IParserMetadata = {
    name: 'JSON Resume Parser',
    type: 'json-resume',
    version: '1.0.0',
    supportedFormats: ['json'],
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
    description:
      'Parses CV data from JSON Resume format (https://jsonresume.org/)',
  };

  /**
   * Parse JSON Resume format
   *
   * @param input JSON string or object
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
      // Parse JSON if string
      let resume: any = input;
      if (typeof input === 'string') {
        try {
          resume = JSON.parse(input);
        } catch (parseError) {
          return {
            success: false,
            errors: [
              `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
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
        website: basics.url,
        linkedin: this.extractLinkedInUrl(basics.profiles),
        github: this.extractGitHubUrl(basics.profiles),
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
        description: this.cleanText(work.summary),
        highlights: work.highlights || [],
      }));

      if (experience.length === 0) {
        warnings.push('No work experience found in JSON Resume');
      }

      // Extract education
      const education = (resume.education || []).map((edu: any) => ({
        institution: edu.institution || '',
        area: edu.area || edu.studyType,
        studyType: edu.studyType,
        startDate: this.normalizeDate(edu.startDate),
        endDate: edu.endDate ? this.normalizeDate(edu.endDate) : undefined,
        score: edu.score,
      }));

      if (education.length === 0) {
        warnings.push('No education found in JSON Resume');
      }

      // Extract skills
      const skills = (resume.skills || []).map((skillGroup: any) => ({
        category: skillGroup.name || '',
        skills: skillGroup.keywords || [skillGroup.name] || [],
      }));

      if (skills.length === 0) {
        warnings.push('No skills found in JSON Resume');
      }

      // Extract projects
      const projects = (resume.projects || []).map((project: any) => ({
        name: project.name || '',
        description: this.cleanText(project.description),
        url: project.url,
        technologies: project.keywords || [],
        startDate: this.normalizeDate(project.startDate),
        endDate: project.endDate ? this.normalizeDate(project.endDate) : undefined,
      }));

      // Extract certifications
      const certifications = (resume.certificates || []).map(
        (cert: any) => ({
          name: cert.name || '',
          issuer: cert.issuer,
          issueDate: this.normalizeDate(cert.date),
          expirationDate: undefined,
          credentialUrl: cert.url,
        }),
      );

      // Extract languages
      const languages = (resume.languages || []).map((lang: any) => ({
        language: lang.language || '',
        proficiency: lang.fluency,
      }));

      // Extract volunteer experience
      const volunteer = (resume.volunteer || []).map((vol: any) => ({
        organization: vol.organization || '',
        position: vol.position || '',
        startDate: this.normalizeDate(vol.startDate),
        endDate: vol.endDate ? this.normalizeDate(vol.endDate) : undefined,
        description: this.cleanText(vol.summary),
      }));

      // Extract publications
      const publications = (resume.publications || []).map((pub: any) => ({
        name: pub.name || '',
        publisher: pub.publisher,
        releaseDate: this.normalizeDate(pub.releaseDate),
        url: pub.url,
        summary: this.cleanText(pub.summary),
      }));

      // Extract awards
      const awards = (resume.awards || []).map((award: any) => ({
        title: award.title || '',
        date: this.normalizeDate(award.date),
        awarder: award.awarder,
        summary: this.cleanText(award.summary),
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
   * Extract LinkedIn URL from profiles array
   *
   * @param profiles Profiles array
   * @returns LinkedIn URL or undefined
   */
  private extractLinkedInUrl(
    profiles: Array<{ network?: string; url?: string }> | undefined,
  ): string | undefined {
    if (!profiles) return undefined;

    const linkedInProfile = profiles.find(
      (p) => p.network?.toLowerCase() === 'linkedin',
    );
    return linkedInProfile?.url;
  }

  /**
   * Extract GitHub URL from profiles array
   *
   * @param profiles Profiles array
   * @returns GitHub URL or undefined
   */
  private extractGitHubUrl(
    profiles: Array<{ network?: string; url?: string }> | undefined,
  ): string | undefined {
    if (!profiles) return undefined;

    const githubProfile = profiles.find(
      (p) => p.network?.toLowerCase() === 'github',
    );
    return githubProfile?.url;
  }
}
