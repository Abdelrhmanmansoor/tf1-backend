const { ValidationError } = require('./errorHandler');

/**
 * Validation utilities for matches system
 */

const validateMatchCreation = (data, isNewFormat) => {
  if (isNewFormat) {
    // Validate required fields for new format
    const requiredFields = ['title', 'sport', 'date', 'time', 'level', 'max_players'];
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate date
    const dateObj = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    
    if (dateObj < today) {
      throw new ValidationError('Match date must be in the future');
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.time)) {
      throw new ValidationError('Invalid time format. Use HH:MM format');
    }

    // Validate level
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(data.level)) {
      throw new ValidationError('Level must be "beginner", "intermediate", or "advanced"');
    }

    // Validate max_players
    if (!data.max_players || data.max_players < 2) {
      throw new ValidationError('max_players must be at least 2');
    }

    if (data.max_players > 100) {
      throw new ValidationError('max_players cannot exceed 100');
    }

    // Validate cost if provided
    if (data.cost_per_player !== undefined) {
      if (typeof data.cost_per_player !== 'number' || data.cost_per_player < 0) {
        throw new ValidationError('cost_per_player must be a positive number');
      }
    }
  } else {
    // Legacy format validation
    const requiredFields = ['starts_at', 'venue', 'max_players', 'team_size', 'mode'];
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate starts_at
    const startsAt = new Date(data.starts_at);
    if (isNaN(startsAt.getTime())) {
      throw new ValidationError('Invalid starts_at date format');
    }

    if (startsAt < new Date()) {
      throw new ValidationError('Match start time must be in the future');
    }
  }

  return true;
};

const validateRating = (score, comment) => {
  if (!score || typeof score !== 'number') {
    throw new ValidationError('Score is required and must be a number');
  }

  if (score < 1 || score > 5) {
    throw new ValidationError('Score must be between 1 and 5');
  }

  if (comment && typeof comment !== 'string') {
    throw new ValidationError('Comment must be a string');
  }

  if (comment && comment.length > 500) {
    throw new ValidationError('Comment cannot exceed 500 characters');
  }

  return true;
};

const validateInvitation = (inviteeId) => {
  if (!inviteeId) {
    throw new ValidationError('invitee_id is required');
  }

  return true;
};

const sanitizeSearchParams = (params) => {
  const sanitized = {};

  // Remove any potentially dangerous regex characters
  const sanitizeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  Object.keys(params).forEach(key => {
    if (params[key]) {
      sanitized[key] = sanitizeRegex(params[key]);
    }
  });

  return sanitized;
};

module.exports = {
  validateMatchCreation,
  validateRating,
  validateInvitation,
  sanitizeSearchParams
};

