import { Injectable } from '@nestjs/common';
import { BaseParser, CVData, IParserMetadata, IParserResult } from './base.parser';

/**
 * LinkedIn CSV Parser
 *
 * Parses CV data from LinkedIn CSV export format
 * LinkedIn provides CV data export in a specific CSV structure
 *
 * Column headers:
 * - First Name, Last Name, Email Address, Phone Number, Headline, Location
 * - For experience: Company, Position, Start Date, End Date, Description
 * - For education: School, Field of Study, Start Date, End Date, Grade
 * - For skills: Skill, Endorsement Count
 */
@Injectable()
export class LinkedInParser extends BaseParser {
  metadata: IParserMetadata = {
    name: 'LinkedIn Parser',
    type: 'linkedin',
    version: '1.0.0',
    supportedFormats: ['csv'],
    supportedSections: [
      'personalInfo',
      'experience',
      'education',
      'skills',
      'certifications',
      'languages',
    ],
    description: 'Parses CV data from LinkedIn CSV export format',
  };

  /**
   * Parse LinkedIn CSV format
   *
   * @param input CSV string or object array
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
      // Parse CSV if string
      let records: any[] = input;
      if (typeof input === 'string') {
        try {
          records = this.parseLinkedInCSV(input);
        } catch (parseError) {
          return {
            success: false,
            errors: [
              `Invalid LinkedIn CSV format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
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

      if (!records || records.length === 0) {
        return {
          success: false,
          errors: ['No data found in LinkedIn CSV'],
          warnings: [],
          metadata: {
            parserType: this.metadata.type,
            parseTime: 0,
            dataQuality: 0,
          },
        };
      }

      // Extract personal info (usually first row has profile info)
      const profileRecord = records[0];
      const personalInfo = {
        fullName: `${profileRecord['First Name'] || ''} ${
          profileRecord['Last Name'] || ''
        }`.trim(),
        email: profileRecord['Email Address'] || '',
        phone: profileRecord['Phone Number'],
        location: profileRecord['Location'],
        summary: profileRecord['Headline'],
        website: undefined,
        linkedin: undefined,
        github: undefined,
      };

      if (!personalInfo.fullName) {
        errors.push('First Name and Last Name are required');
      }
      if (!personalInfo.email) {
        warnings.push('Email address not found in LinkedIn export');
      }

      // Extract work experience
      const experience: any[] = [];
      const experienceRecords = records.filter(
        (r) => r['Position'] && r['Company'],
      );

      for (const record of experienceRecords) {
        experience.push({
          company: record['Company'] || '',
          position: record['Position'] || '',
          startDate: this.normalizeLinkedInDate(record['Start Date']) || '',
          endDate: record['End Date']
            ? this.normalizeLinkedInDate(record['End Date'])
            : undefined,
          description: this.cleanText(record['Description']),
          highlights: [],
        });
      }

      if (experience.length === 0) {
        warnings.push('No work experience found in LinkedIn export');
      }

      // Extract education
      const education: any[] = [];
      const educationRecords = records.filter((r) => r['School']);

      for (const record of educationRecords) {
        education.push({
          institution: record['School'] || '',
          area: record['Field of Study'],
          studyType: undefined,
          startDate: this.normalizeLinkedInDate(record['Start Date']),
          endDate: record['End Date']
            ? this.normalizeLinkedInDate(record['End Date'])
            : undefined,
          score: record['Grade'],
        });
      }

      if (education.length === 0) {
        warnings.push('No education found in LinkedIn export');
      }

      // Extract skills
      const skills: any[] = [];
      const skillsRecords = records.filter((r) => r['Skill']);

      if (skillsRecords.length > 0) {
        const skillMap = new Map<string, string[]>();

        for (const record of skillsRecords) {
          const skill = record['Skill'];
          if (skill) {
            if (!skillMap.has('Technical')) {
              skillMap.set('Technical', []);
            }
            skillMap.get('Technical')!.push(skill);
          }
        }

        for (const [category, skillList] of skillMap.entries()) {
          skills.push({ category, skills: skillList });
        }
      }

      if (skills.length === 0) {
        warnings.push('No skills found in LinkedIn export');
      }

      // Extract certifications
      const certifications: any[] = [];
      const certRecords = records.filter((r) => r['License/Certificate']);

      for (const record of certRecords) {
        certifications.push({
          name: record['License/Certificate'] || '',
          issuer: record['Issuing Organization'],
          issueDate: this.normalizeLinkedInDate(record['Issue Date']),
          expirationDate: record['Expiration Date']
            ? this.normalizeLinkedInDate(record['Expiration Date'])
            : undefined,
          credentialUrl: record['Credential URL'],
        });
      }

      // Extract languages
      const languages: any[] = [];
      const langRecords = records.filter((r) => r['Language']);

      for (const record of langRecords) {
        languages.push({
          language: record['Language'] || '',
          proficiency: record['Proficiency'],
        });
      }

      const cvData: CVData = {
        personalInfo,
        experience,
        education,
        skills,
        projects: [],
        certifications,
        languages,
        volunteer: [],
        publications: [],
        awards: [],
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
   * Parse LinkedIn CSV format
   *
   * @param csvString CSV string
   * @returns Parsed records array
   */
  private parseLinkedInCSV(csvString: string): any[] {
    const lines = csvString.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return [];
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);

    // Parse data rows
    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const record: any = {};

      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || '';
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Parse a single CSV line
   * Handles quoted values with commas
   *
   * @param line CSV line
   * @returns Array of values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Normalize LinkedIn date format
   * LinkedIn uses "Jan 2020" or "January 2020" format
   *
   * @param dateStr Date string
   * @returns Normalized ISO date
   */
  private normalizeLinkedInDate(
    dateStr: string | undefined,
  ): string | undefined {
    if (!dateStr) return undefined;

    dateStr = dateStr.trim();

    const monthMap: Record<string, string> = {
      jan: '01',
      january: '01',
      feb: '02',
      february: '02',
      mar: '03',
      march: '03',
      apr: '04',
      april: '04',
      may: '05',
      jun: '06',
      june: '06',
      jul: '07',
      july: '07',
      aug: '08',
      august: '08',
      sep: '09',
      september: '09',
      oct: '10',
      october: '10',
      nov: '11',
      november: '11',
      dec: '12',
      december: '12',
    };

    const parts = dateStr.split(/\s+/);
    if (parts.length === 2) {
      const month = monthMap[parts[0].toLowerCase()];
      const year = parts[1];

      if (month && year) {
        return `${year}-${month}-01`;
      }
    } else if (parts.length === 1) {
      // Just year
      return `${parts[0]}-01-01`;
    }

    return dateStr;
  }
}
