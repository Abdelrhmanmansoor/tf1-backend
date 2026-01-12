/**
 * Authentica OTP Service
 * Provides SMS, WhatsApp, and Email OTP verification via Authentica API
 * API Documentation: https://api.authentica.sa
 */

const axios = require('axios');

class AuthenticaService {
  constructor() {
    this.apiKey = process.env.AUTHENTICA_API_KEY;
    this.apiUrl = process.env.AUTHENTICA_API_URL || 'https://api.authentica.sa/api/v2';
    this.defaultChannel = process.env.AUTHENTICA_DEFAULT_CHANNEL || 'sms';
    this.smsTemplateId = parseInt(process.env.AUTHENTICA_SMS_TEMPLATE_ID) || 1;
    this.whatsappTemplateId = parseInt(process.env.AUTHENTICA_WHATSAPP_TEMPLATE_ID) || 8;
    
    // Create axios instance with default headers
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-Authorization': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }

  /**
   * Check if Authentica is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.apiKey && this.apiKey.length > 10);
  }

  /**
   * Get current balance from Authentica
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    try {
      if (!this.isConfigured()) {
        throw new Error('Authentica API is not configured');
      }

      const response = await this.client.get('/balance');
      
      console.log('📊 [AUTHENTICA] Balance check:', response.data);
      
      return {
        success: true,
        balance: response.data.balance || response.data,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [AUTHENTICA] Balance check failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send OTP to phone number via SMS or WhatsApp
   * @param {string} phone - International phone number (e.g., +966XXXXXXXXX)
   * @param {string} method - Delivery method: 'sms', 'whatsapp', or 'email'
   * @param {Object} options - Additional options
   * @param {string} options.customOtp - Custom OTP to send (optional)
   * @param {number} options.templateId - Template ID to use (optional)
   * @param {string} options.fallbackEmail - Fallback email if phone fails (optional)
   * @param {string} options.fallbackPhone - Fallback phone if primary fails (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendOTP(phone, method = 'sms', options = {}) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Authentica API is not configured');
      }

      // Validate phone format
      if (!phone || !phone.startsWith('+')) {
        throw new Error('Phone number must be in international format (e.g., +966XXXXXXXXX)');
      }

      // Determine template ID based on method
      let templateId = options.templateId;
      if (!templateId) {
        templateId = method === 'whatsapp' ? this.whatsappTemplateId : this.smsTemplateId;
      }

      const requestBody = {
        method: method,
        phone: phone,
        template_id: templateId
      };

      // Add custom OTP if provided
      if (options.customOtp) {
        requestBody.otp = options.customOtp;
      }

      // Add fallback options if configured
      if (options.fallbackEmail) {
        requestBody.fallback_email = options.fallbackEmail;
      }
      if (options.fallbackPhone) {
        requestBody.fallback_phone = options.fallbackPhone;
      }

      console.log('📤 [AUTHENTICA] Sending OTP:', { 
        phone: phone.substring(0, 6) + '****', 
        method, 
        templateId 
      });

      const response = await this.client.post('/send-otp', requestBody);

      console.log('✅ [AUTHENTICA] OTP sent successfully:', {
        phone: phone.substring(0, 6) + '****',
        method,
        response: response.data
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        messageAr: 'تم إرسال رمز التحقق بنجاح',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [AUTHENTICA] Send OTP failed:', {
        phone: phone?.substring(0, 6) + '****',
        method,
        error: error.response?.data || error.message
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP',
        messageAr: 'فشل في إرسال رمز التحقق',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Send OTP to email address
   * @param {string} email - Email address
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmailOTP(email, options = {}) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Authentica API is not configured');
      }

      if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
      }

      const requestBody = {
        method: 'email',
        email: email,
        template_id: options.templateId || 1
      };

      if (options.customOtp) {
        requestBody.otp = options.customOtp;
      }

      console.log('📤 [AUTHENTICA] Sending Email OTP:', { email: email.substring(0, 3) + '***' });

      const response = await this.client.post('/send-otp', requestBody);

      console.log('✅ [AUTHENTICA] Email OTP sent successfully');

      return {
        success: true,
        message: 'OTP sent to email successfully',
        messageAr: 'تم إرسال رمز التحقق إلى البريد الإلكتروني بنجاح',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [AUTHENTICA] Send Email OTP failed:', error.response?.data || error.message);

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP to email',
        messageAr: 'فشل في إرسال رمز التحقق إلى البريد الإلكتروني',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number that received the OTP
   * @param {string} otp - OTP code entered by user
   * @param {string} email - Email address (optional, if email was used)
   * @returns {Promise<Object>} Verification result
   */
  async verifyOTP(phone, otp, email = null) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Authentica API is not configured');
      }

      if (!otp || otp.length < 4) {
        throw new Error('Invalid OTP code');
      }

      const requestBody = {
        otp: otp
      };

      // Add phone or email based on what was used
      if (phone) {
        requestBody.phone = phone;
      }
      if (email) {
        requestBody.email = email;
      }

      console.log('🔐 [AUTHENTICA] Verifying OTP:', {
        phone: phone?.substring(0, 6) + '****',
        email: email?.substring(0, 3) + '***',
        otpLength: otp.length
      });

      const response = await this.client.post('/verify-otp', requestBody);

      console.log('✅ [AUTHENTICA] OTP verified successfully');

      return {
        success: true,
        verified: true,
        message: 'OTP verified successfully',
        messageAr: 'تم التحقق من الرمز بنجاح',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [AUTHENTICA] OTP verification failed:', error.response?.data || error.message);

      // Check if it's an invalid OTP vs other error
      const isInvalidOTP = error.response?.status === 400 || 
                          error.response?.data?.message?.toLowerCase().includes('invalid') ||
                          error.response?.data?.message?.toLowerCase().includes('expired');

      return {
        success: false,
        verified: false,
        message: isInvalidOTP ? 'Invalid or expired OTP code' : 'OTP verification failed',
        messageAr: isInvalidOTP ? 'رمز التحقق غير صالح أو منتهي الصلاحية' : 'فشل التحقق من الرمز',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Send custom SMS message (requires registered sender name)
   * @param {string} phone - Phone number
   * @param {string} message - Custom message
   * @param {string} senderName - Registered sender name
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(phone, message, senderName) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Authentica API is not configured');
      }

      const requestBody = {
        phone: phone,
        message: message,
        sender_name: senderName
      };

      console.log('📤 [AUTHENTICA] Sending custom SMS:', { 
        phone: phone.substring(0, 6) + '****',
        senderName
      });

      const response = await this.client.post('/send-sms', requestBody);

      console.log('✅ [AUTHENTICA] SMS sent successfully');

      return {
        success: true,
        message: 'SMS sent successfully',
        messageAr: 'تم إرسال الرسالة بنجاح',
        data: response.data
      };
    } catch (error) {
      console.error('❌ [AUTHENTICA] Send SMS failed:', error.response?.data || error.message);

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send SMS',
        messageAr: 'فشل في إرسال الرسالة',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Generate a random OTP code
   * @param {number} length - OTP length (default: 6)
   * @returns {string} Generated OTP
   */
  generateOTP(length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }
}

// Export singleton instance
module.exports = new AuthenticaService();
