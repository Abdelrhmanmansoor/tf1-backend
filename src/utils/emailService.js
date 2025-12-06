const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'localhost',
  port: process.env.EMAIL_PORT || 1025,
  secure: false,
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
});

// Verify transporter connection (non-critical)
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ Email service warning:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// Generate email HTML template
const generateEmailHTML = (data, language = 'ar') => {
  const isArabic = language === 'ar';

  const templates = {
    'application-submitted': {
      ar: {
        subject: 'تم إرسال طلب التوظيف بنجاح',
        title: 'تم تقديم طلبك',
        greeting: `مرحباً ${data.applicantName}،`,
        content: [
          `نشكرك على تقديم طلب التوظيف لوظيفة <strong>${data.jobTitle}</strong> في <strong>${data.clubName}</strong>.`,
          `سيقوم الفريق بمراجعة طلبك وسيتم التواصل معك قريباً.`,
        ],
        details: {
          'الوظيفة': data.jobTitle,
          'النادي': data.clubName,
          'تاريخ التقديم': new Date(data.applicationDate).toLocaleDateString('ar-SA'),
          'الموقع': data.location,
          'الحالة': 'قيد المراجعة',
        },
        buttonText: 'عرض حالة الطلب',
        footerMessage: 'شكراً لاختيارك منصة SportX',
      },
      en: {
        subject: 'Job Application Submitted Successfully',
        title: 'Application Submitted',
        greeting: `Hello ${data.applicantName},`,
        content: [
          `Thank you for submitting your job application for the position of <strong>${data.jobTitle}</strong> at <strong>${data.clubName}</strong>.`,
          `Our team will review your application and get back to you soon.`,
        ],
        details: {
          'Position': data.jobTitle,
          'Organization': data.clubName,
          'Application Date': new Date(data.applicationDate).toLocaleDateString('en-US'),
          'Location': data.location,
          'Status': 'Under Review',
        },
        buttonText: 'View Application Status',
        footerMessage: 'Thank you for choosing SportX Platform',
      }
    }
  };

  const template = templates[data.template]?.[isArabic ? 'ar' : 'en'] || templates['application-submitted'][isArabic ? 'ar' : 'en'];

  let detailsHTML = '';
  if (template.details) {
    detailsHTML = `
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">${isArabic ? 'تفاصيل التطبيق' : 'Application Details'}</h3>
        ${Object.entries(template.details).map(([key, value]) => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <strong>${key}:</strong>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="${isArabic ? 'ar' : 'en'}" ${isArabic ? 'dir="rtl"' : ''}>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 300;
        }
        .content {
          padding: 40px 30px;
          color: #333;
          line-height: 1.6;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          font-weight: 500;
        }
        .message {
          margin: 15px 0;
          font-size: 15px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          border-radius: 6px;
          text-decoration: none;
          margin-top: 20px;
          font-weight: 500;
        }
        .footer {
          background: #f5f5f5;
          padding: 20px;
          text-align: center;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏆 SportX</div>
          <h1>${template.title}</h1>
        </div>
        <div class="content">
          <p class="greeting">${template.greeting}</p>
          ${template.content.map(text => `<p class="message">${text}</p>`).join('')}
          ${detailsHTML}
          <a href="${data.actionUrl || '#'}" class="cta-button">${template.buttonText}</a>
        </div>
        <div class="footer">
          <p>${template.footerMessage}</p>
          <p style="margin-top: 10px; color: #999;">© 2025 SportX Platform. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function
const sendEmail = async (options) => {
  try {
    const {
      to,
      subject,
      template = 'application-submitted',
      data = {},
      language = 'ar'
    } = options;

    // Generate email content
    const html = generateEmailHTML({ template, ...data }, language);

    // Get subject
    let emailSubject = subject;
    if (!emailSubject) {
      const templates = {
        'application-submitted': {
          ar: 'تم إرسال طلب التوظيف بنجاح',
          en: 'Job Application Submitted Successfully'
        }
      };
      emailSubject = templates[template]?.[language] || 'SportX Platform';
    }

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@sportx.local',
      to,
      subject: emailSubject,
      html,
      text: `Email sent successfully to ${to}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    // Don't throw - email is non-critical
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  generateEmailHTML,
  transporter
};
