import { Injectable } from '@nestjs/common';
import { z } from 'zod';

/**
 * CV Data Validation Schema
 * Represents the standard structure for parsed CV data
 */
export const CVDataSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
    website: z.string().url().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }),
  experience: z
    .array(
      z.object({
        company: z.string(),
        position: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        area: z.string().optional(),
        studyType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        score: z.string().optional(),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        category: z.string(),
        skills: z.array(z.string()),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        url: z.string().url().optional(),
        technologies: z.array(z.string()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().optional(),
        issueDate: z.string().optional(),
        expirationDate: z.string().optional(),
        credentialUrl: z.string().optional(),
      }),
    )
    .default([]),
  languages: z
    .array(
      z.object({
        language: z.string(),
        proficiency: z.enum(['Elementary', 'Limited', 'Professional', 'Full Professional', 'Native']).optional(),
      }),
    )
    .default([]),
  volunteer: z
    .array(
      z.object({
        organization: z.string(),
        position: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  publications: z
    .array(
      z.object({
        name: z.string(),
        publisher: z.string().optional(),
        releaseDate: z.string().optional(),
        url: z.string().optional(),
        summary: z.string().optional(),
      }),
    )
    .default([]),
  awards: z
    .array(
      z.object({
        title: z.string(),
        date: z.string().optional(),
        awarder: z.string().optional(),
        summary: z.string().optional(),
      }),
    )
    .default([]),
});

export type CVData = z.infer<typeof CVDataSchema>;

/**
 * Parser Result Interface
 */
export interface IParserResult {
  success: boolean;
  data?: CVData;
  errors: string[];
  warnings: string[];
  metadata: {
    parserType: string;
    parseTime: number;
    dataQuality: number; // 0-100
  };
}

/**
 * Parser Metadata Interface
 */
export interface IParserMetadata {
  name: string;
  type: string;
  version: string;
  supportedFormats: string[];
  supportedSections: string[];
  description: string;
}

/**
 * Abstract Base Parser Class
 *
 * Provides common functionality for all CV parsers
 * Includes validation, error handling, and data transformation
 */
@Injectable()
export abstract class BaseParser {
  /**
   * Parser metadata
   */
  abstract metadata: IParserMetadata;

  /**
   * Parse CV data from source
   * To be implemented by concrete parsers
   *
   * @param input Input data (file content, string, object, etc.)
   * @param options Parse options
   * @returns Parse result with data and validation info
   */
  abstract parseRaw(input: any, options?: Record<string, any>): Promise<IParserResult>;

  /**
   * Parse and validate CV data
   *
   * @param input Input data
   * @param options Parse options
   * @returns Validated CV data
   */
  async parse(input: any, options?: Record<string, any>): Promise<IParserResult> {
    const startTime = Date.now();

    try {
      const result = await this.parseRaw(input, options);
      const parseTime = Date.now() - startTime;

      // Validate parsed data
      if (result.success && result.data) {
        const validationResult = this.validateCVData(result.data);

        return {
          success: validationResult.success,
          data: result.data,
          errors: [...result.errors, ...validationResult.errors],
          warnings: [...result.warnings, ...validationResult.warnings],
          metadata: {
            parserType: this.metadata.type,
            parseTime,
            dataQuality: this.calculateDataQuality(result.data),
          },
        };
      }

      return {
        ...result,
        metadata: {
          parserType: this.metadata.type,
          parseTime,
          dataQuality: 0,
        },
      };
    } catch (error) {
      const parseTime = Date.now() - startTime;

      return {
        success: false,
        errors: [
          `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings: [],
        metadata: {
          parserType: this.metadata.type,
          parseTime,
          dataQuality: 0,
        },
      };
    }
  }

  /**
   * Validate CV data against schema
   *
   * @param data CV data to validate
   * @returns Validation result
   */
  protected validateCVData(data: any): {
    success: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const validated = CVDataSchema.parse(data);

      // Additional validation checks
      if (!validated.personalInfo?.fullName) {
        errors.push('Personal info: Full name is required');
      }

      if (!validated.personalInfo?.email) {
        errors.push('Personal info: Email is required');
      }

      if (
        !validated.experience ||
        validated.experience.length === 0
      ) {
        warnings.push('No work experience found');
      }

      if (
        !validated.education ||
        validated.education.length === 0
      ) {
        warnings.push('No education found');
      }

      if (!validated.skills || validated.skills.length === 0) {
        warnings.push('No skills found');
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors.push(`${path}: ${err.message}`);
        });
      } else {
        errors.push(
          `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return {
        success: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Calculate data quality score (0-100)
   * Higher score means more complete CV
   *
   * @param data CV data
   * @returns Quality score
   */
  protected calculateDataQuality(data: CVData): number {
    let score = 0;
    let maxScore = 0;

    // Personal info scoring
    maxScore += 40;
    if (data.personalInfo.fullName) score += 10;
    if (data.personalInfo.email) score += 10;
    if (data.personalInfo.phone) score += 5;
    if (data.personalInfo.location) score += 5;
    if (data.personalInfo.summary) score += 10;

    // Experience scoring
    maxScore += 20;
    if (data.experience && data.experience.length > 0) {
      score += Math.min(data.experience.length * 5, 20);
    }

    // Education scoring
    maxScore += 15;
    if (data.education && data.education.length > 0) {
      score += Math.min(data.education.length * 5, 15);
    }

    // Skills scoring
    maxScore += 15;
    if (data.skills && data.skills.length > 0) {
      score += Math.min(data.skills.length * 3, 15);
    }

    // Additional sections
    maxScore += 10;
    if (data.projects && data.projects.length > 0) score += 3;
    if (data.certifications && data.certifications.length > 0) score += 3;
    if (data.languages && data.languages.length > 0) score += 2;
    if (data.volunteer && data.volunteer.length > 0) score += 1;
    if (data.publications && data.publications.length > 0) score += 1;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Normalize date formats to ISO string
   *
   * @param dateStr Date string
   * @returns Normalized ISO date string
   */
  protected normalizeDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;

    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
      /^(\d{4})$/, // YYYY only
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else if (format === formats[1]) {
          return `${match[3]}-${match[1]}-${match[2]}`;
        } else {
          return `${match[1]}-01-01`;
        }
      }
    }

    return dateStr;
  }

  /**
   * Clean and normalize text
   *
   * @param text Text to clean
   * @returns Cleaned text
   */
  protected cleanText(text: string | undefined): string | undefined {
    if (!text) return undefined;

    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\n\r\t]/g, ' ');
  }

  /**
   * Get metadata
   *
   * @returns Parser metadata
   */
  getMetadata(): IParserMetadata {
    return this.metadata;
  }

  /**
   * Get supported formats
   *
   * @returns Array of supported formats
   */
  getSupportedFormats(): string[] {
    return this.metadata.supportedFormats;
  }

  /**
   * Get supported sections
   *
   * @returns Array of supported sections
   */
  getSupportedSections(): string[] {
    return this.metadata.supportedSections;
  }

  /**
   * Check if parser supports format
   *
   * @param format Format to check
   * @returns True if format is supported
   */
  supportsFormat(format: string): boolean {
    return this.metadata.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Check if parser supports section
   *
   * @param section Section to check
   * @returns True if section is supported
   */
  supportsSection(section: string): boolean {
    return this.metadata.supportedSections.includes(section.toLowerCase());
  }
}
