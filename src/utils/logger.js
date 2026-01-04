const winston = require('winston');
const path = require('path');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const ts = `[${timestamp}]`;
    const levelStr = level.toUpperCase().padEnd(5);
    const metaStr = Object.keys(meta).length
      ? '\n' + JSON.stringify(meta, null, 2)
      : '';
    return `${ts} ${levelStr} ${message}${metaStr}`;
  })
);

// File format (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // CV/Resume operations log
    new winston.transports.File({
      filename: path.join(logsDir, 'cv-operations.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Helper methods for specific operations
logger.logFileUpload = (userId, filename, size, type) => {
  logger.info(`📤 File Upload: User=${userId}, File=${filename}, Size=${size} bytes, Type=${type}`);
};

logger.logFileDownload = (userId, applicationId, filename, success = true) => {
  const status = success ? '✅' : '❌';
  logger.info(`📥 ${status} File Download: User=${userId}, Application=${applicationId}, File=${filename}`);
};

logger.logAIRequest = (userId, operation, provider, success = true, error = null) => {
  const status = success ? '✅' : '❌';
  const message = `🤖 ${status} AI Request: User=${userId}, Operation=${operation}, Provider=${provider}`;
  
  if (success) {
    logger.info(message);
  } else {
    logger.error(`${message}, Error=${error}`);
  }
};

logger.logDatabaseOperation = (operation, collection, documentId, success = true) => {
  const status = success ? '✅' : '❌';
  logger.debug(`💾 ${status} DB Operation: ${operation} on ${collection} (${documentId})`);
};

logger.logAuthOperation = (operation, userId, success = true, reason = '') => {
  const status = success ? '✅' : '❌';
  logger.info(`🔐 ${status} Auth: ${operation} for User=${userId}${reason ? `, Reason=${reason}` : ''}`);
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
