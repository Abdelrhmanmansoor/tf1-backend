/**
 * Logger utility for Matches Module
 * Provides centralized logging for all match-related operations
 */

const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
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

// Export logger methods
module.exports = {
  info: (message, meta = {}) => logger.info(message, meta),
  error: (message, error) => logger.error(message, { error: error?.message || error, stack: error?.stack }),
  warn: (message, meta = {}) => logger.warn(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  logger
};
