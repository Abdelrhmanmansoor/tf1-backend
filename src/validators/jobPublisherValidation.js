const Joi = require('joi');

/**
 * Job Publisher Validation Schemas
 *
 * Provides comprehensive input validation for all job publisher endpoints
 * using Joi validation library.
 */

/**
 * Job Creation/Update Validation
 */
const jobSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Job title is required',
      'string.min': 'Job title must be at least 3 characters',
      'string.max': 'Job title cannot exceed 200 characters'
    }),

  titleAr: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .optional()
    .allow(''),

  description: Joi.string()
    .trim()
    .min(50)
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Job description is required',
      'string.min': 'Job description must be at least 50 characters',
      'string.max': 'Job description cannot exceed 5000 characters'
    }),

  descriptionAr: Joi.string()
    .trim()
    .min(50)
    .max(5000)
    .optional()
    .allow(''),

  sport: Joi.string()
    .valid('football', 'basketball', 'volleyball', 'handball', 'tennis', 'swimming', 'athletics', 'other')
    .required()
    .messages({
      'any.required': 'Sport type is required',
      'any.only': 'Invalid sport type'
    }),

  category: Joi.string()
    .valid('coach', 'trainer', 'physiotherapist', 'manager', 'analyst', 'scout', 'administrator', 'medical', 'other')
    .required()
    .messages({
      'any.required': 'Job category is required',
      'any.only': 'Invalid job category'
    }),

  employmentType: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'temporary', 'internship')
    .required()
    .messages({
      'any.required': 'Employment type is required',
      'any.only': 'Invalid employment type'
    }),

  experienceLevel: Joi.string()
    .valid('entry', 'intermediate', 'senior', 'expert')
    .required()
    .messages({
      'any.required': 'Experience level is required',
      'any.only': 'Invalid experience level'
    }),

  minExperienceYears: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .optional(),

  maxExperienceYears: Joi.number()
    .integer()
    .min(Joi.ref('minExperienceYears'))
    .max(50)
    .optional()
    .messages({
      'number.min': 'Max experience must be greater than or equal to min experience'
    }),

  salaryMin: Joi.number()
    .positive()
    .optional(),

  salaryMax: Joi.number()
    .positive()
    .min(Joi.ref('salaryMin'))
    .optional()
    .messages({
      'number.min': 'Max salary must be greater than or equal to min salary'
    }),

  salaryCurrency: Joi.string()
    .valid('SAR', 'USD', 'EUR', 'GBP', 'AED')
    .default('SAR'),

  location: Joi.object({
    city: Joi.string().trim().required(),
    cityAr: Joi.string().trim().optional(),
    country: Joi.string().trim().default('Saudi Arabia'),
    countryAr: Joi.string().trim().default('المملكة العربية السعودية'),
    isRemote: Joi.boolean().default(false)
  }).required(),

  requirements: Joi.array()
    .items(Joi.string().trim().min(3).max(500))
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one requirement is required',
      'array.max': 'Cannot exceed 20 requirements'
    }),

  responsibilities: Joi.array()
    .items(Joi.string().trim().min(3).max(500))
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one responsibility is required',
      'array.max': 'Cannot exceed 20 responsibilities'
    }),

  benefits: Joi.array()
    .items(Joi.string().trim().min(3).max(200))
    .max(15)
    .optional(),

  skills: Joi.array()
    .items(Joi.string().trim().min(2).max(50))
    .max(30)
    .optional(),

  applicationDeadline: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Application deadline must be in the future'
    }),

  companyName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional(),

  companyNameAr: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional(),

  status: Joi.string()
    .valid('draft', 'active', 'closed')
    .default('draft'),

  clubId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid club ID format'
    })
});

/**
 * Application Status Update Validation
 */
const applicationStatusSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'under_review', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired')
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Invalid status value'
    }),

  message: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Message cannot exceed 1000 characters'
    })
});

/**
 * Profile Creation/Update Validation
 */
const profileSchema = Joi.object({
  companyName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Company name is required',
      'string.min': 'Company name must be at least 2 characters'
    }),

  companyNameAr: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional(),

  description: Joi.string()
    .trim()
    .min(50)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Description must be at least 50 characters',
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  descriptionAr: Joi.string()
    .trim()
    .min(50)
    .max(2000)
    .optional(),

  industry: Joi.string()
    .trim()
    .max(100)
    .optional(),

  companySize: Joi.string()
    .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
    .optional(),

  website: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Invalid website URL'
    }),

  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Invalid email address'
    }),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),

  location: Joi.object({
    city: Joi.string().trim().required(),
    cityAr: Joi.string().trim().optional(),
    country: Joi.string().trim().default('Saudi Arabia'),
    address: Joi.string().trim().optional()
  }).optional(),

  socialMedia: Joi.object({
    linkedin: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    facebook: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional()
  }).optional(),

  establishedYear: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .optional()
    .messages({
      'number.max': 'Established year cannot be in the future'
    })
});

/**
 * Query Pagination Validation
 */
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  sort: Joi.string()
    .valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'title', '-title')
    .default('-createdAt')
});

/**
 * Job Query Filters Validation
 */
const jobFiltersSchema = paginationSchema.keys({
  status: Joi.string()
    .valid('draft', 'active', 'closed')
    .optional(),

  sport: Joi.string()
    .valid('football', 'basketball', 'volleyball', 'handball', 'tennis', 'swimming', 'athletics', 'other')
    .optional(),

  category: Joi.string()
    .valid('coach', 'trainer', 'physiotherapist', 'manager', 'analyst', 'scout', 'administrator', 'medical', 'other')
    .optional(),

  search: Joi.string()
    .trim()
    .max(200)
    .optional()
});

/**
 * Application Query Filters Validation
 */
const applicationFiltersSchema = paginationSchema.keys({
  status: Joi.string()
    .valid('new', 'under_review', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'hired')
    .optional(),

  jobId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid job ID format'
    })
});

/**
 * MongoDB ObjectId Validation
 */
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required'
  });

/**
 * Validation Middleware Generator
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Type conversion
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        messageAr: 'خطأ في التحقق من البيانات',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Exported Validators
 */
module.exports = {
  // Schemas
  jobSchema,
  applicationStatusSchema,
  profileSchema,
  paginationSchema,
  jobFiltersSchema,
  applicationFiltersSchema,
  objectIdSchema,

  // Middleware generators
  validate,

  // Pre-configured validators
  validateJob: validate(jobSchema, 'body'),
  validateJobUpdate: validate(jobSchema.fork(['title', 'description', 'sport', 'category', 'employmentType', 'experienceLevel', 'requirements', 'responsibilities'], (schema) => schema.optional()), 'body'),
  validateApplicationStatus: validate(applicationStatusSchema, 'body'),
  validateProfile: validate(profileSchema, 'body'),
  validateJobFilters: validate(jobFiltersSchema, 'query'),
  validateApplicationFilters: validate(applicationFiltersSchema, 'query'),
  validatePagination: validate(paginationSchema, 'query'),
  validateObjectId: (paramName = 'id') => validate(objectIdSchema, 'params')
};
