/**
 * Middleware to sanitize all incoming requests
 * Prevents NoSQL injection attacks by removing MongoDB operators
 */

const { sanitizeMongoInput } = require('../utils/sanitize');
const logger = require('../utils/logger');

/**
 * Sanitize request body, query, and params
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeMongoInput(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeMongoInput(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeMongoInput(req.params);
    }

    next();
  } catch (error) {
    logger.error('Error sanitizing request:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid request data',
      code: 'INVALID_REQUEST_DATA',
    });
  }
};

/**
 * Detect and block suspicious MongoDB operators in requests
 */
const blockMongoOperators = (req, res, next) => {
  const suspiciousPatterns = [
    '$where',
    '$regex',
    '$ne',
    '$gt',
    '$lt',
    '$gte',
    '$lte',
    '$in',
    '$nin',
  ];

  const checkForOperators = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (obj.includes(pattern)) {
          return { found: true, operator: pattern, path };
        }
      }
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$')) {
          return {
            found: true,
            operator: key,
            path: path ? `${path}.${key}` : key,
          };
        }

        const result = checkForOperators(
          obj[key],
          path ? `${path}.${key}` : key
        );
        if (result.found) {
          return result;
        }
      }
    }

    return { found: false };
  };

  // Check body
  const bodyCheck = checkForOperators(req.body);
  if (bodyCheck.found) {
    logger.warn(
      `Blocked request with MongoDB operator in body: ${bodyCheck.operator} at ${bodyCheck.path}`,
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );

    return res.status(400).json({
      success: false,
      message: 'Invalid request: suspicious operators detected',
      code: 'SUSPICIOUS_REQUEST',
    });
  }

  // Check query
  const queryCheck = checkForOperators(req.query);
  if (queryCheck.found) {
    logger.warn(
      `Blocked request with MongoDB operator in query: ${queryCheck.operator} at ${queryCheck.path}`,
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );

    return res.status(400).json({
      success: false,
      message: 'Invalid request: suspicious operators detected',
      code: 'SUSPICIOUS_REQUEST',
    });
  }

  next();
};

module.exports = {
  sanitizeRequest,
  blockMongoOperators,
};
