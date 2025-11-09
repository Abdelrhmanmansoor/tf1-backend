/**
 * Security utilities for input sanitization
 * Prevents NoSQL injection, XSS, and other security vulnerabilities
 */

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes any MongoDB operators from user input
 */
const sanitizeMongoInput = (input) => {
  if (typeof input === 'string') {
    // Remove potential MongoDB operators and regex special characters
    return input.replace(/[${}]/g, '');
  }

  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeMongoInput);
    }

    const sanitized = {};
    for (const key in input) {
      // Skip keys that start with $ (MongoDB operators)
      if (key.startsWith('$')) {
        continue;
      }
      sanitized[key] = sanitizeMongoInput(input[key]);
    }
    return sanitized;
  }

  return input;
};

/**
 * Escape regex special characters in search queries
 * Prevents regex injection attacks
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') {
    return '';
  }
  // Escape all regex special characters
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize search query for safe MongoDB regex use
 */
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Trim and limit length
  const trimmed = query.trim().substring(0, 100);

  // Remove MongoDB operators
  const noOperators = trimmed.replace(/[${}]/g, '');

  // Escape regex special characters
  return escapeRegex(noOperators);
};

/**
 * Validate and sanitize MongoDB ObjectId
 */
const sanitizeObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return null;
  }

  // MongoDB ObjectId is 24 hex characters
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id) ? id : null;
};

/**
 * Sanitize file path to prevent path traversal attacks
 */
const sanitizeFilePath = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove any path traversal attempts
  const sanitized = filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/\\/g, '/') // Normalize slashes
    .replace(/^\/+/, '') // Remove leading slashes
    .split('/').pop(); // Get only the filename

  // Validate filename (alphanumeric, hyphens, underscores, and dots only)
  const filenamePattern = /^[\w\-. ]+$/;
  return filenamePattern.test(sanitized) ? sanitized : null;
};

/**
 * Sanitize pagination parameters
 */
const sanitizePagination = (page, limit, maxLimit = 100) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limit) || 20)
  );

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip: (sanitizedPage - 1) * sanitizedLimit
  };
};

/**
 * Sanitize sort parameters
 */
const sanitizeSortParams = (sortBy, sortOrder, allowedFields = []) => {
  // Validate sortBy is in allowed fields
  const sanitizedSortBy = allowedFields.includes(sortBy) ? sortBy : allowedFields[0] || 'createdAt';

  // Validate sortOrder is either 'asc' or 'desc'
  const sanitizedSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    sortBy: sanitizedSortBy,
    sortOrder: sanitizedSortOrder,
    sortValue: sanitizedSortOrder === 'desc' ? -1 : 1
  };
};

/**
 * Remove sensitive fields from objects before sending to client
 */
const removeSensitiveFields = (obj, fieldsToRemove = ['password', 'passwordResetToken', 'emailVerificationToken']) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeSensitiveFields(item, fieldsToRemove));
  }

  const sanitized = { ...obj };
  fieldsToRemove.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
};

module.exports = {
  sanitizeMongoInput,
  escapeRegex,
  sanitizeSearchQuery,
  sanitizeObjectId,
  sanitizeFilePath,
  sanitizePagination,
  sanitizeSortParams,
  removeSensitiveFields
};
