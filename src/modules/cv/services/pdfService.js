let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  puppeteer = null;
}

const fs = require('fs');
const path = require('path');

class PDFService {
  async generatePDF(cvData) {
    if (!puppeteer) {
        throw new Error('Puppeteer is not installed. PDF generation is not available. Please install it using "npm install puppeteer".');
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const htmlContent = this.generateHTML(cvData);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    });

    await browser.close();
    return pdfBuffer;
  }

  generateHTML(data) {
    const isRTL = data.language === 'ar';
    const direction = isRTL ? 'rtl' : 'ltr';
    const fontFamily = isRTL ? "'Noto Sans Arabic', sans-serif" : "'Arial', sans-serif";
    const align = isRTL ? 'right' : 'left';

    // Helper to render sections
    const renderExperience = (exp) => `
      <div class="job-item">
        <div class="job-header">
          <span class="job-title"><strong>${exp.title}</strong></span>
          <span class="job-company"> | ${exp.company}</span>
          <span class="job-date" style="float: ${isRTL ? 'left' : 'right'}">
            ${new Date(exp.startDate).toLocaleDateString()} - ${exp.isCurrent ? (isRTL ? 'الآن' : 'Present') : new Date(exp.endDate).toLocaleDateString()}
          </span>
        </div>
        <div class="job-description">
          ${exp.description ? `<p>${exp.description.replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html lang="${data.language}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
          
          body {
            font-family: ${fontFamily};
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            direction: ${direction};
            text-align: ${align};
          }
          h1 { font-size: 24px; margin-bottom: 5px; text-transform: uppercase; }
          h2 { 
            font-size: 16px; 
            border-bottom: 2px solid #333; 
            padding-bottom: 5px; 
            margin-top: 20px; 
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .header { text-align: center; margin-bottom: 30px; }
          .contact-info { font-size: 14px; margin-bottom: 20px; }
          .job-item, .edu-item { margin-bottom: 15px; }
          .job-header { margin-bottom: 5px; }
          .skills-list { list-style: none; padding: 0; }
          .skills-list li { display: inline-block; background: #eee; padding: 2px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.personalInfo.fullName}</h1>
          <p>${data.personalInfo.jobTitle}</p>
          <div class="contact-info">
            ${data.personalInfo.email} | ${data.personalInfo.phone} | ${data.personalInfo.city || ''}
            ${data.personalInfo.linkedin ? ` | ${data.personalInfo.linkedin}` : ''}
          </div>
        </div>

        ${data.summary ? `
          <div class="section">
            <h2>${isRTL ? 'الملخص المهني' : 'Professional Summary'}</h2>
            <p>${data.summary}</p>
          </div>
        ` : ''}

        ${data.experience && data.experience.length > 0 ? `
          <div class="section">
            <h2>${isRTL ? 'الخبرة العملية' : 'Experience'}</h2>
            ${data.experience.map(renderExperience).join('')}
          </div>
        ` : ''}

        ${data.education && data.education.length > 0 ? `
          <div class="section">
            <h2>${isRTL ? 'التعليم' : 'Education'}</h2>
            ${data.education.map(edu => `
              <div class="edu-item">
                <strong>${edu.degree}</strong>, ${edu.fieldOfStudy}
                <br>
                ${edu.institution}
                <span style="float: ${isRTL ? 'left' : 'right'}">${new Date(edu.graduationDate).getFullYear()}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${data.skills && data.skills.length > 0 ? `
          <div class="section">
            <h2>${isRTL ? 'المهارات' : 'Skills'}</h2>
            <ul class="skills-list">
              ${data.skills.map(skill => `<li>${skill}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${data.languages && data.languages.length > 0 ? `
            <div class="section">
                <h2>${isRTL ? 'اللغات' : 'Languages'}</h2>
                <ul>
                ${data.languages.map(lang => `<li>${lang.language} - ${lang.proficiency}</li>`).join('')}
                </ul>
            </div>
        `: ''}

      </body>
      </html>
    `;
  }
}

module.exports = new PDFService();
