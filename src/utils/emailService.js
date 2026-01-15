/**
 * Email Service
 * Wrapper for Nodemailer with retry logic and templates
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('⚠️  Email service not configured. Set SMTP_* environment variables.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      this.isConfigured = true;
      logger.info('✅ Email service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
    }
  }

  async send({ to, subject, text, html, from, replyTo, attachments = [] }) {
    if (!this.isConfigured) {
      logger.warn('⚠️  Email service not configured. Email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: from || `"${process.env.SMTP_FROM_NAME || 'SportX Platform'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
        replyTo: replyTo || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`📧 Email sent: ${info.messageId} to ${to}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendWithRetry(options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.send(options);
      
      if (result.success) {
        return result;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`⏳ Retrying email send in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts`,
    };
  }

  async verify() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      logger.info('✅ Email service verified successfully');
      return { success: true };
    } catch (error) {
      logger.error('❌ Email service verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Template helpers
  getWelcomeEmailTemplate(userName) {
    return {
      subject: 'Welcome to SportX Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SportX Platform!</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for joining SportX Platform. We're excited to have you on board!</p>
          <p>Get started by exploring our features and setting up your profile.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Go to Dashboard</a>
          <p>Best regards,<br>The SportX Team</p>
        </div>
      `,
      text: `Welcome to SportX Platform!\n\nHi ${userName},\n\nThank you for joining SportX Platform. We're excited to have you on board!\n\nGet started by exploring our features and setting up your profile.\n\nVisit: ${process.env.FRONTEND_URL}/dashboard\n\nBest regards,\nThe SportX Team`,
    };
  }

  getPasswordResetTemplate(userName, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${userName},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The SportX Team</p>
        </div>
      `,
      text: `Reset Your Password\n\nHi ${userName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe SportX Team`,
    };
  }
}

// Export singleton instance
module.exports = new EmailService();
