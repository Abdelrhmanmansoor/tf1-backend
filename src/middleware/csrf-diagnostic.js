/**
 * CSRF Diagnostic Endpoint - للتشخيص السريع
 * يساعد في اكتشاف مشاكل CSRF بسرعة
 */

const logger = require('../utils/logger');

/**
 * Diagnostic endpoint to check CSRF configuration
 * GET /api/v1/auth/csrf-diagnostic
 */
const csrfDiagnostic = (req, res) => {
  const {
    generateCSRFToken,
    validateOrigin,
    extractToken
  } = require('./csrf');

  try {
    // 1. Check if CSRF_SECRET is configured
    const csrfSecret = process.env.CSRF_SECRET;
    const secretConfigured = !!csrfSecret && csrfSecret.length >= 32;

    // 2. Try to generate a token
    let tokenGenerated = false;
    let testToken = null;
    try {
      testToken = generateCSRFToken();
      tokenGenerated = !!testToken;
    } catch (error) {
      logger.error('Token generation failed:', error);
    }

    // 3. Check CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const frontendUrl = process.env.FRONTEND_URL;
    
    // 4. Check current request origin
    const requestOrigin = req.headers.origin || req.headers.referer;
    const originValid = validateOrigin(req);

    // 5. Check for existing token in request
    const existingToken = extractToken(req);

    // 6. Check cookie parser
    const cookieParserInstalled = !!req.cookies;

    // 7. Environment info
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // Build diagnostic report
    const diagnostic = {
      timestamp: new Date().toISOString(),
      status: secretConfigured && tokenGenerated ? 'OK' : 'WARNING',
      
      csrf: {
        secretConfigured,
        secretLength: csrfSecret?.length || 0,
        tokenGenerated,
        token: testToken ? testToken.substring(0, 20) + '...' : null,
        existingTokenInRequest: !!existingToken,
        cookieParserInstalled,
      },

      cors: {
        allowedOrigins,
        frontendUrl,
        requestOrigin,
        originValid,
        credentialsEnabled: true, // من server.js
      },

      environment: {
        nodeEnv,
        isProduction,
        port: process.env.PORT || 4000,
      },

      request: {
        method: req.method,
        path: req.path,
        headers: {
          origin: req.headers.origin || null,
          referer: req.headers.referer || null,
          'user-agent': req.headers['user-agent'] || null,
        },
        cookies: Object.keys(req.cookies || {}),
      },

      recommendations: []
    };

    // Add recommendations based on findings
    if (!secretConfigured) {
      diagnostic.recommendations.push({
        severity: 'CRITICAL',
        issue: 'CSRF_SECRET not configured or too short',
        solution: 'Add CSRF_SECRET to .env file (minimum 32 characters)',
        command: 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        arabic: 'أضف CSRF_SECRET إلى ملف .env (على الأقل 32 حرف)'
      });
    }

    if (!tokenGenerated) {
      diagnostic.recommendations.push({
        severity: 'CRITICAL',
        issue: 'Token generation failed',
        solution: 'Check CSRF middleware configuration and logs',
        arabic: 'فشل إنشاء الـ token - تحقق من إعدادات CSRF'
      });
    }

    if (!frontendUrl && isProduction) {
      diagnostic.recommendations.push({
        severity: 'HIGH',
        issue: 'FRONTEND_URL not configured',
        solution: 'Add FRONTEND_URL to .env file',
        arabic: 'أضف FRONTEND_URL إلى ملف .env'
      });
    }

    if (allowedOrigins.length === 0) {
      diagnostic.recommendations.push({
        severity: 'HIGH',
        issue: 'No allowed origins configured',
        solution: 'Add ALLOWED_ORIGINS to .env file',
        arabic: 'أضف ALLOWED_ORIGINS إلى ملف .env'
      });
    }

    if (!originValid && requestOrigin) {
      diagnostic.recommendations.push({
        severity: 'MEDIUM',
        issue: `Request origin (${requestOrigin}) not in allowed list`,
        solution: 'Add this origin to ALLOWED_ORIGINS in .env',
        arabic: 'أضف هذا المصدر إلى ALLOWED_ORIGINS'
      });
    }

    if (!cookieParserInstalled) {
      diagnostic.recommendations.push({
        severity: 'CRITICAL',
        issue: 'Cookie parser not working',
        solution: 'Ensure cookie-parser middleware is installed',
        arabic: 'تأكد من تثبيت cookie-parser'
      });
    }

    // If all checks pass
    if (diagnostic.recommendations.length === 0) {
      diagnostic.recommendations.push({
        severity: 'SUCCESS',
        issue: 'All CSRF checks passed',
        solution: 'CSRF protection is properly configured',
        arabic: 'جميع فحوصات CSRF نجحت - التكوين صحيح ✓'
      });
    }

    // Log diagnostic info
    logger.info('CSRF Diagnostic requested', {
      status: diagnostic.status,
      origin: requestOrigin,
      issues: diagnostic.recommendations.filter(r => r.severity !== 'SUCCESS').length
    });

    // Return diagnostic report
    return res.status(200).json(diagnostic);

  } catch (error) {
    logger.error('CSRF diagnostic failed:', error);
    return res.status(500).json({
      status: 'ERROR',
      error: error.message,
      message: 'Failed to run CSRF diagnostic',
      messageAr: 'فشل تشخيص CSRF'
    });
  }
};

/**
 * Test CSRF token validation
 * POST /api/v1/auth/csrf-test
 */
const csrfTest = (req, res) => {
  const { verifyToken, extractToken } = require('./csrf');
  
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No CSRF token provided in request',
        messageAr: 'لم يتم توفير رمز CSRF في الطلب',
        help: {
          english: 'Add X-CSRF-Token header with token value',
          arabic: 'أضف X-CSRF-Token header مع قيمة الـ token'
        }
      });
    }

    const verification = verifyToken(token);
    
    return res.status(200).json({
      success: verification.valid,
      message: verification.valid ? 'Token is valid' : 'Token is invalid',
      messageAr: verification.valid ? 'الـ token صالح' : 'الـ token غير صالح',
      details: {
        valid: verification.valid,
        expired: verification.expired,
        payload: verification.payload,
        token: token.substring(0, 20) + '...'
      }
    });
  } catch (error) {
    logger.error('CSRF test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'CSRF test failed',
      messageAr: 'فشل اختبار CSRF'
    });
  }
};

/**
 * Generate test CSRF token (for development/testing)
 * GET /api/v1/auth/csrf-generate-test
 */
const csrfGenerateTest = (req, res) => {
  const { generateCSRFToken } = require('./csrf');
  
  try {
    const token = generateCSRFToken();
    
    // Set cookie
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour
      path: '/',
    });

    logger.info('Test CSRF token generated', {
      path: req.path,
      origin: req.headers.origin
    });

    return res.status(200).json({
      success: true,
      message: 'Test CSRF token generated',
      messageAr: 'تم إنشاء رمز CSRF تجريبي',
      data: {
        token,
        expiresIn: 3600000,
        usage: {
          english: 'Use this token in X-CSRF-Token header for POST/PUT/PATCH/DELETE requests',
          arabic: 'استخدم هذا الـ token في X-CSRF-Token header للطلبات POST/PUT/PATCH/DELETE'
        },
        example: {
          curl: `curl -X POST http://localhost:${process.env.PORT || 4000}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -H "X-CSRF-Token: ${token}" \\
  -d '{"email":"test@example.com","password":"password"}'`,
          fetch: `fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': '${token}'
  },
  body: JSON.stringify({ email, password })
})`
        }
      }
    });
  } catch (error) {
    logger.error('Failed to generate test token:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate test token',
      messageAr: 'فشل إنشاء رمز تجريبي'
    });
  }
};

module.exports = {
  csrfDiagnostic,
  csrfTest,
  csrfGenerateTest
};
