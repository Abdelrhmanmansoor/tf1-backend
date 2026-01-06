/**
 * Standard Template - Clean and Professional
 * Suitable for most industries and ATS systems
 */
module.exports = function generateStandardTemplate(data) {
  const isRTL = data.language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL 
    ? "'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif" 
    : "'Roboto', 'Arial', sans-serif";
  const align = isRTL ? 'right' : 'left';

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

  const getSkills = () => {
    if (Array.isArray(data.skills)) return data.skills;
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
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
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
        
        .summary {
          font-size: 11pt;
          line-height: 1.8;
          color: #555;
          text-align: justify;
        }
        
        .experience-item {
          margin-bottom: 20px;
          page-break-inside: avoid;
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
        
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section { page-break-inside: avoid; }
          .experience-item { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(data.personalInfo.fullName)}</h1>
          <div class="job-title">${escapeHtml(data.personalInfo.jobTitle)}</div>
          <div class="contact-info">
            ${data.personalInfo.email ? `<span>${escapeHtml(data.personalInfo.email)}</span>` : ''}
            ${data.personalInfo.phone ? `<span>${escapeHtml(data.personalInfo.phone)}</span>` : ''}
            ${data.personalInfo.city ? `<span>${escapeHtml(data.personalInfo.city)}</span>` : ''}
            ${data.personalInfo.linkedin ? `<span><a href="${escapeHtml(data.personalInfo.linkedin)}">LinkedIn</a></span>` : ''}
          </div>
        </div>

        ${data.summary ? `
          <div class="section">
            <h2 class="section-title">${isRTL ? 'الملخص المهني' : 'Professional Summary'}</h2>
            <div class="summary">${escapeHtml(data.summary).replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}

        ${data.experience && data.experience.length > 0 ? `
          <div class="section">
            <h2 class="section-title">${isRTL ? 'الخبرة العملية' : 'Professional Experience'}</h2>
            ${data.experience.map(renderExperience).join('')}
          </div>
        ` : ''}

        ${data.education && data.education.length > 0 ? `
          <div class="section">
            <h2 class="section-title">${isRTL ? 'التعليم' : 'Education'}</h2>
            ${data.education.map(renderEducation).join('')}
          </div>
        ` : ''}

        ${skills.length > 0 ? `
          <div class="section">
            <h2 class="section-title">${isRTL ? 'المهارات' : 'Skills'}</h2>
            <div class="skills-container">
              ${skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
};

