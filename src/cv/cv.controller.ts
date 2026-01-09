import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CVService } from './cv.service';
import { CreateCVDto, UpdateCVDto, ExportCVDto, ImportCVDto } from './dtos';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

/**
 * CV Controller
 *
 * REST API endpoints for CV management:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Import CVs from files
 * - Export CVs in different formats
 * - Template and parser management
 * - Public CV sharing
 */
@Controller('api/v1/cv')
@UseGuards(JwtAuthGuard)
export class CVController {
  constructor(private cvService: CVService) {}

  // ═══════════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Create a new CV
   *
   * POST /api/v1/cv
   *
   * @param userId Current user ID
   * @param dto CV data
   * @returns Created CV
   */
  @Post()
  async createCV(
    @CurrentUser() userId: string,
    @Body() dto: CreateCVDto,
  ): Promise<any> {
    return this.cvService.createCV(userId, dto.data, dto.templateId);
  }

  /**
   * Get CV by ID
   *
   * GET /api/v1/cv/:id
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @returns CV data
   */
  @Get(':id')
  async getCV(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
  ): Promise<any> {
    return this.cvService.getCV(cvId, userId);
  }

  /**
   * Get all CVs for current user
   *
   * GET /api/v1/cv
   *
   * @param userId Current user ID
   * @param limit Results limit
   * @param offset Results offset
   * @returns Array of CVs
   */
  @Get()
  async getUserCVs(
    @CurrentUser() userId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ): Promise<any> {
    return this.cvService.getUserCVs(userId, limit, offset);
  }

  /**
   * Update CV
   *
   * PUT /api/v1/cv/:id
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @param dto Updated CV data
   * @returns Updated CV
   */
  @Put(':id')
  async updateCV(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateCVDto,
  ): Promise<any> {
    return this.cvService.updateCV(cvId, userId, dto.data);
  }

  /**
   * Delete CV
   *
   * DELETE /api/v1/cv/:id
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @returns Deletion confirmation
   */
  @Delete(':id')
  async deleteCV(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
  ): Promise<any> {
    return this.cvService.deleteCV(cvId, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IMPORT/EXPORT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Import CV from file
   *
   * POST /api/v1/cv/import
   * Supports: JSON, YAML, LinkedIn CSV
   *
   * @param userId Current user ID
   * @param file Uploaded file
   * @param format File format (auto-detected if not provided)
   * @returns Created CV from imported data
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCV(
    @CurrentUser() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('format') format?: string,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Detect format from file extension if not provided
    const detectedFormat = format || this.detectFormat(file.originalname);

    const fileContent = file.buffer.toString('utf-8');

    return this.cvService.importCV(
      userId,
      fileContent,
      detectedFormat,
      file.originalname,
    );
  }

  /**
   * Export CV
   *
   * GET /api/v1/cv/:id/export
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @param format Export format (pdf, html, json)
   * @param res Response object
   */
  @Get(':id/export')
  async exportCV(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
    @Query('format') format: 'pdf' | 'html' | 'json' = 'pdf',
    @Res() res: Response,
  ): Promise<void> {
    const exported = await this.cvService.exportCV(cvId, userId, format);

    switch (format) {
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="resume.pdf"',
        );
        res.send(exported);
        break;

      case 'html':
        res.setHeader('Content-Type', 'text/html');
        res.send(exported);
        break;

      case 'json':
        res.json(exported);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get available templates
   *
   * GET /api/v1/cv/templates
   *
   * @returns Array of available templates
   */
  @Get('templates')
  async getTemplates(): Promise<any> {
    return this.cvService.getTemplates();
  }

  /**
   * Change CV template
   *
   * PUT /api/v1/cv/:id/template
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @param templateId New template ID
   * @returns Updated CV
   */
  @Put(':id/template')
  async changeTemplate(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
    @Body('templateId') templateId: string,
  ): Promise<any> {
    return this.cvService.changeTemplate(cvId, userId, templateId);
  }

  /**
   * Render CV to PDF
   *
   * GET /api/v1/cv/:id/render/pdf
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @param templateId Optional template override
   * @param res Response object
   */
  @Get(':id/render/pdf')
  async renderPDF(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
    @Query('template') templateId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const pdf = await this.cvService.renderToPDF(cvId, userId, templateId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(pdf);
  }

  /**
   * Render CV to HTML
   *
   * GET /api/v1/cv/:id/render/html
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @param templateId Optional template override
   * @returns HTML string
   */
  @Get(':id/render/html')
  async renderHTML(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
    @Query('template') templateId?: string,
  ): Promise<string> {
    return this.cvService.renderToHTML(cvId, userId, templateId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VERSION & HISTORY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get CV versions
   *
   * GET /api/v1/cv/:id/versions
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @returns Array of versions
   */
  @Get(':id/versions')
  async getVersions(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
  ): Promise<any> {
    return this.cvService.getCVVersions(cvId, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLISHING & SHARING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Publish CV (make it public)
   *
   * POST /api/v1/cv/:id/publish
   *
   * @param cvId CV ID
   * @param userId Current user ID
   * @returns Public URL
   */
  @Post(':id/publish')
  async publishCV(
    @Param('id') cvId: string,
    @CurrentUser() userId: string,
  ): Promise<any> {
    return this.cvService.publishCV(cvId, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (No authentication required)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get public CV
   *
   * GET /api/v1/cv/public/:token
   * No authentication required
   *
   * @param publicToken Public token
   * @returns Public CV data
   */
  @Get('public/:token')
  async getPublicCV(@Param('token') publicToken: string): Promise<any> {
    return this.cvService.getPublicCV(publicToken);
  }

  /**
   * Render public CV to PDF
   *
   * GET /api/v1/cv/public/:token/pdf
   * No authentication required
   *
   * @param publicToken Public token
   * @param res Response object
   */
  @Get('public/:token/pdf')
  async getPublicCVPDF(
    @Param('token') publicToken: string,
    @Res() res: Response,
  ): Promise<void> {
    const cv = await this.cvService.getPublicCV(publicToken);
    // Note: Rendering for public CV needs separate implementation
    // For now, return the data
    res.json(cv);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INFORMATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get available parsers
   *
   * GET /api/v1/cv/info/parsers
   *
   * @returns Parser information
   */
  @Get('info/parsers')
  async getParsers(): Promise<any> {
    return this.cvService.getParsers();
  }

  /**
   * Get CV statistics for user
   *
   * GET /api/v1/cv/stats
   *
   * @param userId Current user ID
   * @returns Statistics
   */
  @Get('stats')
  async getStatistics(@CurrentUser() userId: string): Promise<any> {
    return this.cvService.getCVStatistics(userId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Detect file format from filename
   *
   * @param filename File name
   * @returns Detected format
   */
  private detectFormat(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'csv':
        return 'csv';
      default:
        return 'json'; // Default to JSON
    }
  }
}
