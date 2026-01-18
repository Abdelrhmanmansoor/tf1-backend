const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Request Logger Middleware
 * Adds requestId to every request and logs request/response details
 */

// Store request context using AsyncLocalStorage (Node 12.17+)
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

// Export function to get current requestId
const getRequestId = () => {
  const store = asyncLocalStorage.getStore();
  return store?.requestId || 'unknown';
};

const requestLogger = (req, res, next) => {
  // Generate unique request ID
  const requestId = uuidv4();

  // Store in request object
  req.requestId = requestId;

  // Store in async local storage for access in nested functions
  asyncLocalStorage.run({ requestId }, () => {
    // Add requestId to response header for debugging
    res.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();

    // Log incoming request
    logger.info(`[${requestId}] ➡️  Incoming Request`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?._id?.toString(),
      userRole: req.user?.role,
    });

    // Log request body for POST/PUT/PATCH (excluding sensitive fields)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const sanitizedBody = { ...req.body };

      // Remove sensitive fields from logs
      const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken'];
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '***REDACTED***';
        }
      });

      logger.debug(`[${requestId}] 📦 Request Body`, {
        requestId,
        body: sanitizedBody,
        contentType: req.get('content-type'),
      });
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;

      // Log response
      logger.info(`[${requestId}] ⬅️  Response Sent`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?._id?.toString(),
      });

      // Log response body for errors
      if (res.statusCode >= 400) {
        try {
          const responseBody = typeof data === 'string' ? JSON.parse(data) : data;
          logger.error(`[${requestId}] ❌ Error Response`, {
            requestId,
            statusCode: res.statusCode,
            error: responseBody,
          });
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      return originalSend.call(this, data);
    };

    next();
  });
};

module.exports = { requestLogger, getRequestId };
