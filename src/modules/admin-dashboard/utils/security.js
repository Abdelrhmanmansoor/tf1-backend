const crypto = require('crypto');
const xss = require('xss');

/**
 * Security Utility Functions for Admin Dashboard
 */

class SecurityUtils {
  /**
   * Generate CSRF Token
   */
  static generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate CSRF Token
   */
  static validateCSRFToken(token, sessionToken) {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return xss(input, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoredTag: true,
      });
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const key in input) {
        sanitized[key] = this.sanitizeInput(input[key]);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Encrypt sensitive data
   */
  static encryptData(data, key = process.env.ENCRYPTION_KEY) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv
    );

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decryptData(encryptedObject, key = process.env.ENCRYPTION_KEY) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key, 'hex'),
        Buffer.from(encryptedObject.iv, 'hex')
      );

      let decrypted = decipher.update(
        encryptedObject.encryptedData,
        'hex',
        'utf8'
      );
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length = 16) {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one uppercase, one lowercase, one number, one special char
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[
      Math.floor(Math.random() * 26)
    ];
    password += 'abcdefghijklmnopqrstuvwxyz'[
      Math.floor(Math.random() * 26)
    ];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const strength = Object.values(requirements).filter(Boolean).length;

    return {
      isValid: strength >= 4,
      strength: strength, // 0-5
      requirements,
      message: this.getPasswordStrengthMessage(strength),
    };
  }

  /**
   * Get password strength message
   */
  static getPasswordStrengthMessage(strength) {
    switch (strength) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return 'Unknown';
    }
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(ipAddress, limits = {}) {
    const defaultLimits = {
      requests: 100,
      windowMs: 3600000, // 1 hour
    };

    const finalLimits = { ...defaultLimits, ...limits };

    // This is a simple implementation
    // In production, use Redis or similar for better performance
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    const now = Date.now();
    const key = `rate-limit:${ipAddress}`;
    const record = global.rateLimitStore.get(key) || { count: 0, resetTime: now + finalLimits.windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + finalLimits.windowMs;
    }

    record.count += 1;
    global.rateLimitStore.set(key, record);

    return {
      allowed: record.count <= finalLimits.requests,
      remaining: Math.max(0, finalLimits.requests - record.count),
      resetTime: record.resetTime,
    };
  }

  /**
   * Prevent SQL Injection - Validate input patterns
   */
  static validateAgainstSQLInjection(input) {
    const sqlPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(-{2}|\/\*|\*\/|;)/,
      /(xp_|sp_)/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate email address
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash sensitive data
   */
  static hashSensitiveData(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate audit trail entry
   */
  static generateAuditEntry(action, user, details) {
    return {
      timestamp: new Date(),
      action,
      user: {
        id: user.id,
        email: user.email,
        ip: user.ip,
      },
      details,
      hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ action, user, details }))
        .digest('hex'),
    };
  }

  /**
   * Verify audit trail integrity
   */
  static verifyAuditEntry(entry) {
    const expectedHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          action: entry.action,
          user: entry.user,
          details: entry.details,
        })
      )
      .digest('hex');

    return entry.hash === expectedHash;
  }
}

module.exports = SecurityUtils;
