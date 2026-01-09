/**
 * Template Registry Service
 * Manages all available CV templates
 * 
 * Features:
 * - Template registration and management
 * - Template lookup and retrieval
 * - Template validation
 * - Template metadata management
 */

import { Injectable } from '@nestjs/common';
import { BaseTemplate, ITemplate } from './base.template';
import { AwesomeCVTemplate } from './awesome-cv.template';
import { ModernCVTemplate } from './modern-cv.template';
import { ClassicTemplate } from './classic.template';
import { MinimalTemplate } from './minimal.template';
import { CreativeTemplate } from './creative.template';
import { SimpleTemplate } from './simple.template';
import { ElegantTemplate } from './elegant.template';
import { TechTemplate } from './tech.template';
import { ExecutiveTemplate } from './executive.template';

@Injectable()
export class TemplateRegistry {
  private templates: Map<string, BaseTemplate> = new Map();
  private templateMetadata: Map<string, ITemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register all default templates
   */
  private registerDefaultTemplates(): void {
    const defaultTemplates = [
      new AwesomeCVTemplate(),
      new ModernCVTemplate(),
      new ClassicTemplate(),
      new MinimalTemplate(),
      new CreativeTemplate(),
      new SimpleTemplate(),
      new ElegantTemplate(),
      new TechTemplate(),
      new ExecutiveTemplate(),
    ];

    defaultTemplates.forEach((template) => {
      this.register(template);
    });
  }

  /**
   * Register a new template
   */
  register(template: BaseTemplate): void {
    const metadata = template.getMetadata();
    this.templates.set(metadata.id, template);
    this.templateMetadata.set(metadata.id, metadata);
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): BaseTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(templateId: string): ITemplate | undefined {
    return this.templateMetadata.get(templateId);
  }

  /**
   * Get all registered templates
   */
  getAllTemplates(): ITemplate[] {
    return Array.from(this.templateMetadata.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(
    category: 'modern' | 'classic' | 'creative' | 'minimal'
  ): ITemplate[] {
    return this.getAllTemplates().filter((t) => t.category === category);
  }

  /**
   * Get templates by format
   */
  getTemplatesByFormat(format: 'latex' | 'html' | 'docx'): ITemplate[] {
    return this.getAllTemplates().filter((t) => t.format === format);
  }

  /**
   * Check if template exists
   */
  exists(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Get template with validation
   */
  getValidTemplate(templateId: string): BaseTemplate {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
    return template;
  }

  /**
   * Get default template
   */
  getDefaultTemplate(): BaseTemplate {
    return this.getValidTemplate('awesome-cv');
  }

  /**
   * List all template IDs
   */
  getTemplateIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    byFormat: Record<string, number>;
  } {
    const templates = this.getAllTemplates();
    const stats = {
      total: templates.length,
      byCategory: {} as Record<string, number>,
      byFormat: {} as Record<string, number>,
    };

    templates.forEach((template) => {
      // Count by category
      stats.byCategory[template.category] =
        (stats.byCategory[template.category] || 0) + 1;

      // Count by format
      stats.byFormat[template.format] =
        (stats.byFormat[template.format] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate template supports sections
   */
  validateSections(
    templateId: string,
    sections: string[]
  ): { valid: boolean; unsupported: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, unsupported: sections };
    }

    const supportedSections = template.getSections();
    const unsupported = sections.filter(
      (section) => !supportedSections.includes(section)
    );

    return {
      valid: unsupported.length === 0,
      unsupported,
    };
  }

  /**
   * Get templates sorted by popularity (default sort)
   */
  getPopularTemplates(limit?: number): ITemplate[] {
    const templates = this.getAllTemplates().sort((a, b) => {
      // Default order: Awesome CV, Modern CV, Classic, etc.
      const order = [
        'awesome-cv',
        'modern-cv',
        'classic',
        'elegant',
        'tech',
        'creative',
        'simple',
        'minimal',
        'executive',
      ];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });

    return limit ? templates.slice(0, limit) : templates;
  }

  /**
   * Search templates by keyword
   */
  searchTemplates(keyword: string): ITemplate[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllTemplates().filter(
      (template) =>
        template.name.toLowerCase().includes(lowerKeyword) ||
        template.displayName.toLowerCase().includes(lowerKeyword) ||
        template.description.toLowerCase().includes(lowerKeyword) ||
        template.category.toLowerCase().includes(lowerKeyword)
    );
  }
}

export default TemplateRegistry;
