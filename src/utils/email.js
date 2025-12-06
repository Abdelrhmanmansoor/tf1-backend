const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Try SendGrid first (preferred for production)
      if (process.env.SENDGRID_API_KEY) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });
        console.log('✅ Email service initialized (SendGrid)');
        return;
      }

      // Fallback to SMTP credentials
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
      ) {
        console.log(
          '⚠️  Email service disabled - No SMTP/SendGrid credentials configured'
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
      });

      console.log('✅ Email service initialized (SMTP)');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  getFromAddress() {
    return `${process.env.SMTP_FROM_NAME || 'TF1 Sports Platform'} <${process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;
  }

  getEmailHeader() {
    return `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">TF1 Sports Platform</h1>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">منصة TF1 الرياضية</p>
      </div>
    `;
  }

  getEmailFooter() {
    return `
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; text-align: center; margin: 10px 0;">
        If you have any questions, please contact us through your dashboard.
      </p>
      <p style="color: #999; font-size: 12px; text-align: center; direction: rtl;">
        إذا كان لديك أي أسئلة، يرجى التواصل معنا عبر لوحة التحكم.
      </p>
      <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 20px;">
        © 2024 TF1 Sports Platform. All rights reserved.
      </p>
    `;
  }

  async sendVerificationEmail(user, verificationToken) {
    if (!this.transporter) {
      console.log(
        '⚠️  Email service not configured - skipping verification email'
      );
      return false;
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Get appropriate display name based on user type
    let displayName;
    if (user.role === 'club') {
      displayName = user.organizationName || user.displayName || 'Organization';
    } else {
      displayName = user.firstName || user.displayName || 'User';
    }

    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'TF1 Sports Platform'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Verify Your Email Address - تحقق من بريدك الإلكتروني | TF1',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">TF1 Sports Platform</h1>
              <p style="color: #666; font-size: 14px; margin: 5px 0;">منصة TF1 الرياضية</p>
            </div>

            <!-- English Content -->
            <div style="margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 30px;">
              <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Welcome, ${displayName}!</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">Thank you for registering with TF1 Sports Platform. Please verify your email address to activate your account and start exploring all our features.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(26,115,232,0.3);">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #1a73e8; font-size: 12px; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>

              <p style="color: #999; font-size: 13px; margin-top: 20px;">⏰ This link will expire in 24 hours.</p>
            </div>

            <!-- Arabic Content -->
            <div style="direction: rtl; text-align: right;">
              <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">مرحباً، ${displayName}!</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.8;">شكراً لتسجيلك في منصة TF1 الرياضية. يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك والبدء في استكشاف جميع ميزاتنا.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(26,115,232,0.3);">
                  تحقق من البريد الإلكتروني
                </a>
              </div>

              <p style="color: #666; font-size: 14px;">أو انسخ والصق هذا الرابط في متصفحك:</p>
              <p style="word-break: break-all; color: #1a73e8; font-size: 12px; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>

              <p style="color: #999; font-size: 13px; margin-top: 20px;">⏰ ستنتهي صلاحية هذا الرابط خلال 24 ساعة.</p>
            </div>

            <!-- Footer -->
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 10px 0;">
              If you didn't create an account, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; direction: rtl;">
              إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد الإلكتروني.
            </p>
            <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 20px;">
              © 2024 TF1 Sports Platform. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Get appropriate display name based on user type
    const displayName =
      user.role === 'club'
        ? user.organizationName || 'Organization'
        : user.firstName || 'User';

    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: user.email,
      subject: 'Reset Your Password - SportX Platform',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hi ${displayName},</p>
          <p>You requested to reset your password for your SportX Platform account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #e74c3c; font-weight: bold;">This link will expire in 10 minutes for security reasons.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  async sendApplicationEmail(applicant, jobTitle, clubName, jobLocation, applicationDate) {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping application email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';

    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'TF1 Sports Platform'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: applicant.email,
      subject: 'تم استلام طلب التوظيف - Application Received | TF1',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; font-size: 28px; margin: 0;">TF1 Sports Platform</h1>
              <p style="color: #666; font-size: 14px; margin: 5px 0;">منصة TF1 الرياضية</p>
            </div>

            <!-- English Content -->
            <div style="margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 30px;">
              <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Application Received</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">Dear ${applicantName},</p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">Thank you for applying to the position of <strong>${jobTitle}</strong> at <strong>${clubName}</strong>. Your application has been successfully received and is now under review.</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 10px 0;">Application Details:</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Organization:</strong> ${clubName}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Location:</strong> ${jobLocation}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Status:</strong> Under Review</p>
              </div>

              <p style="color: #666; font-size: 14px;">We will review your application carefully and get back to you soon. You will receive updates through your dashboard and email.</p>
            </div>

            <!-- Arabic Content -->
            <div style="direction: rtl; text-align: right;">
              <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">تم استلام طلبك</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.8;">عزيزنا ${applicantName}،</p>
              <p style="color: #555; font-size: 16px; line-height: 1.8;">شكراً لتقديمك على وظيفة <strong>${jobTitle}</strong> في <strong>${clubName}</strong>. تم استقبال طلبك بنجاح وهو قيد المراجعة الآن.</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 10px 0;">تفاصيل الطلب:</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>الوظيفة:</strong> ${jobTitle}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>المؤسسة:</strong> ${clubName}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>الموقع:</strong> ${jobLocation}</p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>الحالة:</strong> قيد المراجعة</p>
              </div>

              <p style="color: #666; font-size: 14px;">سنقوم بمراجعة طلبك بعناية والتواصل معك قريباً. ستتلقى تحديثات عبر لوحة التحكم والبريد الإلكتروني.</p>
            </div>

            <!-- Footer -->
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 10px 0;">
              If you have any questions, please contact us through your dashboard.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; direction: rtl;">
              إذا كان لديك أي أسئلة، يرجى التواصل معنا عبر لوحة التحكم.
            </p>
            <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 20px;">
              © 2024 TF1 Sports Platform. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Application confirmation email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send application email:', error);
      return false;
    }
  }

  async sendInterviewEmail(applicant, jobTitle, clubName, interviewDetails, customMessage = '', language = 'ar') {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping interview email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';
    const isArabic = language === 'ar';
    
    const interviewTypeLabels = {
      'in_person': { en: 'In-Person', ar: 'حضوري' },
      'online': { en: 'Online', ar: 'عبر الإنترنت' },
      'phone': { en: 'Phone', ar: 'هاتفي' }
    };

    const typeLabel = interviewTypeLabels[interviewDetails.type] || { en: 'Interview', ar: 'مقابلة' };
    const scheduledDate = new Date(interviewDetails.scheduledDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const mailOptions = {
      from: this.getFromAddress(),
      to: applicant.email,
      subject: isArabic ? `دعوة لمقابلة - ${jobTitle} | TF1` : `Interview Invitation - ${jobTitle} | TF1`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="${isArabic ? 'direction: rtl; text-align: right;' : ''}">
              <h2 style="color: #1a73e8; font-size: 24px; margin-bottom: 20px;">
                ${isArabic ? '🎉 تهانينا! تمت دعوتك لمقابلة' : '🎉 Congratulations! You\'ve Been Invited for an Interview'}
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? `عزيزنا ${applicantName}،` : `Dear ${applicantName},`}
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? `يسعدنا إبلاغك بأنه تم اختيارك لإجراء مقابلة لوظيفة <strong>${jobTitle}</strong> في <strong>${clubName}</strong>.`
                  : `We are pleased to inform you that you have been selected for an interview for the position of <strong>${jobTitle}</strong> at <strong>${clubName}</strong>.`
                }
              </p>

              ${customMessage ? `
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #1a73e8;">
                  <p style="color: #333; margin: 0;">${customMessage}</p>
                </div>
              ` : ''}

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 15px 0; font-size: 18px;">
                  ${isArabic ? '📅 تفاصيل المقابلة' : '📅 Interview Details'}
                </p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'نوع المقابلة:' : 'Type:'}</strong> ${isArabic ? typeLabel.ar : typeLabel.en}</p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'التاريخ والوقت:' : 'Date & Time:'}</strong> ${scheduledDate}</p>
                ${interviewDetails.location ? `<p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'الموقع:' : 'Location:'}</strong> ${interviewDetails.location}</p>` : ''}
                ${interviewDetails.meetingLink ? `<p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'رابط الاجتماع:' : 'Meeting Link:'}</strong> <a href="${interviewDetails.meetingLink}" style="color: #1a73e8;">${interviewDetails.meetingLink}</a></p>` : ''}
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                ${isArabic 
                  ? 'يرجى تأكيد حضورك أو التواصل معنا في حال عدم ملاءمة الموعد.'
                  : 'Please confirm your attendance or contact us if the time is not suitable.'
                }
              </p>
            </div>

            ${this.getEmailFooter()}
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Interview email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send interview email:', error);
      return false;
    }
  }

  async sendOfferEmail(applicant, jobTitle, clubName, offerDetails, customMessage = '', language = 'ar') {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping offer email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';
    const isArabic = language === 'ar';
    const startDate = offerDetails.startDate ? new Date(offerDetails.startDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') : '';
    const expiryDate = offerDetails.expiryDate ? new Date(offerDetails.expiryDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') : '';

    const mailOptions = {
      from: this.getFromAddress(),
      to: applicant.email,
      subject: isArabic ? `عرض وظيفي - ${jobTitle} | TF1` : `Job Offer - ${jobTitle} | TF1`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="${isArabic ? 'direction: rtl; text-align: right;' : ''}">
              <h2 style="color: #28a745; font-size: 24px; margin-bottom: 20px;">
                ${isArabic ? '🎊 تهانينا! لقد تلقيت عرضاً وظيفياً' : '🎊 Congratulations! You\'ve Received a Job Offer'}
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? `عزيزنا ${applicantName}،` : `Dear ${applicantName},`}
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? `يسعدنا أن نقدم لك عرضاً رسمياً للانضمام إلى فريقنا في وظيفة <strong>${jobTitle}</strong> في <strong>${clubName}</strong>.`
                  : `We are delighted to offer you the position of <strong>${jobTitle}</strong> at <strong>${clubName}</strong>.`
                }
              </p>

              ${customMessage ? `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #28a745;">
                  <p style="color: #333; margin: 0;">${customMessage}</p>
                </div>
              ` : ''}

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 15px 0; font-size: 18px;">
                  ${isArabic ? '📋 تفاصيل العرض' : '📋 Offer Details'}
                </p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'الوظيفة:' : 'Position:'}</strong> ${jobTitle}</p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'المؤسسة:' : 'Organization:'}</strong> ${clubName}</p>
                ${startDate ? `<p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'تاريخ البدء:' : 'Start Date:'}</strong> ${startDate}</p>` : ''}
                ${offerDetails.contractType ? `<p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'نوع العقد:' : 'Contract Type:'}</strong> ${offerDetails.contractType}</p>` : ''}
              </div>

              ${expiryDate ? `
                <p style="color: #dc3545; font-size: 14px; font-weight: bold;">
                  ${isArabic ? `⏰ يرجى الرد قبل: ${expiryDate}` : `⏰ Please respond by: ${expiryDate}`}
                </p>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" 
                   style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
                  ${isArabic ? 'عرض التفاصيل والرد' : 'View Details & Respond'}
                </a>
              </div>
            </div>

            ${this.getEmailFooter()}
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Offer email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send offer email:', error);
      return false;
    }
  }

  async sendHireEmail(applicant, jobTitle, clubName, hiringDetails, customMessage = '', language = 'ar') {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping hire email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';
    const isArabic = language === 'ar';
    const startDate = hiringDetails.startDate ? new Date(hiringDetails.startDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US') : '';

    const mailOptions = {
      from: this.getFromAddress(),
      to: applicant.email,
      subject: isArabic ? `مبارك! تم تعيينك - ${jobTitle} | TF1` : `Welcome Aboard! You're Hired - ${jobTitle} | TF1`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="${isArabic ? 'direction: rtl; text-align: right;' : ''}">
              <h2 style="color: #6f42c1; font-size: 24px; margin-bottom: 20px;">
                ${isArabic ? '🏆 مبارك! لقد تم تعيينك رسمياً' : '🏆 Welcome! You\'ve Been Officially Hired'}
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? `عزيزنا ${applicantName}،` : `Dear ${applicantName},`}
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? `يسعدنا الترحيب بك رسمياً كعضو في فريق <strong>${clubName}</strong> في منصب <strong>${jobTitle}</strong>.`
                  : `We are thrilled to officially welcome you to the <strong>${clubName}</strong> team as our new <strong>${jobTitle}</strong>.`
                }
              </p>

              ${customMessage ? `
                <div style="background: #e2d5f1; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #6f42c1;">
                  <p style="color: #333; margin: 0;">${customMessage}</p>
                </div>
              ` : ''}

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-weight: bold; margin: 0 0 15px 0; font-size: 18px;">
                  ${isArabic ? '📌 معلومات البداية' : '📌 Start Information'}
                </p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'الوظيفة:' : 'Position:'}</strong> ${jobTitle}</p>
                <p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'المؤسسة:' : 'Organization:'}</strong> ${clubName}</p>
                ${startDate ? `<p style="color: #666; font-size: 14px; margin: 8px 0;"><strong>${isArabic ? 'تاريخ البدء:' : 'Start Date:'}</strong> ${startDate}</p>` : ''}
              </div>

              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? 'نحن متحمسون للعمل معك ونتطلع إلى إنجازاتك المستقبلية معنا!'
                  : 'We are excited to work with you and look forward to your future achievements with us!'
                }
              </p>
            </div>

            ${this.getEmailFooter()}
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Hire confirmation email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send hire email:', error);
      return false;
    }
  }

  async sendRejectionEmail(applicant, jobTitle, clubName, customMessage = '', language = 'ar') {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping rejection email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';
    const isArabic = language === 'ar';

    const mailOptions = {
      from: this.getFromAddress(),
      to: applicant.email,
      subject: isArabic ? `تحديث على طلبك - ${jobTitle} | TF1` : `Update on Your Application - ${jobTitle} | TF1`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="${isArabic ? 'direction: rtl; text-align: right;' : ''}">
              <h2 style="color: #666; font-size: 24px; margin-bottom: 20px;">
                ${isArabic ? 'تحديث على طلبك' : 'Update on Your Application'}
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? `عزيزنا ${applicantName}،` : `Dear ${applicantName},`}
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? `نشكرك على اهتمامك بوظيفة <strong>${jobTitle}</strong> في <strong>${clubName}</strong> والوقت الذي استثمرته في التقديم.`
                  : `Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${clubName}</strong> and the time you invested in applying.`
                }
              </p>

              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? 'بعد دراسة متأنية، قررنا المضي قدماً مع مرشحين آخرين تتوافق مؤهلاتهم بشكل أكبر مع متطلبات هذا الدور في الوقت الحالي.'
                  : 'After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs for this role.'
                }
              </p>

              ${customMessage ? `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #6c757d;">
                  <p style="color: #333; margin: 0;">${customMessage}</p>
                </div>
              ` : ''}

              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? 'نقدر اهتمامك ونشجعك على متابعة فرص العمل المستقبلية معنا.'
                  : 'We appreciate your interest and encourage you to apply for future opportunities with us.'
                }
              </p>

              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? 'نتمنى لك كل التوفيق في مسيرتك المهنية.' : 'We wish you all the best in your career journey.'}
              </p>
            </div>

            ${this.getEmailFooter()}
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Rejection email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send rejection email:', error);
      return false;
    }
  }

  async sendDirectMessageEmail(applicant, jobTitle, clubName, message, language = 'ar') {
    if (!this.transporter) {
      console.log('⚠️  Email service not configured - skipping direct message email');
      return false;
    }

    const applicantName = applicant.firstName || applicant.fullName || 'Applicant';
    const isArabic = language === 'ar';

    const mailOptions = {
      from: this.getFromAddress(),
      to: applicant.email,
      subject: isArabic ? `رسالة جديدة بخصوص طلبك - ${jobTitle} | TF1` : `New Message Regarding Your Application - ${jobTitle} | TF1`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="${isArabic ? 'direction: rtl; text-align: right;' : ''}">
              <h2 style="color: #20c997; font-size: 24px; margin-bottom: 20px;">
                ${isArabic ? '📬 رسالة جديدة من ' + clubName : '📬 New Message from ' + clubName}
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic ? `عزيزنا ${applicantName}،` : `Dear ${applicantName},`}
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                ${isArabic 
                  ? `لقد تلقيت رسالة جديدة بخصوص طلبك لوظيفة <strong>${jobTitle}</strong>:`
                  : `You have received a new message regarding your application for <strong>${jobTitle}</strong>:`
                }
              </p>

              <div style="background: linear-gradient(135deg, #e8f5f1 0%, #d1f0e8 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-right: 4px solid #20c997;">
                <p style="color: #333; font-size: 16px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" 
                   style="background: linear-gradient(135deg, #20c997 0%, #17a2b8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
                  ${isArabic ? 'عرض لوحة التحكم' : 'View Dashboard'}
                </a>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                ${isArabic 
                  ? 'يمكنك الرد على هذه الرسالة من خلال لوحة التحكم الخاصة بك.'
                  : 'You can respond to this message through your dashboard.'
                }
              </p>
            </div>

            ${this.getEmailFooter()}
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Direct message email sent to ${applicant.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send direct message email:', error);
      return false;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
