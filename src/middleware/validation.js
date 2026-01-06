const { body, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  console.log('📝 Validation check for:', req.path);
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
    }));

    console.log('❌ Validation errors:', JSON.stringify(errorMessages, null, 2));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
      code: 'VALIDATION_ERROR',
    });
  }

  console.log('✅ Validation passed');
  next();
};

const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  body('registrationCode')
    .if((value, { req }) =>
      ['admin', 'administrator', 'sports-administrator', 'sports-director', 'executive-director'].includes(req.body.role)
    )
    .trim()
    .notEmpty()
    .withMessage('Registration code is required')
    .isLength({ min: 10 })
    .withMessage('Registration code is invalid')
    .if((value, { req }) =>
      !['admin', 'administrator', 'sports-administrator', 'sports-director', 'executive-director'].includes(req.body.role)
    )
    .optional()
    .trim(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  body('role')
    .isIn(['player', 'coach', 'club', 'specialist', 'admin', 'administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary', 'sports-administrator', 'applicant', 'job-publisher'])
    .withMessage('Role must be one of: player, coach, club, specialist, admin, administrator, age-group-supervisor, sports-director, executive-director, secretary, sports-administrator, applicant, job-publisher'),

  // Individual user fields (required for player, coach, specialist, and admin roles)
  body('firstName')
    .if((value, { req }) =>
      ['player', 'coach', 'specialist', 'admin', 'administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary', 'sports-administrator', 'applicant', 'job-publisher'].includes(req.body.role)
    )
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters'),

  body('lastName')
    .if((value, { req }) =>
      ['player', 'coach', 'specialist', 'admin', 'administrator', 'age-group-supervisor', 'sports-director', 'executive-director', 'secretary', 'sports-administrator', 'applicant', 'job-publisher'].includes(req.body.role)
    )
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters'),

  // Club organization fields (required for club role)
  body('organizationName')
    .if((value, { req }) => req.body.role === 'club')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ max: 100 })
    .withMessage('Organization name cannot be more than 100 characters'),

  body('establishedDate')
    .if((value, { req }) => req.body.role === 'club')
    .notEmpty()
    .withMessage('Established date is required')
    .isISO8601()
    .withMessage('Please provide a valid established date'),

  body('businessRegistrationNumber')
    .if((value, { req }) => req.body.role === 'club')
    .trim()
    .notEmpty()
    .withMessage('Business registration number is required')
    .isLength({ max: 50 })
    .withMessage(
      'Business registration number cannot be more than 50 characters'
    ),

  body('organizationType')
    .if((value, { req }) => req.body.role === 'club')
    .isIn(['club', 'academy', 'federation', 'sports-center'])
    .withMessage(
      'Organization type must be one of: club, academy, federation, sports-center'
    ),

  // Optional fields
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9\s\-]{7,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot be more than 100 characters'),

  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('License number cannot be more than 50 characters'),

  body('facilitySize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Facility size must be between 1 and 1000'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be between 1 and 100,000'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot be more than 2000 characters'),

  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),

  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  body('password').notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  handleValidationErrors,
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),

  handleValidationErrors,
];

const validateEmailVerification = [
  query('token').notEmpty().withMessage('Verification token is required'),

  handleValidationErrors,
];

const validateResendVerification = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification,
  handleValidationErrors,
};
