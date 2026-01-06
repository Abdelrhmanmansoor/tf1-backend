/**
 * Modern Template - Contemporary design with colors and gradients
 * Eye-catching and professional
 */
module.exports = function generateModernTemplate(data) {
  const isRTL = data.language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL 
    ? "'Noto Sans Arabic', 'Cairo', sans-serif" 
    : "'Inter', 'Roboto', sans-serif";
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
        ? d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' })
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return date;
    }
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
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: ${fontFamily};
          line-height: 1.7;
          color: #1a1a1a;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .cv-wrapper {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 32pt;
          font-weight: 700;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .header .job-title {
          font-size: 16pt;
          font-weight: 300;
          opacity: 0.95;
          margin-bottom: 20px;
        }
        
        .contact-info {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;
          font-size: 10pt;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 18pt;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 3px solid #667eea;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .summary {
          font-size: 11pt;
          line-height: 1.9;
          color: #444;
          text-align: justify;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        
        .experience-item {
          margin-bottom: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #764ba2;
          page-break-inside: avoid;
        }
        
        .exp-header {
          margin-bottom: 12px;
        }
        
        .exp-title {
          font-size: 14pt;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 5px;
        }
        
        .exp-company {
          font-size: 12pt;
          font-weight: 600;
          color: #764ba2;
          margin-bottom: 8px;
        }
        
        .exp-meta {
          font-size: 10pt;
          color: #666;
          font-style: italic;
        }
        
        .exp-bullets {
          margin-top: 10px;
          padding-${isRTL ? 'right' : 'left'}: 20px;
          list-style: none;
        }
        
        .exp-bullets li {
          margin-bottom: 8px;
          position: relative;
          padding-${isRTL ? 'right' : 'left'}: 15px;
          color: #444;
        }
        
        .exp-bullets li:before {
          content: "▸";
          position: absolute;
          ${isRTL ? 'right' : 'left'}: 0;
          color: #667eea;
          font-weight: bold;
        }
        
        .education-item {
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        
        .edu-degree {
          font-size: 13pt;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 5px;
        }
        
        .edu-institution {
          font-size: 11pt;
          color: #666;
        }
        
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .skill-tag {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 10pt;
          font-weight: 500;
        }
        
        @media print {
          body { background: #fff; padding: 0; }
          .cv-wrapper { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="cv-wrapper">
        <div class="header">
          <h1>${escapeHtml(data.personalInfo.fullName)}</h1>
          <div class="job-title">${escapeHtml(data.personalInfo.jobTitle)}</div>
          <div class="contact-info">
            ${data.personalInfo.email ? `<span>${escapeHtml(data.personalInfo.email)}</span>` : ''}
            ${data.personalInfo.phone ? `<span>${escapeHtml(data.personalInfo.phone)}</span>` : ''}
            ${data.personalInfo.city ? `<span>${escapeHtml(data.personalInfo.city)}</span>` : ''}
            ${data.personalInfo.linkedin ? `<span><a href="${escapeHtml(data.personalInfo.linkedin)}" style="color: white;">LinkedIn</a></span>` : ''}
          </div>
        </div>

        <div class="content">
          ${data.summary ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'الملخص المهني' : 'Professional Summary'}</h2>
              <div class="summary">${escapeHtml(data.summary).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}

          ${data.experience && data.experience.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'الخبرة العملية' : 'Professional Experience'}</h2>
              ${data.experience.map(exp => {
                const startDate = formatDate(exp.startDate);
                const endDate = exp.isCurrent ? (isRTL ? 'الآن' : 'Present') : formatDate(exp.endDate);
                const bullets = exp.descriptionBullets?.length > 0 ? exp.descriptionBullets : (exp.description ? exp.description.split('\n').filter(b => b.trim()) : []);
                return `
                  <div class="experience-item">
                    <div class="exp-header">
                      <div class="exp-title">${escapeHtml(exp.title)}</div>
                      <div class="exp-company">${escapeHtml(exp.company)}</div>
                      <div class="exp-meta">${exp.location || ''} | ${startDate} - ${endDate}</div>
                    </div>
                    ${bullets.length > 0 ? `
                      <ul class="exp-bullets">
                        ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                      </ul>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${data.education && data.education.length > 0 ? `
            <div class="section">
              <h2 class="section-title">${isRTL ? 'التعليم' : 'Education'}</h2>
              ${data.education.map(edu => {
                const gradDate = edu.graduationDate ? new Date(edu.graduationDate).getFullYear() : '';
                return `
                  <div class="education-item">
                    <div class="edu-degree">${escapeHtml(edu.degree)}${edu.fieldOfStudy ? ` - ${escapeHtml(edu.fieldOfStudy)}` : ''} ${gradDate ? `(${gradDate})` : ''}</div>
                    <div class="edu-institution">${escapeHtml(edu.institution)}</div>
                  </div>
                `;
              }).join('')}
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
      </div>
    </body>
    </html>
  `;
};

