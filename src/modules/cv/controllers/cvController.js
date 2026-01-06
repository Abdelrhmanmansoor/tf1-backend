const CV = require('../models/CV');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const { uploadDocument } = require('../../../config/cloudinary');
const fs = require('fs');
const path = require('path');

/**
 * Create or Update CV
 * Supports both authenticated users and guest sessions
 */
exports.createOrUpdateCV = catchAsync(async (req, res, next) => {
  const { userId, sessionId, ...cvData } = req.body;
  const userIdForLog = req.user?._id || req.ip;

  logger.info('Creating/Updating CV', { 
    userId: userIdForLog,
    hasUser: !!req.user,
    hasSessionId: !!sessionId 
  });

  // Build query based on authentication
  let query = {};
  if (req.user) {
    query.user = req.user._id;
  } else if (sessionId) {
    query.sessionId = sessionId;
  } else if (userId) {
    // Support userId in body for backward compatibility
    query.user = userId;
  } else {
    // Create new CV with session ID
    const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cvData.sessionId = newSessionId;
    cvData.meta = cvData.meta || {};
    cvData.meta.template = cvData.meta.template || 'standard';
    
    const newCV = await CV.create(cvData);
    logger.info('New CV created', { cvId: newCV._id, sessionId: newSessionId });
    
    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'CV created successfully',
      messageAr: 'تم إنشاء السيرة الذاتية بنجاح',
      data: { 
        cv: newCV,
        sessionId: newSessionId
      }
    });
  }

  // Find existing CV
  let cv = await CV.findOne(query);
  
  if (cv) {
    // Update existing CV
    Object.assign(cv, cvData);
    cv.meta.updatedAt = new Date();
    await cv.save();
    
    logger.info('CV updated', { cvId: cv._id, userId: userIdForLog });
    
    res.status(200).json({
      success: true,
      status: 'success',
      message: 'CV updated successfully',
      messageAr: 'تم تحديث السيرة الذاتية بنجاح',
      data: { cv }
    });
  } else {
    // Create new CV
    if (req.user) cvData.user = req.user._id;
    if (sessionId) cvData.sessionId = sessionId;
    cvData.meta = cvData.meta || {};
    cvData.meta.template = cvData.meta.template || 'standard';
    
    cv = await CV.create(cvData);
    
    logger.info('New CV created for user', { cvId: cv._id, userId: userIdForLog });
    
    res.status(201).json({
      success: true,
      status: 'success',
      message: 'CV created successfully',
      messageAr: 'تم إنشاء السيرة الذاتية بنجاح',
      data: { cv }
    });
  }
});

/**
 * Get CV by ID, user, or sessionId
 */
exports.getCV = catchAsync(async (req, res, next) => {
  let query = {};
  
  if (req.params.id) {
    query._id = req.params.id;
  } else if (req.user) {
    query.user = req.user._id;
  } else if (req.query.sessionId) {
    query.sessionId = req.query.sessionId;
  } else {
    return next(new AppError('No identifier provided', 400));
  }

  const cv = await CV.findOne(query);

  if (!cv) {
    return next(new AppError('CV not found', 404));
  }

  // Check permissions (user can only access their own CV unless it's public)
  if (req.user && cv.user && cv.user.toString() !== req.user._id.toString() && cv.meta.privacy !== 'public') {
    return next(new AppError('Access denied', 403));
  }

  // Calculate completion percentage
  const completionPercentage = cv.getCompletionPercentage();
  const isComplete = cv.isComplete();

  res.status(200).json({
    success: true,
    status: 'success',
    data: { 
      cv,
      stats: {
        completionPercentage,
        isComplete,
        sectionsCount: {
          experience: cv.experience?.length || 0,
          education: cv.education?.length || 0,
          skills: Array.isArray(cv.skills) ? cv.skills.length : (cv.skills?.technical?.length || 0) + (cv.skills?.soft?.length || 0),
          languages: cv.languages?.length || 0,
          projects: cv.projects?.length || 0,
          certifications: cv.courses?.length || 0
        }
      }
    }
  });
});

/**
 * List all CVs for authenticated user
 */
exports.listCVs = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { page = 1, limit = 10, template, privacy } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = { user: req.user._id };
  
  if (template) {
    query['meta.template'] = template;
  }
  
  if (privacy) {
    query['meta.privacy'] = privacy;
  }

  const cvs = await CV.find(query)
    .select('personalInfo.fullName personalInfo.jobTitle meta.template meta.updatedAt meta.privacy summary')
    .sort({ 'meta.updatedAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await CV.countDocuments(query);

  res.status(200).json({
    success: true,
    status: 'success',
    data: {
      cvs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * Delete CV
 */
exports.deleteCV = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  let query = { _id: id };
  
  // Users can only delete their own CVs
  if (req.user) {
    query.user = req.user._id;
  } else {
    return next(new AppError('Authentication required', 401));
  }

  const cv = await CV.findOneAndDelete(query);

  if (!cv) {
    return next(new AppError('CV not found or access denied', 404));
  }

  logger.info('CV deleted', { cvId: id, userId: req.user._id });

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'CV deleted successfully',
    messageAr: 'تم حذف السيرة الذاتية بنجاح'
  });
});

/**
 * Duplicate CV
 */
exports.duplicateCV = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  let query = { _id: id };
  
  if (req.user) {
    query.user = req.user._id;
  } else if (req.query.sessionId) {
    query.sessionId = req.query.sessionId;
  } else {
    return next(new AppError('Authentication or session ID required', 401));
  }

  const originalCV = await CV.findOne(query);

  if (!originalCV) {
    return next(new AppError('CV not found', 404));
  }

  // Create duplicate
  const cvData = originalCV.toObject();
  delete cvData._id;
  delete cvData.__v;
  cvData.meta = cvData.meta || {};
  cvData.meta.template = cvData.meta.template || 'standard';
  cvData.meta.createdAt = new Date();
  cvData.meta.updatedAt = new Date();
  cvData.meta.version = 1;
  
  if (req.user) {
    cvData.user = req.user._id;
  }
  
  // Add "Copy" to name if exists
  if (cvData.personalInfo?.fullName) {
    cvData.personalInfo.fullName = `${cvData.personalInfo.fullName} (Copy)`;
  }

  const duplicatedCV = await CV.create(cvData);

  logger.info('CV duplicated', { 
    originalId: id, 
    newId: duplicatedCV._id,
    userId: req.user?._id 
  });

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'CV duplicated successfully',
    messageAr: 'تم نسخ السيرة الذاتية بنجاح',
    data: { cv: duplicatedCV }
  });
});

/**
 * Generate PDF from CV
 */
exports.generatePDF = catchAsync(async (req, res, next) => {
  let cvData = req.body;
  const { id } = req.params;
  const { template = 'standard', format = 'A4' } = req.query;
  
  // If ID provided, fetch from DB
  if (id) {
    let query = { _id: id };
    
    // Check permissions
    if (req.user) {
      query.user = req.user._id;
    }
    
    const cv = await CV.findOne(query);
    if (!cv) {
      return next(new AppError('CV not found', 404));
    }
    
    // Check privacy
    if (cv.meta.privacy !== 'public' && (!req.user || cv.user.toString() !== req.user._id.toString())) {
      return next(new AppError('Access denied', 403));
    }
    
    cvData = cv.toObject();
  }

  // Validate required fields
  if (!cvData || !cvData.personalInfo || !cvData.personalInfo.fullName) {
    return next(new AppError('Incomplete CV data: Full Name is required for PDF generation', 400));
  }

  // Set template if provided
  if (template && cvData.meta) {
    cvData.meta.template = template;
  }

  try {
    logger.info('Generating PDF', { 
      cvId: id,
      template,
      format,
      userId: req.user?._id 
    });

    const pdfBuffer = await pdfService.generatePDF(cvData, { template, format });

    const safeFilename = (cvData.personalInfo.fullName || 'CV')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-')
      .substring(0, 50);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CV-${safeFilename}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    logger.logFileDownload(req.user?._id || 'guest', safeFilename, true);
    
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation error', { 
      error: error.message,
      cvId: id,
      userId: req.user?._id 
    });
    return next(new AppError(`Error generating PDF: ${error.message}`, 500));
  }
});

/**
 * Upload CV file (PDF, DOC, DOCX)
 */
exports.uploadCVFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  const userId = req.user?._id || req.ip;
  const { cvId } = req.body;

  try {
    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Upload to storage
    const uploadResult = await uploadDocument(
      fileBuffer,
      userId,
      'cv',
      req.file.originalname
    );

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    // Update CV if ID provided
    if (cvId && req.user) {
      await CV.findOneAndUpdate(
        { _id: cvId, user: req.user._id },
        { 
          'personalInfo.cvFile': uploadResult.url,
          'meta.updatedAt': new Date()
        }
      );
    }

    logger.logFileUpload(userId, req.file.originalname, req.file.size, req.file.mimetype);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'File uploaded successfully',
      messageAr: 'تم رفع الملف بنجاح',
      data: {
        file: {
          url: uploadResult.url,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          format: uploadResult.format
        }
      }
    });
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('File upload error', { error: error.message, userId });
    return next(new AppError(`File upload failed: ${error.message}`, 500));
  }
});

/**
 * Download CV file
 */
exports.downloadCVFile = catchAsync(async (req, res, next) => {
  const { cvId } = req.params;
  
  let query = { _id: cvId };
  
  if (req.user) {
    query.user = req.user._id;
  } else {
    return next(new AppError('Authentication required', 401));
  }

  const cv = await CV.findOne(query);

  if (!cv || !cv.personalInfo?.cvFile) {
    return next(new AppError('CV file not found', 404));
  }

  const fileUrl = cv.personalInfo.cvFile;
  
  // Handle local files
  if (fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on server', 404));
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = path.extname(fileName) === '.pdf' ? 'application/pdf' : 'application/msword';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    logger.logFileDownload(req.user._id, fileName, true);
    
    return res.send(fileBuffer);
  }

  // Handle external URLs
  return res.redirect(fileUrl);
});

/**
 * AI-powered features
 * Enhanced with comprehensive error handling and fallback system
 */
exports.aiGenerate = catchAsync(async (req, res, next) => {
  const { type, data, language = 'ar' } = req.body;
  const userId = req.user?._id || req.ip;
  const provider = process.env.AI_PROVIDER || 'openai';
  
  if (!type) {
    return next(new AppError('Type is required', 400));
  }

  logger.info('AI generation request', { 
    userId,
    type,
    language,
    provider,
    hasApiKey: !!process.env.AI_API_KEY
  });
  
  let result;
  try {
    switch (type) {
      case 'summary':
        if (!data) {
          return next(new AppError('Profile data is required for summary generation', 400));
        }
        result = await aiService.generateText(data, 
          language === 'ar' 
            ? 'أنت خبير في كتابة السير الذاتية الاحترافية. قم بكتابة ملخص مهني احترافي ومقنع (2-4 جمل) بناءً على البيانات المقدمة.'
            : 'You are a professional resume writer expert. Write a compelling professional summary (2-4 sentences) based on the provided data.',
          'summary'
        );
        break;
        
      case 'description':
        if (!data || typeof data !== 'string') {
          return next(new AppError('Description text is required', 400));
        }
        result = await aiService.generateText(data,
          language === 'ar'
            ? 'أنت خبير في تحسين أوصاف الوظائف. قم بتحسين الوصف التالي ليكون احترافي ومناسب لأنظمة ATS.'
            : 'You are an expert in improving job descriptions. Improve the following description to be professional and ATS-friendly.',
          'description'
        );
        break;
        
      case 'skills':
        if (!data || typeof data !== 'string') {
          return next(new AppError('Job title is required', 400));
        }
        result = await aiService.generateText(data,
          language === 'ar'
            ? `اقترح قائمة من 10-15 مهارة مهمة للمسمى الوظيفي "${data}".`
            : `Suggest a list of 10-15 important skills for the job title "${data}".`,
          'skills'
        );
        break;
        
      case 'coverLetter':
        if (!data || !data.jobDescription || !data.candidateProfile) {
          return next(new AppError('Job description and candidate profile are required', 400));
        }
        result = await aiService.generateText(data,
          language === 'ar'
            ? 'أنت خبير في كتابة خطابات التقديم الاحترافية. اكتب خطاب تقديم مقنع ومخصص للوظيفة والشركة.'
            : 'You are an expert in writing professional cover letters. Write a compelling and customized cover letter.',
          'coverLetter'
        );
        break;
        
      case 'optimizeATS':
        if (!data || !data.cvData) {
          return next(new AppError('CV data is required for ATS optimization', 400));
        }
        result = await aiService.generateText(data.cvData,
          language === 'ar'
            ? 'أنت خبير في تحسين السير الذاتية لأنظمة ATS. حلل السيرة الذاتية التالية وقدم اقتراحات محددة لتحسينها.'
            : 'You are an expert in optimizing resumes for ATS systems. Analyze the following resume and provide specific suggestions.',
          'optimizeATS'
        );
        break;
        
      default:
        logger.warn('Invalid AI generation type', { type, userId });
        return next(new AppError('Invalid type. Supported types: summary, description, skills, coverLetter, optimizeATS', 400));
    }

    logger.logAIRequest(userId, type, provider, true);

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'AI generation completed successfully',
      messageAr: 'تم إكمال عملية الذكاء الاصطناعي بنجاح',
      data: { result }
    });
  } catch (error) {
    logger.logAIRequest(userId, type, provider, false, error.message);
    
    // Enhanced error handling with fallback
    if (process.env.AI_ENABLE_FALLBACK !== 'false') {
      // Use intelligent fallback
      let fallbackResult;
      try {
        fallbackResult = aiService.generateIntelligentFallback('', data, type);
      } catch (fallbackError) {
        logger.error('Fallback generation failed', { error: fallbackError.message, type });
        fallbackResult = language === 'ar' 
          ? 'يرجى تكوين AI_API_KEY في ملف .env لاستخدام ميزات الذكاء الاصطناعي الكاملة.'
          : 'Please configure AI_API_KEY in .env file to use full AI features.';
      }
      
      logger.info('Using fallback response', { type, userId });
      
      res.status(200).json({
        success: true,
        status: 'success',
        message: 'AI service unavailable, using intelligent fallback system',
        messageAr: 'خدمة الذكاء الاصطناعي غير متاحة، تم استخدام نظام بديل ذكي',
        data: { result: fallbackResult },
        fallback: true,
        warning: error.message
      });
    } else {
      // No fallback - return error
      if (error.statusCode === 401) {
        return next(new AppError('Invalid AI API key. Please configure AI_API_KEY in environment variables.', 401));
      } else if (error.statusCode === 503) {
        return next(new AppError('AI service temporarily unavailable. Please try again later.', 503));
      }
      throw error;
    }
  }
});

/**
 * Get AI service status
 */
exports.getAIStatus = catchAsync(async (req, res, next) => {
  const status = aiService.getStatus();
  const validation = await aiService.validateApiKey();

  res.status(200).json({
    success: true,
    status: 'success',
    data: {
      ...status,
      validation
    }
  });
});

/**
 * Get CV statistics
 */
exports.getCVStats = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const totalCVs = await CV.countDocuments({ user: req.user._id });
  const completeCVs = await CV.find({ user: req.user._id }).then(cvs => 
    cvs.filter(cv => cv.isComplete()).length
  );

  res.status(200).json({
    success: true,
    status: 'success',
    data: {
      total: totalCVs,
      complete: completeCVs,
      incomplete: totalCVs - completeCVs
    }
  });
});
