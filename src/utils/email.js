const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if SMTP credentials are configured
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
      ) {
        console.log(
          '⚠️  Email service disabled - SMTP credentials not configured'
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
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
      });

      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
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
