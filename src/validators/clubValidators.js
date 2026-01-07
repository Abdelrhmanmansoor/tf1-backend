const Joi = require('joi');

// === PROFILE VALIDATORS ===

// Validator لإنشاء ملف النادي
const createProfileSchema = Joi.object({
  organizationType: Joi.string()
    .required()
    .valid('sports_club', 'academy', 'training_center', 'federation', 'gym', 'sports_complex')
    .messages({
      'any.required': 'Organization type is required',
      'any.only': 'Invalid organization type'
    }),
  
  clubName: Joi.string()
    .required()
    .min(3)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Club name must be at least 3 characters',
      'string.max': 'Club name must not exceed 100 characters',
      'any.required': 'Club name is required'
    }),
  
  clubNameAr: Joi.string()
    .min(3)
    .max(100)
    .trim(),
  
  description: Joi.string()
    .max(2000)
    .trim(),
  
  location: Joi.object({
    address: Joi.string().max(500).trim(),
    addressAr: Joi.string().max(500).trim(),
    city: Joi.string().required().max(100).trim(),
    cityAr: Joi.string().max(100).trim(),
    country: Joi.string().required().max(100).trim(),
    nationalAddress: Joi.object({
      buildingNumber: Joi.string().required(),
      additionalNumber: Joi.string().required(),
      zipCode: Joi.string().required().length(5).pattern(/^[0-9]{5}$/)
    })
  }).required(),
  
  contactInfo: Joi.object({
    phoneNumbers: Joi.array().items(
      Joi.string().pattern(/^(\+966|966|05)[0-9]{8,9}$/)
        .messages({
          'string.pattern.base': 'Invalid Saudi phone number format'
        })
    ),
    email: Joi.string().email(),
    website: Joi.string().uri(),
    socialMedia: Joi.object({
      facebook: Joi.string().uri(),
      instagram: Joi.string().uri(),
      twitter: Joi.string().uri(),
      youtube: Joi.string().uri(),
      tiktok: Joi.string().uri(),
      linkedin: Joi.string().uri()
    })
  }),
  
  availableSports: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one sport is required'
    }),
  
  establishedDate: Joi.date()
    .max('now')
    .messages({
      'date.max': 'Established date cannot be in the future'
    }),

  facilityDetails: Joi.object({
    facilitySizeSqm: Joi.number().positive(),
    capacity: Joi.number().positive(),
    numberOfFields: Joi.number().positive(),
    facilityTypes: Joi.array().items(
      Joi.string().valid(
        'outdoor_field', 'indoor_court', 'gym', 'swimming_pool', 
        'tennis_court', 'basketball_court', 'volleyball_court', 
        'track', 'martial_arts_hall', 'dance_studio', 'yoga_studio', 'other'
      )
    ),
    additionalAmenities: Joi.array().items(
      Joi.string().valid(
        'locker_rooms', 'showers', 'cafeteria', 'restaurant', 'medical_room',
        'physiotherapy_room', 'sauna', 'steam_room', 'parking', 'wheelchair_accessible',
        'retail_shop', 'conference_rooms', 'wifi', 'air_conditioning'
      )
    )
  })
});

// Validator لتحديث الملف
const updateProfileSchema = Joi.object({
  clubName: Joi.string().min(3).max(100).trim(),
  clubNameAr: Joi.string().min(3).max(100).trim(),
  description: Joi.string().max(2000).trim(),
  
  location: Joi.object({
    address: Joi.string().max(500).trim(),
    addressAr: Joi.string().max(500).trim(),
    city: Joi.string().max(100).trim(),
    cityAr: Joi.string().max(100).trim(),
    country: Joi.string().max(100).trim()
  }),
  
  contactInfo: Joi.object({
    phoneNumbers: Joi.array().items(Joi.string().pattern(/^(\+966|966|05)[0-9]{8,9}$/)),
    email: Joi.string().email(),
    website: Joi.string().uri()
  }),
  
  availableSports: Joi.array().items(Joi.string()).min(1),
  
  about: Joi.object({
    bio: Joi.string().max(2000),
    bioAr: Joi.string().max(2000),
    vision: Joi.string().max(500),
    visionAr: Joi.string().max(500),
    mission: Joi.string().max(500),
    missionAr: Joi.string().max(500)
  }),
  
  // منع تعديل الحقول الحساسة
  userId: Joi.forbidden(),
  verification: Joi.forbidden(),
  ratingStats: Joi.forbidden(),
  memberStats: Joi.forbidden(),
  activityStats: Joi.forbidden()
}).min(1); // يجب أن يحتوي على حقل واحد على الأقل

// === JOB VALIDATORS ===

// Validator لإنشاء وظيفة
const createJobSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(5)
    .max(200)
    .trim()
    .messages({
      'string.min': 'Job title must be at least 5 characters',
      'any.required': 'Job title is required'
    }),
  
  titleAr: Joi.string().min(5).max(200).trim(),
  
  description: Joi.string()
    .required()
    .min(50)
    .max(5000)
    .trim()
    .messages({
      'string.min': 'Job description must be at least 50 characters',
      'any.required': 'Job description is required'
    }),
  
  descriptionAr: Joi.string().min(50).max(5000).trim(),
  
  jobType: Joi.string()
    .required()
    .valid('permanent', 'seasonal', 'temporary', 'trial', 'internship', 'volunteer')
    .messages({
      'any.required': 'Job type is required'
    }),
  
  category: Joi.string()
    .required()
    .valid('coach', 'player', 'specialist', 'administrative', 'security_maintenance', 'medical', 'other')
    .messages({
      'any.required': 'Job category is required'
    }),
  
  sport: Joi.string().when('category', {
    is: Joi.valid('coach', 'player'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  position: Joi.string().max(100),
  specialization: Joi.string().max(100),
  
  city: Joi.string().max(100),
  country: Joi.string().default('Saudi Arabia'),
  
  employmentType: Joi.string()
    .required()
    .valid('full_time', 'part_time', 'contract', 'freelance')
    .messages({
      'any.required': 'Employment type is required'
    }),
  
  applicationDeadline: Joi.date()
    .required()
    .greater('now')
    .iso()
    .messages({
      'date.greater': 'Application deadline must be in the future',
      'any.required': 'Application deadline is required'
    }),
  
  requirements: Joi.object({
    description: Joi.string().max(2000),
    descriptionAr: Joi.string().max(2000),
    minimumExperience: Joi.number().min(0).max(50),
    educationLevel: Joi.string().valid('high_school', 'diploma', 'bachelor', 'master', 'phd', 'not_required'),
    certifications: Joi.array().items(Joi.string()),
    skills: Joi.array().items(Joi.string()),
    ageRange: Joi.object({
      min: Joi.number().min(16).max(100),
      max: Joi.number().min(Joi.ref('min')).max(100)
    }),
    gender: Joi.string().valid('male', 'female', 'any').default('any'),
    languages: Joi.array().items(
      Joi.string().valid('arabic', 'english', 'french', 'german', 'spanish', 'other')
    )
  }),
  
  responsibilities: Joi.object({
    description: Joi.string().max(2000),
    descriptionAr: Joi.string().max(2000),
    duties: Joi.array().items(Joi.string()),
    dutiesAr: Joi.array().items(Joi.string())
  }),
  
  benefits: Joi.object({
    description: Joi.string().max(2000),
    descriptionAr: Joi.string().max(2000),
    list: Joi.array().items(Joi.string()),
    listAr: Joi.array().items(Joi.string())
  }),
  
  numberOfPositions: Joi.number().min(1).max(100).default(1)
});

// Validator لتحديث وظيفة
const updateJobSchema = createJobSchema.fork(
  ['title', 'description', 'jobType', 'category', 'employmentType', 'applicationDeadline'],
  (schema) => schema.optional()
).min(1);

// === TEAM VALIDATORS ===

// Validator لإنشاء فريق
const createTeamSchema = Joi.object({
  teamName: Joi.string()
    .required()
    .min(3)
    .max(100)
    .trim()
    .messages({
      'any.required': 'Team name is required'
    }),
  
  teamNameAr: Joi.string().min(3).max(100).trim(),
  
  sport: Joi.string()
    .required()
    .messages({
      'any.required': 'Sport is required'
    }),
  
  ageCategory: Joi.string()
    .valid('U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'U23', 'seniors', 'veterans', 'mixed'),
  
  level: Joi.string()
    .required()
    .valid('beginner', 'amateur', 'semi-pro', 'professional', 'elite')
    .messages({
      'any.required': 'Team level is required'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'mixed')
    .default('mixed'),
  
  season: Joi.object({
    name: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required()
  }),
  
  colors: Joi.object({
    primary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    secondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/)
  })
});

// Validator لتحديث فريق
const updateTeamSchema = createTeamSchema.fork(
  ['teamName', 'sport', 'level'],
  (schema) => schema.optional()
).min(1);

// === EVENT VALIDATORS ===

// Validator لإنشاء فعالية
const createEventSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(5)
    .max(200)
    .trim()
    .messages({
      'any.required': 'Event title is required'
    }),
  
  titleAr: Joi.string().min(5).max(200).trim(),
  
  description: Joi.string().max(2000).trim(),
  descriptionAr: Joi.string().max(2000).trim(),
  
  type: Joi.string()
    .required()
    .valid(
      'training', 'official_match', 'friendly_match', 'tournament', 
      'training_camp', 'social_event', 'meeting', 'celebration', 
      'trial', 'workshop', 'other'
    )
    .messages({
      'any.required': 'Event type is required'
    }),
  
  sport: Joi.string(),
  teamId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  
  startDate: Joi.date()
    .required()
    .iso()
    .messages({
      'any.required': 'Start date is required'
    }),
  
  endDate: Joi.date()
    .required()
    .greater(Joi.ref('startDate'))
    .iso()
    .messages({
      'any.required': 'End date is required',
      'date.greater': 'End date must be after start date'
    }),
  
  startTime: Joi.string()
    .required()
    .pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
    .messages({
      'any.required': 'Start time is required',
      'string.pattern.base': 'Invalid time format (use HH:mm)'
    }),
  
  endTime: Joi.string()
    .pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  
  location: Joi.object({
    type: Joi.string().valid('club_facility', 'external').default('club_facility'),
    facilityName: Joi.string(),
    facilityNameAr: Joi.string(),
    address: Joi.string(),
    city: Joi.string()
  }),
  
  capacity: Joi.number().positive(),
  
  visibility: Joi.string()
    .valid('public', 'members_only', 'team_only', 'invite_only')
    .default('members_only')
});

// Validator لتحديث فعالية
const updateEventSchema = createEventSchema.fork(
  ['title', 'type', 'startDate', 'endDate', 'startTime'],
  (schema) => schema.optional()
).min(1);

// === MIDDLEWARE للتحقق من الـ VALIDATION ===

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // جمع جميع الأخطاء
      stripUnknown: true, // حذف الحقول غير المعرفة
      allowUnknown: false // عدم السماح بحقول غير معرفة
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        messageAr: 'فشل التحقق من البيانات',
        errors,
        code: 'VALIDATION_ERROR'
      });
    }

    // استبدال req.body بالقيم المنظفة والمعدلة
    req.body = value;
    next();
  };
};

module.exports = {
  // Profile validators
  createProfileSchema,
  updateProfileSchema,
  
  // Job validators
  createJobSchema,
  updateJobSchema,
  
  // Team validators
  createTeamSchema,
  updateTeamSchema,
  
  // Event validators
  createEventSchema,
  updateEventSchema,
  
  // Validation middleware
  validate
};

