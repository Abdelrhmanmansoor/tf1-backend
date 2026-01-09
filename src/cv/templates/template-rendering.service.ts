/**
 * Template Rendering Service
 * Handles rendering and exporting CV templates
 * 
 * Features:
 * - LaTeX to PDF conversion
 * - HTML rendering
 * - Theme application
 * - Multiple export formats
 */

import { Injectable } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { BaseTemplate } from './base.template';
import TemplateRegistry from './template.registry';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface RenderResult {
  success: boolean;
  format: string;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
}

@Injectable()
export class TemplateRenderingService {
  private browser: Browser | null = null;
  private renderTimeout = 30000; // 30 seconds

  constructor(private templateRegistry: TemplateRegistry) {
    this.initializeBrowser();
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (error) {
      console.error('Failed to initialize browser:', error);
    }
  }

  /**
   * Render CV to PDF
   */
  async renderToPDF(
    templateId: string,
    cvData: any,
    options: { filename?: string; saveDir?: string } = {}
  ): Promise<RenderResult> {
    try {
      // Get template
      const template = this.templateRegistry.getValidTemplate(templateId);

      // Validate data
      const validation = template.validateCVData(cvData);
      if (!validation.valid) {
        return {
          success: false,
          format: 'pdf',
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Ensure browser is ready
      if (!this.browser) {
        await this.initializeBrowser();
      }

      // Render template
      const htmlContent = await this.generateHTML(template, cvData);

      // Create PDF
      const page = await this.browser!.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0.5cm', bottom: '0.5cm', left: '0.5cm', right: '0.5cm' },
        timeout: this.renderTimeout,
      });

      await page.close();

      // Save to file if directory provided
      if (options.saveDir) {
        const filename = options.filename || `resume_${Date.now()}.pdf`;
        const filePath = path.join(options.saveDir, filename);

        // Create directory if not exists
        if (!fs.existsSync(options.saveDir)) {
          fs.mkdirSync(options.saveDir, { recursive: true });
        }

        fs.writeFileSync(filePath, pdfBuffer);

        return {
          success: true,
          format: 'pdf',
          filePath,
        };
      }

      return {
        success: true,
        format: 'pdf',
        buffer: pdfBuffer,
      };
    } catch (error) {
      return {
        success: false,
        format: 'pdf',
        error: `PDF rendering failed: ${error.message}`,
      };
    }
  }

  /**
   * Render CV to HTML
   */
  async renderToHTML(
    templateId: string,
    cvData: any,
    options: { filename?: string; saveDir?: string } = {}
  ): Promise<RenderResult> {
    try {
      const template = this.templateRegistry.getValidTemplate(templateId);

      // Validate data
      const validation = template.validateCVData(cvData);
      if (!validation.valid) {
        return {
          success: false,
          format: 'html',
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      const htmlContent = await this.generateHTML(template, cvData);

      if (options.saveDir) {
        const filename = options.filename || `resume_${Date.now()}.html`;
        const filePath = path.join(options.saveDir, filename);

        if (!fs.existsSync(options.saveDir)) {
          fs.mkdirSync(options.saveDir, { recursive: true });
        }

        fs.writeFileSync(filePath, htmlContent);

        return {
          success: true,
          format: 'html',
          filePath,
        };
      }

      return {
        success: true,
        format: 'html',
        buffer: Buffer.from(htmlContent),
      };
    } catch (error) {
      return {
        success: false,
        format: 'html',
        error: `HTML rendering failed: ${error.message}`,
      };
    }
  }

  /**
   * Generate HTML from template
   */
  private async generateHTML(template: BaseTemplate, cvData: any): Promise<string> {
    const css = template.cssSource || this.getDefaultCSS();
    const rendered = await template.render(cvData);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cvData.personalInfo?.name || 'Resume'}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  <div class="cv-container">
    ${rendered}
  </div>
</body>
</html>
    `;
  }

  /**
   * Get default CSS for templates
   */
  private getDefaultCSS(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background: white;
      }

      .cv-container {
        max-width: 8.5in;
        height: 11in;
        margin: 0 auto;
        padding: 0.5in;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }

      h1, h2, h3 {
        color: #1E40AF;
      }

      h2 {
        border-bottom: 2px solid #1E40AF;
        padding-bottom: 5px;
        margin-top: 15px;
        margin-bottom: 10px;
      }

      .entry {
        margin-bottom: 12px;
      }

      .entry-title {
        font-weight: 600;
        color: #1E40AF;
      }

      .entry-subtitle {
        font-style: italic;
        color: #666;
      }

      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .cv-container {
          max-width: 100%;
          height: 100%;
          box-shadow: none;
        }
      }
    `;
  }

  /**
   * Render to multiple formats
   */
  async renderToMultiple(
    templateId: string,
    cvData: any,
    formats: ('pdf' | 'html' | 'json')[] = ['pdf', 'html'],
    saveDir?: string
  ): Promise<Map<string, RenderResult>> {
    const results = new Map<string, RenderResult>();

    for (const format of formats) {
      switch (format) {
        case 'pdf':
          results.set('pdf', await this.renderToPDF(templateId, cvData, { saveDir }));
          break;
        case 'html':
          results.set('html', await this.renderToHTML(templateId, cvData, { saveDir }));
          break;
        case 'json':
          results.set('json', {
            success: true,
            format: 'json',
            buffer: Buffer.from(JSON.stringify(cvData, null, 2)),
          });
          break;
      }
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }
      return !!this.browser;
    } catch {
      return false;
    }
  }
}

export default TemplateRenderingService;
