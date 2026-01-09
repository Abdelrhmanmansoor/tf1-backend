import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ParserRegistry } from 'src/cv/parsers';
import { TemplateRegistry } from 'src/cv/templates';
import { TemplateRenderingService } from 'src/cv/templates';
import { CVData } from 'src/cv/parsers';
import * as crypto from 'crypto';

/**
 * CV Service
 *
 * Handles all CV-related business logic:
 * - Create, read, update, delete CVs
 * - Import CVs from files
 * - Export CVs in different formats
 * - Manage CV versions
 * - Generate PDF/HTML output
 */
@Injectable()
export class CVService {
  constructor(
    private prisma: PrismaService,
    private parserRegistry: ParserRegistry,
    private templateRegistry: TemplateRegistry,
    private renderingService: TemplateRenderingService,
  ) {}

  /**
   * Create a new CV
   *
   * @param userId User ID
   * @param data CV data
   * @param templateId Optional template ID
   * @returns Created CV
   */
  async createCV(
    userId: string,
    data: CVData,
    templateId?: string,
  ): Promise<any> {
    try {
      // Validate CV data
      if (!data.personalInfo?.fullName || !data.personalInfo?.email) {
        throw new BadRequestException(
          'Personal info with name and email is required',
        );
      }

      const cv = await this.prisma.cV.create({
        data: {
          userId,
          title: `${data.personalInfo.fullName}'s CV`,
          data: JSON.stringify(data),
          templateId: templateId || 'awesome-cv',
          version: 1,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return this.formatCVResponse(cv);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to create CV: ${error.message}`);
    }
  }

  /**
   * Get CV by ID
   *
   * @param cvId CV ID
   * @param userId User ID (for authorization)
   * @returns CV data
   */
  async getCV(cvId: string, userId: string): Promise<any> {
    const cv = await this.prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    if (!cv) {
      throw new NotFoundException('CV not found');
    }

    return this.formatCVResponse(cv);
  }

  /**
   * Get all CVs for user
   *
   * @param userId User ID
   * @param limit Results limit
   * @param offset Results offset
   * @returns Array of CVs
   */
  async getUserCVs(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [cvs, total] = await Promise.all([
      this.prisma.cV.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cV.count({ where: { userId } }),
    ]);

    return {
      data: cvs.map((cv) => this.formatCVResponse(cv)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update CV
   *
   * @param cvId CV ID
   * @param userId User ID
   * @param data Updated CV data
   * @returns Updated CV
   */
  async updateCV(cvId: string, userId: string, data: CVData): Promise<any> {
    const cv = await this.prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    if (!cv) {
      throw new NotFoundException('CV not found');
    }

    const updated = await this.prisma.cV.update({
      where: { id: cvId },
      data: {
        data: JSON.stringify(data),
        version: cv.version + 1,
        updatedAt: new Date(),
      },
    });

    return this.formatCVResponse(updated);
  }

  /**
   * Delete CV
   *
   * @param cvId CV ID
   * @param userId User ID
   * @returns Deletion confirmation
   */
  async deleteCV(cvId: string, userId: string): Promise<{ message: string }> {
    const cv = await this.prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    if (!cv) {
      throw new NotFoundException('CV not found');
    }

    await this.prisma.cV.delete({ where: { id: cvId } });

    return { message: 'CV deleted successfully' };
  }

  /**
   * Import CV from file
   *
   * @param userId User ID
   * @param fileContent File content
   * @param fileFormat File format (json, yaml, csv)
   * @param fileName Original file name
   * @returns Created CV from imported data
   */
  async importCV(
    userId: string,
    fileContent: string,
    fileFormat: string,
    fileName: string,
  ): Promise<any> {
    try {
      // Parse file content
      const parseResult = await this.parserRegistry.parse(
        fileContent,
        fileFormat,
      );

      if (!parseResult.success) {
        throw new BadRequestException(
          `Parse error: ${parseResult.errors.join(', ')}`,
        );
      }

      // Create CV with parsed data
      const cv = await this.createCV(
        userId,
        parseResult.data,
        'awesome-cv',
      );

      // Store import metadata
      await this.prisma.import.create({
        data: {
          cvId: cv.id,
          userId,
          fileName,
          format: fileFormat,
          quality: parseResult.metadata.dataQuality,
          warnings: parseResult.warnings,
          importedAt: new Date(),
        },
      });

      return {
        ...cv,
        quality: parseResult.metadata.dataQuality,
        warnings: parseResult.warnings,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Render CV to PDF
   *
   * @param cvId CV ID
   * @param userId User ID
   * @param templateId Optional template override
   * @returns PDF buffer
   */
  async renderToPDF(
    cvId: string,
    userId: string,
    templateId?: string,
  ): Promise<Buffer> {
    const cv = await this.getCV(cvId, userId);
    const template = templateId || cv.templateId;

    try {
      const pdf = await this.renderingService.renderToPDF(
        template,
        JSON.parse(cv.data),
      );

      // Log render event
      await this.prisma.event.create({
        data: {
          cvId,
          userId,
          type: 'RENDER_PDF',
          templateId: template,
          timestamp: new Date(),
        },
      });

      return pdf;
    } catch (error) {
      throw new BadRequestException(
        `PDF rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Render CV to HTML
   *
   * @param cvId CV ID
   * @param userId User ID
   * @param templateId Optional template override
   * @returns HTML string
   */
  async renderToHTML(
    cvId: string,
    userId: string,
    templateId?: string,
  ): Promise<string> {
    const cv = await this.getCV(cvId, userId);
    const template = templateId || cv.templateId;

    try {
      const html = await this.renderingService.renderToHTML(
        template,
        JSON.parse(cv.data),
      );

      // Log render event
      await this.prisma.event.create({
        data: {
          cvId,
          userId,
          type: 'RENDER_HTML',
          templateId: template,
          timestamp: new Date(),
        },
      });

      return html;
    } catch (error) {
      throw new BadRequestException(
        `HTML rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Export CV in specific format
   *
   * @param cvId CV ID
   * @param userId User ID
   * @param format Export format (pdf, html, json)
   * @returns Exported data
   */
  async exportCV(
    cvId: string,
    userId: string,
    format: 'pdf' | 'html' | 'json' = 'pdf',
  ): Promise<any> {
    const cv = await this.getCV(cvId, userId);

    switch (format) {
      case 'pdf':
        return await this.renderToPDF(cvId, userId);
      case 'html':
        return await this.renderToHTML(cvId, userId);
      case 'json':
        const cvData = JSON.parse(cv.data);
        await this.prisma.event.create({
          data: {
            cvId,
            userId,
            type: 'EXPORT_JSON',
            timestamp: new Date(),
          },
        });
        return cvData;
      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }

  /**
   * Change CV template
   *
   * @param cvId CV ID
   * @param userId User ID
   * @param newTemplateId New template ID
   * @returns Updated CV
   */
  async changeTemplate(
    cvId: string,
    userId: string,
    newTemplateId: string,
  ): Promise<any> {
    // Verify template exists
    if (!this.templateRegistry.hasParser(newTemplateId)) {
      throw new BadRequestException(`Template ${newTemplateId} not found`);
    }

    const cv = await this.prisma.cV.update({
      where: { id: cvId },
      data: {
        templateId: newTemplateId,
        updatedAt: new Date(),
      },
    });

    return this.formatCVResponse(cv);
  }

  /**
   * Get CV versions
   *
   * @param cvId CV ID
   * @param userId User ID
   * @returns Array of versions
   */
  async getCVVersions(cvId: string, userId: string): Promise<any[]> {
    const cv = await this.getCV(cvId, userId);

    // Get version history from events
    const events = await this.prisma.event.findMany({
      where: {
        cvId,
        type: 'CV_UPDATED',
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return events.map((event) => ({
      version: cv.version,
      timestamp: event.timestamp,
      type: 'update',
    }));
  }

  /**
   * Publish CV (make it public)
   *
   * @param cvId CV ID
   * @param userId User ID
   * @returns Public URL
   */
  async publishCV(cvId: string, userId: string): Promise<{ publicUrl: string }> {
    const cv = await this.prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    if (!cv) {
      throw new NotFoundException('CV not found');
    }

    const publicToken = crypto.randomBytes(16).toString('hex');

    await this.prisma.cV.update({
      where: { id: cvId },
      data: {
        isPublished: true,
        publicToken,
        publishedAt: new Date(),
      },
    });

    return {
      publicUrl: `/cv/public/${publicToken}`,
    };
  }

  /**
   * Get public CV
   *
   * @param publicToken Public token
   * @returns Public CV data
   */
  async getPublicCV(publicToken: string): Promise<any> {
    const cv = await this.prisma.cV.findFirst({
      where: {
        publicToken,
        isPublished: true,
      },
    });

    if (!cv) {
      throw new NotFoundException('CV not found or not published');
    }

    return this.formatCVResponse(cv);
  }

  /**
   * Get available templates
   *
   * @returns Array of templates
   */
  async getTemplates(): Promise<any[]> {
    return this.templateRegistry.getAllMetadata().map((meta) => ({
      id: meta.type,
      name: meta.name,
      description: meta.description,
      formats: meta.supportedFormats,
      sections: meta.supportedSections,
    }));
  }

  /**
   * Get available parsers
   *
   * @returns Parser information
   */
  async getParsers(): Promise<any> {
    return this.parserRegistry.getStatistics();
  }

  /**
   * Format CV response
   *
   * @param cv Raw CV from database
   * @returns Formatted CV response
   */
  private formatCVResponse(cv: any): any {
    return {
      id: cv.id,
      title: cv.title,
      templateId: cv.templateId,
      data: JSON.parse(cv.data),
      version: cv.version,
      isPublished: cv.isPublished,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
      publishedAt: cv.publishedAt,
    };
  }

  /**
   * Get CV statistics for user
   *
   * @param userId User ID
   * @returns Statistics
   */
  async getCVStatistics(userId: string): Promise<{
    totalCVs: number;
    publishedCVs: number;
    avgQuality: number;
    mostUsedTemplate: string;
    recentEvents: number;
  }> {
    const [totalCVs, publishedCVs, events] = await Promise.all([
      this.prisma.cV.count({ where: { userId } }),
      this.prisma.cV.count({ where: { userId, isPublished: true } }),
      this.prisma.event.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalCVs,
      publishedCVs,
      avgQuality: 85, // Can be calculated from imports
      mostUsedTemplate: 'awesome-cv', // Can be calculated from CVs
      recentEvents: events.length,
    };
  }
}
