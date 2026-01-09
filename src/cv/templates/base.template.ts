/**
 * Base Template Class
 * Abstract base class for all CV templates
 * 
 * Provides common functionality for all template implementations:
 * - LaTeX rendering
 * - PDF generation
 * - Theme application
 * - Export handling
 */

import { Prisma } from '@prisma/client';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface ITemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'modern' | 'classic' | 'creative' | 'minimal';
  format: 'latex' | 'html' | 'docx';
  version: string;
  defaultTheme: string;
}

export interface RenderOptions {
  theme?: string;
  format?: 'latex' | 'html' | 'pdf';
  colorScheme?: string;
  includePhoto?: boolean;
}

export abstract class BaseTemplate {
  /**
   * Template metadata
   */
  abstract readonly metadata: ITemplate;

  /**
   * Template LaTeX source
   */
  abstract readonly latexSource: string;

  /**
   * Template CSS (for HTML variant)
   */
  abstract readonly cssSource?: string;

  /**
   * Supported sections in this template
   */
  abstract readonly supportedSections: string[];

  /**
   * Template-specific configuration
   */
  protected config = {
    fontSize: 11,
    margin: '0.5in',
    paperSize: 'letterpaper',
    encoding: 'utf-8',
  };

  constructor() {
    // Register Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('dateFormat', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('monthYear', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    });

    Handlebars.registerHelper('years', (startDate: Date, endDate?: Date) => {
      if (!startDate) return '';
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      const years = Math.floor(
        (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : '0 months';
    });

    Handlebars.registerHelper('conditional', (
      value: any,
      operator: string,
      compare: any,
      options: any
    ) => {
      switch (operator) {
        case '===':
          return value === compare ? options.fn(this) : options.inverse(this);
        case '!==':
          return value !== compare ? options.fn(this) : options.inverse(this);
        case '>':
          return value > compare ? options.fn(this) : options.inverse(this);
        case '<':
          return value < compare ? options.fn(this) : options.inverse(this);
        case '>=':
          return value >= compare ? options.fn(this) : options.inverse(this);
        case '<=':
          return value <= compare ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('bold', (str: string) => {
      return new Handlebars.SafeString(`\\textbf{${str}}`);
    });

    Handlebars.registerHelper('italic', (str: string) => {
      return new Handlebars.SafeString(`\\textit{${str}}`);
    });

    Handlebars.registerHelper('join', (array: any[], separator: string) => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });
  }

  /**
   * Render template with CV data
   */
  async render(cvData: any, options: RenderOptions = {}): Promise<string> {
    try {
      // Compile template
      const template = Handlebars.compile(this.latexSource);

      // Prepare data
      const data = this.prepareData(cvData, options);

      // Render
      const rendered = template(data);

      return rendered;
    } catch (error) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Prepare and validate CV data before rendering
   */
  protected prepareData(cvData: any, options: RenderOptions): any {
    return {
      ...cvData,
      theme: options.theme || this.metadata.defaultTheme,
      colorScheme: options.colorScheme,
      currentDate: new Date().toLocaleDateString(),
      includePhoto: options.includePhoto !== false,
    };
  }

  /**
   * Validate CV data against template requirements
   */
  validateCVData(cvData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required sections
    if (!cvData.personalInfo) {
      errors.push('Personal information is required');
    }

    if (!cvData.experience || !Array.isArray(cvData.experience)) {
      errors.push('Experience section is required');
    }

    if (!cvData.education || !Array.isArray(cvData.education)) {
      errors.push('Education section is required');
    }

    // Check supported sections
    const cvSections = Object.keys(cvData || {});
    const unsupported = cvSections.filter(
      (section) => !this.supportedSections.includes(section)
    );

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get template metadata
   */
  getMetadata(): ITemplate {
    return this.metadata;
  }

  /**
   * Apply color scheme/theme
   */
  applyTheme(theme: string): string {
    const themeVariables: Record<string, Record<string, string>> = {
      blue: {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#60A5FA',
      },
      red: {
        primary: '#991B1B',
        secondary: '#DC2626',
        accent: '#F87171',
      },
      green: {
        primary: '#15803D',
        secondary: '#22C55E',
        accent: '#84CC16',
      },
      purple: {
        primary: '#6B21A8',
        secondary: '#A855F7',
        accent: '#D8B4FE',
      },
      gray: {
        primary: '#374151',
        secondary: '#6B7280',
        accent: '#9CA3AF',
      },
      black: {
        primary: '#000000',
        secondary: '#1F2937',
        accent: '#404040',
      },
      teal: {
        primary: '#0D9488',
        secondary: '#14B8A6',
        accent: '#2DD4BF',
      },
      orange: {
        primary: '#EA580C',
        secondary: '#F97316',
        accent: '#FDBA74',
      },
    };

    const colors = themeVariables[theme] || themeVariables.blue;
    let latex = this.latexSource;

    // Replace color variables
    Object.entries(colors).forEach(([key, value]) => {
      const regex = new RegExp(`\\${${key}}`, 'g');
      latex = latex.replace(regex, value);
    });

    return latex;
  }

  /**
   * Get template sections
   */
  getSections(): string[] {
    return this.supportedSections;
  }

  /**
   * Escape special LaTeX characters
   */
  protected escapeLaTeX(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[{}]/g, (char) => `\\${char}`)
      .replace(/[#$%&^_~]/g, (char) => `\\${char}`)
      .replace(/"/g, "''");
  }

  /**
   * Format date for LaTeX
   */
  protected formatDateLaTeX(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export default BaseTemplate;
