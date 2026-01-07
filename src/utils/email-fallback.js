const nodemailer = require('nodemailer');
const logger = require('../middleware/logger') || console;

class FallbackEmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Using Ethereal for testing (creates test accounts)
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass',
        },
      });
      logger.info('✅ Fallback email service initialized (Ethereal)');
    } catch (error) {
      logger.error('❌ Fallback email service failed:', error);
    }
  }

  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      logger.info('✅ Test email account created:');
      logger.info('User:', testAccount.user);
      logger.info('Pass:', testAccount.pass);
      logger.info('Preview URL: Will be shown after sending');

      return testAccount;
    } catch (error) {
      logger.error('❌ Failed to create test account:', error);
      return null;
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `SportX Platform <noreply@sportx.com>`,
      to: user.email,
      subject: 'Verify Your Email Address - SportX Platform',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Welcome to SportX Platform!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Thank you for registering with SportX Platform. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create an account with SportX Platform, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            <strong>Note:</strong> This is a test email service. In production, emails will be sent from your Gmail account.
          </p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Test verification email sent to ${user.email}`);
      logger.info(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      logger.info(
        `🔗 Copy this URL to see the email: ${nodemailer.getTestMessageUrl(info)}`
      );
      return true;
    } catch (error) {
      logger.error('❌ Failed to send test verification email:', error);
      return false;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Fallback email service connection verified');
      return true;
    } catch (error) {
      logger.error('❌ Fallback email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new FallbackEmailService();
