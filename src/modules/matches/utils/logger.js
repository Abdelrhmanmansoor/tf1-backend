/**
 * Logger utility for Matches Module
 * Provides centralized logging for all match-related operations
 */

const fs = require('fs');
const path = require('path');

let logger = null;

// Try to initialize Winston logger, fallback to console if not available
try {
  const winston = require('winston');
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'matches-service' },
    transports: [
      // Console output
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
          })
        )
      }),
      // Error logs
      new winston.transports.File({
        filename: path.join(logsDir, 'matches-error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // All logs
      new winston.transports.File({
        filename: path.join(logsDir, 'matches.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
} catch (err) {
  // Fallback to console logging if Winston is not available
  console.warn('Winston not available, using console logging fallback');
  logger = null;
}

// Export logger methods with fallback to console
module.exports = {
  info: (message, meta = {}) => {
    if (logger) {
      logger.info(message, meta);
    } else {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    }
  },
  error: (message, error) => {
    if (logger) {
      logger.error(message, { error: error?.message || error, stack: error?.stack });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    }
  },
  warn: (message, meta = {}) => {
    if (logger) {
      logger.warn(message, meta);
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    }
  },
  debug: (message, meta = {}) => {
    if (logger) {
      logger.debug(message, meta);
    } else {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  },
  logger
};
