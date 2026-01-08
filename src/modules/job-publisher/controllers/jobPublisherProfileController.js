const JobPublisherProfile = require('../models/JobPublisherProfile');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const axios = require('axios');

/**
 * @route   POST /api/v1/job-publisher/profile/create
 * @desc    Create a new job publisher profile
 * @access  Private (job-publisher)
 */
exports.createProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const {
    companyName,
    industryType,
    companySize,
    websiteUrl,
    businessRegistrationNumber,
    nationalAddress,
    representativeName,
    representativeTitle,
    representativePhone,
    representativeEmail,
    companyDescription,
    companyValues,
    socialMediaLinks,
    taxNumber,
    bankAccountName,
    bankName,
    bankIban,
    preferredContactMethod
  } = req.body;

  // Check if profile already exists
  let profile = await JobPublisherProfile.findOne({ userId });
  if (profile) {
    return res.status(400).json({
      success: false,
      message: 'Profile already exists for this user',
      messageAr: 'البروفايل موجود بالفعل لهذا المستخدم'
    });
  }

  // Create new profile
  profile = new JobPublisherProfile({
    userId,
    companyName,
    industryType,
    companySize,
    websiteUrl,
    businessRegistrationNumber,
    nationalAddress,
    representativeName,
    representativeTitle,
    representativePhone,
    representativeEmail,
    companyDescription,
    companyValues: companyValues || [],
    socialMediaLinks: socialMediaLinks || {},
    taxNumber,
    bankAccountName,
    bankName,
    bankIban,
    preferredContactMethod
  });

  await profile.save();

  // Update user to mark profile creation
  await User.findByIdAndUpdate(userId, {
    profileCompleted: true
  });

  logger.info(`✅ Job publisher profile created for user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Profile created successfully',
    messageAr: 'تم إنشاء البروفايل بنجاح',
    profile: profile.getPublicProfile()
  });
});

/**
 * @route   GET /api/v1/job-publisher/profile
 * @desc    Get job publisher profile
 * @access  Private (job-publisher)
 */
exports.getProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const profile = await JobPublisherProfile.findOne({ userId });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  res.status(200).json({
    success: true,
    profile
  });
});

/**
 * @route   PUT /api/v1/job-publisher/profile
 * @desc    Update job publisher profile
 * @access  Private (job-publisher)
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const updates = req.body;

  // Fields that cannot be updated
  const forbiddenFields = ['userId', 'businessRegistrationNumber', 'statistics', '_id'];
  forbiddenFields.forEach(field => delete updates[field]);

  const profile = await JobPublisherProfile.findOneAndUpdate(
    { userId },
    updates,
    { new: true, runValidators: true }
  );

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  logger.info(`✅ Job publisher profile updated for user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    messageAr: 'تم تحديث البروفايل بنجاح',
    profile
  });
});

/**
 * @route   POST /api/v1/job-publisher/profile/upload-logo
 * @desc    Upload company logo
 * @access  Private (job-publisher)
 */
exports.uploadLogo = catchAsync(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      messageAr: 'لم يتم تحميل ملف'
    });
  }

  // For now, store file path (in production, use cloud storage)
  const logoPath = `/uploads/logos/${req.file.filename}`;

  const profile = await JobPublisherProfile.findOneAndUpdate(
    { userId },
    { companyLogo: logoPath },
    { new: true }
  );

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logo uploaded successfully',
    messageAr: 'تم تحميل الشعار بنجاح',
    logoUrl: logoPath
  });
});

/**
 * @route   POST /api/v1/job-publisher/profile/upload-document
 * @desc    Upload documents (business license, tax certificate, national address)
 * @access  Private (job-publisher)
 */
exports.uploadDocument = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { documentType } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
      messageAr: 'لم يتم تحميل ملف'
    });
  }

  const validDocumentTypes = ['businessLicense', 'taxCertificate', 'nationalAddressDocument'];
  if (!validDocumentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid document type',
      messageAr: 'نوع المستند غير صحيح'
    });
  }

  const documentPath = `/uploads/documents/${documentType}/${req.file.filename}`;

  const profile = await JobPublisherProfile.findOneAndUpdate(
    { userId },
    {
      [`documents.${documentType}.url`]: documentPath,
      [`documents.${documentType}.uploadDate`]: new Date()
    },
    { new: true }
  );

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Document uploaded successfully',
    messageAr: 'تم تحميل المستند بنجاح',
    documentUrl: documentPath
  });
});

/**
 * @route   POST /api/v1/job-publisher/profile/verify-national-address
 * @desc    Verify national address using API
 * @access  Private (job-publisher)
 */
exports.verifyNationalAddress = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const profile = await JobPublisherProfile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  const { buildingNumber, additionalNumber, zipCode, city } = profile.nationalAddress;

  try {
    // Try to verify using national address API
    // This is a placeholder - replace with actual API
    const addressVerificationUrl = process.env.NATIONAL_ADDRESS_API_URL || 'https://api.address.sa/verify';
    
    const verificationResponse = await axios.post(
      addressVerificationUrl,
      {
        buildingNumber,
        additionalNumber,
        zipCode,
        city
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NATIONAL_ADDRESS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (verificationResponse.data.success || verificationResponse.data.verified) {
      profile.nationalAddress.verified = true;
      profile.nationalAddress.verificationDate = new Date();
      profile.nationalAddress.verificationError = null;
      await profile.save();

      logger.info(`✅ National address verified for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'National address verified successfully',
        messageAr: 'تم التحقق من العنوان الوطني بنجاح',
        verified: true,
        data: verificationResponse.data
      });
    } else {
      throw new Error('Address verification failed');
    }
  } catch (error) {
    logger.error(`❌ National address verification error for user ${userId}:`, error.message);

    profile.nationalAddress.verificationAttempted = true;
    profile.nationalAddress.verificationError = error.message;
    await profile.save();

    res.status(400).json({
      success: false,
      message: 'Failed to verify national address',
      messageAr: 'فشل التحقق من العنوان الوطني',
      error: error.message,
      verified: false
    });
  }
});

/**
 * @route   GET /api/v1/job-publisher/profile/public/:publisherId
 * @desc    Get public profile information
 * @access  Public
 */
exports.getPublicProfile = catchAsync(async (req, res) => {
  const { publisherId } = req.params;

  const profile = await JobPublisherProfile.findOne({ userId: publisherId });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  // Increment profile views
  profile.statistics.profileViews = (profile.statistics.profileViews || 0) + 1;
  await profile.save();

  res.status(200).json({
    success: true,
    profile: profile.getPublicProfile()
  });
});

/**
 * @route   GET /api/v1/job-publisher/profile/statistics
 * @desc    Get publisher statistics
 * @access  Private (job-publisher)
 */
exports.getStatistics = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const profile = await JobPublisherProfile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  res.status(200).json({
    success: true,
    statistics: profile.statistics
  });
});

/**
 * @route   PUT /api/v1/job-publisher/profile/mark-complete
 * @desc    Mark profile as complete
 * @access  Private (job-publisher)
 */
exports.markProfileComplete = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const profile = await JobPublisherProfile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
      messageAr: 'البروفايل غير موجود'
    });
  }

  // Validate required fields
  const requiredFields = [
    'companyName',
    'industryType',
    'companySize',
    'businessRegistrationNumber',
    'representativeName',
    'representativeTitle',
    'representativePhone',
    'representativeEmail',
    'companyDescription'
  ];

  const missingFields = requiredFields.filter(field => !profile[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      messageAr: 'حقول مفقودة مطلوبة',
      missingFields
    });
  }

  await profile.markProfileComplete();

  logger.info(`✅ Profile marked as complete for user ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Profile marked as complete',
    messageAr: 'تم تحديد البروفايل كمكتمل',
    profileComplete: true
  });
});
