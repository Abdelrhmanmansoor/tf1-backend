const CV = require('../models/CV');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

exports.createOrUpdateCV = catchAsync(async (req, res, next) => {
  // Assuming req.user exists if authenticated, or use session/cookie for guest
  // For now, let's assume we pass a sessionId or userId in body if not authenticated
  const { userId, sessionId, ...cvData } = req.body;

  let query = {};
  if (req.user) {
    query.user = req.user.id;
  } else if (sessionId) {
    query.sessionId = sessionId;
  } else {
    // If no identifier, create new one and return ID
    const newCV = await CV.create(cvData);
    return res.status(201).json({
      status: 'success',
      data: { cv: newCV }
    });
  }

  // If identifier exists, update or create
  let cv = await CV.findOne(query);
  if (cv) {
    cv = await CV.findOneAndUpdate(query, cvData, { new: true, runValidators: true });
  } else {
    if (req.user) cvData.user = req.user.id;
    if (sessionId) cvData.sessionId = sessionId;
    cv = await CV.create(cvData);
  }

  res.status(200).json({
    status: 'success',
    data: { cv }
  });
});

exports.getCV = catchAsync(async (req, res, next) => {
    let query = {};
    if (req.user) {
        query.user = req.user.id;
    } else if (req.query.sessionId) {
        query.sessionId = req.query.sessionId;
    } else if (req.params.id) {
        query._id = req.params.id;
    } else {
        return next(new AppError('No identifier provided', 400));
    }

    const cv = await CV.findOne(query);

    if (!cv) {
        return next(new AppError('CV not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { cv }
    });
});

exports.generatePDF = catchAsync(async (req, res, next) => {
    // Can generate from saved CV or request body
    let cvData = req.body;
    
    // If ID provided, fetch from DB
    if (req.params.id) {
        const cv = await CV.findById(req.params.id);
        if (!cv) return next(new AppError('CV not found', 404));
        cvData = cv.toObject();
    }

    // Validate required fields for PDF generation
    if (!cvData || !cvData.personalInfo || !cvData.personalInfo.fullName) {
        return next(new AppError('Incomplete CV data: Full Name is required for PDF generation', 400));
    }

    try {
        const pdfBuffer = await pdfService.generatePDF(cvData);

        const safeFilename = (cvData.personalInfo.fullName || 'CV').replace(/[^a-zA-Z0-9]/g, '-');
        
        res.setHeader('Content-Type', 'application/pdf');
        // Use proper encoding for filename to avoid header issues
        res.setHeader('Content-Disposition', `attachment; filename="cv-${safeFilename}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        return next(new AppError('Error generating PDF: ' + error.message, 500));
    }
});

exports.aiGenerate = catchAsync(async (req, res, next) => {
    const { type, data, language } = req.body;
    const userId = req.user?._id || req.ip;
    const provider = process.env.AI_PROVIDER || 'openai';
    
    logger.info(`🤖 AI Request: User=${userId}, Type=${type}, Language=${language}, Provider=${provider}`);
    
    let result;
    try {
        switch (type) {
            case 'summary':
                result = await aiService.generateSummary(data, language);
                break;
            case 'description':
                result = await aiService.improveDescription(data, language);
                break;
            case 'skills':
                result = await aiService.suggestSkills(data, language);
                break;
            default:
                logger.warn(`⚠️ Invalid AI generation type: ${type}, User=${userId}`);
                return next(new AppError('نوع العملية غير صالح', 400));
        }

        logger.logAIRequest(userId, type, provider, true);

        res.status(200).json({
            status: 'success',
            data: { result }
        });
    } catch (error) {
        logger.logAIRequest(userId, type, provider, false, error.message);
        throw error;
    }
});
