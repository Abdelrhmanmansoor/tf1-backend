let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  puppeteer = null;
}

const logger = require('../../../utils/logger');

/**
 * Professional PDF Service for CV/Resume Generation
 * Supports multiple templates with professional designs
 * Similar to major platforms (LinkedIn, Indeed, Zety, etc.)
 */
class PDFService {
  constructor() {
    this.templates = {
      standard: this.generateStandardTemplate.bind(this),
      modern: this.generateModernTemplate.bind(this),
      classic: this.generateClassicTemplate.bind(this),
      creative: this.generateCreativeTemplate.bind(this),
      minimal: this.generateMinimalTemplate.bind(this),
      executive: this.generateExecutiveTemplate.bind(this)
    };
  }

  /**
   * Generate PDF from CV data
   * @param {Object} cvData - CV data object
   * @param {Object} options - PDF generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(cvData, options = {}) {
    if (!puppeteer) {
      throw new Error(
        'Puppeteer is not installed. PDF generation is not available. ' +
        'Please install it using "npm install puppeteer".'
      );
    }

    const template = options.template || cvData.meta?.template || 'standard';
    const format = options.format || 'A4';
    
    logger.info('Generating PDF', { 
      template,
      format,
      hasData: !!cvData.personalInfo 
    });

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        timeout: 30000
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Generate HTML based on template
      const htmlContent = this.generateHTML(cvData, template);
      
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      
      // Wait a bit more for any dynamic content
      await page.waitForTimeout(500);

      const pdfBuffer = await page.pdf({
        format: format,
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm'
        },
        preferCSSPageSize: false
      });

      logger.info('PDF generated successfully', { 
        template,
        size: pdfBuffer.length 
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('PDF Generation Error', {
        error: error.message,
        stack: error.stack,
        template
      });
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.error('Error closing browser', { error: closeError.message });
        }
      }
    }
  }

  /**
   * Generate HTML based on template
   */
  generateHTML(data, template = 'standard') {
    if (!data || !data.personalInfo) {
      throw new Error('Invalid CV data: Personal Info is missing');
    }

    // Load template from separate files
    try {
      const templatePath = require.resolve(`../templates/${template}Template.js`);
      const templateGenerator = require(templatePath);
      return templateGenerator(data);
    } catch (error) {
      logger.warn(`Template ${template} not found, using standard template`, { error: error.message });
      const standardTemplate = require('../templates/standardTemplate.js');
      return standardTemplate(data);
    }
  }

  /**
   * Standard Template - Clean and professional
   */
  generateStandardTemplate(data) {
    const isRTL = data.language === 'ar';
    const direction = isRTL ? 'rtl' : 'ltr';
    const fontFamily = isRTL 
      ? "'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif" 
      : "'Roboto', 'Arial', sans-serif";
    const align = isRTL ? 'right' : 'left';

    // Helper functions
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatDate = (date) => {
      if (!date) return '';
      try {
        const d = new Date(date);
        return isRTL 
          ? d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
          : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } catch {
        return date;
      }
    };

    const renderExperience = (exp) => {
      const startDate = formatDate(exp.startDate);
      const endDate = exp.isCurrent 
        ? (isRTL ? 'الآن' : 'Present') 
        : formatDate(exp.endDate);
      
      const bullets = exp.descriptionBullets?.length > 0 
        ? exp.descriptionBullets 
        : (exp.description ? exp.description.split('\n').filter(b => b.trim()) : []);
      
      return `
        <div class="experience-item">
          <div class="exp-header">
            <div class="exp-title-row">
              <strong class="exp-title">${escapeHtml(exp.title)}</strong>
              <span class="exp-company">${escapeHtml(exp.company)}</span>
            </div>
            <div class="exp-meta">
              ${exp.location ? `<span class="exp-location">${escapeHtml(exp.location)}</span>` : ''}
              <span class="exp-date">${startDate} - ${endDate}</span>
            </div>
          </div>
          ${bullets.length > 0 ? `
            <ul class="exp-bullets">
              ${bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
            </ul>
          ` : ''}
          ${exp.achievements && exp.achievements.length > 0 ? `
            <div class="exp-achievements">
              <strong>${isRTL ? 'الإنجازات:' : 'Achievements:'}</strong>
              <ul>
                ${exp.achievements.map(ach => `<li>${escapeHtml(ach)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    };

    const renderEducation = (edu) => {
      const gradDate = edu.graduationDate 
        ? new Date(edu.graduationDate).getFullYear()
        : '';
      
      return `
        <div class="education-item">
          <div class="edu-header">
            <strong class="edu-degree">${escapeHtml(edu.degree)}</strong>
            ${edu.fieldOfStudy ? `<span class="edu-field"> - ${escapeHtml(edu.fieldOfStudy)}</span>` : ''}
            ${gradDate ? `<span class="edu-year">${gradDate}</span>` : ''}
          </div>
          <div class="edu-institution">${escapeHtml(edu.institution)}</div>
          ${edu.gpa ? `<div class="edu-gpa">${isRTL ? 'المعدل:' : 'GPA:'} ${escapeHtml(edu.gpa)}</div>` : ''}
        </div>
      `;
    };

    // Handle both old (array) and new (object) skills format
    const getSkills = () => {
      if (Array.isArray(data.skills)) {
        return data.skills;
      }
      if (data.skills && typeof data.skills === 'object') {
        return [
          ...(data.skills.technical || []),
          ...(data.skills.soft || []),
          ...(data.skills.tools || [])
        ];
      }
      return [];
    };

    const skills = getSkills();

    return `
      <!DOCTYPE html>
      <html lang="${data.language}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(data.personalInfo.fullName)} - CV</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: ${fontFamily};
            line-height: 1.6;
            color: #2c3e50;
            background: #fff;
            direction: ${direction};
            text-align: ${align};
            font-size: 11pt;
          }
          
          .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
          }
          
          /* Header Section */
          .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #3498db;
            margin-bottom: 25px;
          }
          
          .header h1 {
            font-size: 28pt;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header .job-title {
            font-size: 14pt;
            color: #7f8c8d;
            font-weight: 500;
            margin-bottom: 15px;
          }
          
          .contact-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 10pt;
            color: #555;
          }
          
          .contact-info span {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          
          .contact-info a {
            color: #3498db;
            text-decoration: none;
          }
          
          /* Section Styles */
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16pt;
            font-weight: 700;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          /* Summary */
          .summary {
            font-size: 11pt;
            line-height: 1.8;
            color: #555;
            text-align: justify;
          }
          
          /* Experience */
          .experience-item {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .exp-header {
            margin-bottom: 8px;
          }
          
          .exp-title-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
            flex-wrap: wrap;
          }
          
          .exp-title {
            font-size: 13pt;
            color: #2c3e50;
            font-weight: 600;
          }
          
          .exp-company {
            font-size: 12pt;
            color: #3498db;
            font-weight: 500;
            margin-${isRTL ? 'right' : 'left'}: 10px;
          }
          
          .exp-meta {
            display: flex;
            gap: 15px;
            font-size: 10pt;
            color: #7f8c8d;
            margin-top: 5px;
          }
          
          .exp-date {
            font-style: italic;
          }
          
          .exp-bullets {
            margin: 10px 0;
            padding-${isRTL ? 'right' : 'left'}: 20px;
            list-style: none;
          }
          
          .exp-bullets li {
            margin-bottom: 5px;
            position: relative;
            padding-${isRTL ? 'right' : 'left'}: 15px;
          }
          
          .exp-bullets li:before {
            content: "•";
            position: absolute;
            ${isRTL ? 'right' : 'left'}: 0;
            color: #3498db;
            font-weight: bold;
            font-size: 14pt;
          }
          
          /* Education */
          .education-item {
            margin-bottom: 15px;
          }
          
          .edu-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
            flex-wrap: wrap;
          }
          
          .edu-degree {
            font-size: 12pt;
            color: #2c3e50;
            font-weight: 600;
          }
          
          .edu-field {
            font-size: 11pt;
            color: #7f8c8d;
          }
          
          .edu-year {
            font-size: 10pt;
            color: #7f8c8d;
            font-style: italic;
          }
          
          .edu-institution {
            font-size: 11pt;
            color: #555;
            margin-top: 3px;
          }
          
          /* Skills */
          .skills-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .skill-tag {
            background: #ecf0f1;
            color: #2c3e50;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 10pt;
            font-weight: 500;
            border: 1px solid #bdc3c7;
          }
          
          /* Languages */
          .language-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
            border-bottom: 1px dotted #ddd;
          }
          
          .language-name {
            font-weight: 600;
            color: #2c3e50;
          }
          
          .language-proficiency {
            color: #7f8c8d;
            font-size: 10pt;
          }
          
          /* Projects */
          .project-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-${isRTL ? 'right' : 'left'}: 3px solid #3498db;
            border-radius: 4px;
          }
          
          .project-name {
            font-size: 12pt;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
          }
          
          .project-tech {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
          }
          
          .tech-tag {
            background: #3498db;
            color: #fff;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 9pt;
          }
          
          /* Print Styles */
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .section {
              page-break-inside: avoid;
            }
            
            .experience-item {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>${escapeHtml(data.personalInfo.fullName)}</h1>
            <div class="job-title">${escapeHtml(data.personalInfo.jobTitle)}</div>
            <div class="contact-info">
              ${data.personalInfo.email ? `<span>✉ ${escapeHtml(data.personalInfo.email)}</span>` : ''}
              ${data.personalInfo.phone ? `<span>📞 ${escapeHtml(data.personalInfo.phone)}</span>` : ''}
              ${data.personalInfo.city ? `<span>📍 ${escapeHtml(data.personalInfo.city)}${data.personalInfo.country ? ', ' + escapeHtml(data.personalInfo.country) : ''}</span>` : ''}
              ${data.personalInfo.linkedin ? `<span><a href="${escapeHtml(data.personalInfo.linkedin)}">LinkedIn</a></span>` : ''}
              ${data.personalInfo.website ? `<span><a href="${escapeHtml(data.personalInfo.website)}">Website</a></span>` : ''}
            </div>
          </div>

          <!-- Professional Summary -->
          ${data.summary ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'الملخص المهني' : 'Professional Summary'}</h2>
              <div class="summary">${escapeHtml(data.summary).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}

          <!-- Experience -->
          ${data.experience && data.experience.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'الخبرة العملية' : 'Professional Experience'}</h2>
              ${data.experience.map(renderExperience).join('')}
            </div>
          ` : ''}

          <!-- Education -->
          ${data.education && data.education.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'التعليم' : 'Education'}</h2>
              ${data.education.map(renderEducation).join('')}
            </div>
          ` : ''}

          <!-- Skills -->
          ${skills.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'المهارات' : 'Skills'}</h2>
              <div class="skills-container">
                ${skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Languages -->
          ${data.languages && data.languages.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'اللغات' : 'Languages'}</h2>
              ${data.languages.map(lang => `
                <div class="language-item">
                  <span class="language-name">${escapeHtml(lang.language)}</span>
                  <span class="language-proficiency">${escapeHtml(lang.proficiency)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Projects -->
          ${data.projects && data.projects.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'المشاريع' : 'Projects'}</h2>
              ${data.projects.map(project => `
                <div class="project-item">
                  <div class="project-name">${escapeHtml(project.name)}</div>
                  ${project.description ? `<div>${escapeHtml(project.description).replace(/\n/g, '<br>')}</div>` : ''}
                  ${project.technologies && project.technologies.length > 0 ? `
                    <div class="project-tech">
                      ${project.technologies.map(tech => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('')}
                    </div>
                  ` : ''}
                  ${project.url ? `<div style="margin-top: 5px;"><a href="${escapeHtml(project.url)}">${escapeHtml(project.url)}</a></div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Certifications -->
          ${data.courses && data.courses.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'الشهادات والدورات' : 'Certifications & Courses'}</h2>
              ${data.courses.map(course => `
                <div style="margin-bottom: 10px;">
                  <strong>${escapeHtml(course.name)}</strong>
                  ${course.institution ? ` - ${escapeHtml(course.institution)}` : ''}
                  ${course.issueDate ? ` (${formatDate(course.issueDate)})` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Modern Template - Contemporary design with colors
   */
  generateModernTemplate(data) {
    // Similar structure but with modern styling (gradients, colors, etc.)
    return this.generateStandardTemplate(data); // For now, use standard as base
  }

  /**
   * Classic Template - Traditional professional design
   */
  generateClassicTemplate(data) {
    return this.generateStandardTemplate(data); // For now, use standard as base
  }

  /**
   * Creative Template - Colorful and eye-catching
   */
  generateCreativeTemplate(data) {
    return this.generateStandardTemplate(data); // For now, use standard as base
  }

  /**
   * Minimal Template - Clean and simple
   */
  generateMinimalTemplate(data) {
    return this.generateStandardTemplate(data); // For now, use standard as base
  }

  /**
   * Executive Template - Formal and sophisticated
   */
  generateExecutiveTemplate(data) {
    return this.generateStandardTemplate(data); // For now, use standard as base
  }
}

module.exports = new PDFService();
