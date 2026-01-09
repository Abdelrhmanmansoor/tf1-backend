/**
 * AI Assistant Routes for CV Builder
 * 
 * Provides AI-powered CV enhancement features
 * Routes match frontend service at /services/ai-assistant/index.ts
 */

const express = require('express');
const router = express.Router();
const aiService = require('../modules/cv/services/aiService');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);

/**
 * POST /ai-assistant/improve-text
 * Improve any text with AI
 */
router.post('/improve-text', auth.optionalAuth, catchAsync(async (req, res) => {
  const { text, style, language, context, targetRole, industry } = req.body;
  
  if (!text || text.trim().length === 0) {
    throw new AppError('النص مطلوب', 400);
  }

  const systemPrompt = language === 'ar' 
    ? `أنت خبير في كتابة السير الذاتية. حسّن هذا النص ليكون أكثر احترافية ومناسباً لأنظمة ATS. الأسلوب: ${style || 'professional'}. السياق: ${context || 'general'}.`
    : `You are a CV writing expert. Improve this text to be more professional and ATS-friendly. Style: ${style || 'professional'}. Context: ${context || 'general'}.`;

  const improved = await aiService.generateText(text, systemPrompt, 'description');
  
  res.json({
    success: true,
    improved: improved
  });
}));

/**
 * POST /ai-assistant/generate-summary
 * Generate professional summary from CV data
 */
router.post('/generate-summary', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData, language, targetRole } = req.body;
  
  const summary = await aiService.generateSummary(cvData, language || 'ar');
  
  res.json({
    success: true,
    summary: summary
  });
}));

/**
 * POST /ai-assistant/improve-description
 * Improve job/experience description
 */
router.post('/improve-description', auth.optionalAuth, catchAsync(async (req, res) => {
  const { description, jobTitle, company, language } = req.body;
  
  if (!description) {
    throw new AppError('الوصف مطلوب', 400);
  }

  const systemPrompt = language === 'ar'
    ? `أنت خبير موارد بشرية. حسّن هذا الوصف الوظيفي لـ ${jobTitle || 'الوظيفة'} ${company ? 'في ' + company : ''}. استخدم أفعال عمل قوية وأرقام قابلة للقياس إن أمكن.`
    : `You are an HR expert. Improve this job description for ${jobTitle || 'the position'} ${company ? 'at ' + company : ''}. Use strong action verbs and quantifiable metrics where possible.`;

  const improved = await aiService.generateText(description, systemPrompt, 'description');
  
  res.json({
    success: true,
    improved: improved
  });
}));

/**
 * POST /ai-assistant/generate-achievements
 * Generate achievement bullet points
 */
router.post('/generate-achievements', auth.optionalAuth, catchAsync(async (req, res) => {
  const { jobTitle, industry, count, language } = req.body;
  
  const systemPrompt = language === 'ar'
    ? `أنت خبير سير ذاتية. اقترح ${count || 3} إنجازات مهنية مقنعة لوظيفة ${jobTitle || 'محترف'} في مجال ${industry || 'الأعمال'}. استخدم أرقام ونسب مئوية. أعطني النتائج كقائمة مفصولة بفواصل.`
    : `You are a CV expert. Suggest ${count || 3} compelling professional achievements for a ${jobTitle || 'professional'} in the ${industry || 'business'} industry. Use numbers and percentages. Return as comma-separated list.`;

  const result = await aiService.generateText(jobTitle || 'professional', systemPrompt, 'achievements');
  
  // Parse the result into an array
  const achievements = result.split(/[,\n]/).map(a => a.trim()).filter(a => a.length > 0).slice(0, count || 3);
  
  res.json({
    success: true,
    achievements: achievements
  });
}));

/**
 * POST /ai-assistant/improve-sports-achievement
 * Improve sports achievement description
 */
router.post('/improve-sports-achievement', auth.optionalAuth, catchAsync(async (req, res) => {
  const { achievement, sport, level, language } = req.body;
  
  const systemPrompt = language === 'ar'
    ? `أنت خبير رياضي. حسّن هذا الإنجاز الرياضي في ${sport || 'الرياضة'} على المستوى ${level || 'المحترف'}. اجعله أكثر تأثيراً مع الحفاظ على الدقة.`
    : `You are a sports expert. Improve this ${sport || 'sports'} achievement at ${level || 'professional'} level. Make it more impactful while maintaining accuracy.`;

  const improved = await aiService.generateText(achievement, systemPrompt, 'description');
  
  res.json({
    success: true,
    improved: improved
  });
}));

/**
 * POST /ai-assistant/analyze-cv
 * Comprehensive CV analysis
 */
router.post('/analyze-cv', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData } = req.body;
  
  if (!cvData) {
    throw new AppError('بيانات السيرة الذاتية مطلوبة', 400);
  }

  // Calculate scores based on CV completeness and quality
  const analysis = calculateCVAnalysis(cvData);
  
  res.json({
    success: true,
    ...analysis
  });
}));

/**
 * POST /ai-assistant/check-ats
 * Check ATS compatibility
 */
router.post('/check-ats', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData } = req.body;
  
  if (!cvData) {
    throw new AppError('بيانات السيرة الذاتية مطلوبة', 400);
  }

  const atsResult = checkATSCompatibility(cvData);
  
  res.json({
    success: true,
    ...atsResult
  });
}));

/**
 * POST /ai-assistant/detect-missing
 * Detect missing CV sections
 */
router.post('/detect-missing', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData } = req.body;
  
  const missing = detectMissingSections(cvData);
  
  res.json({
    success: true,
    ...missing
  });
}));

/**
 * POST /ai-assistant/suggest-skills
 * Suggest skills based on job title
 */
router.post('/suggest-skills', auth.optionalAuth, catchAsync(async (req, res) => {
  const { jobTitle, industry, currentSkills, language } = req.body;
  
  const systemPrompt = language === 'ar'
    ? `أنت خبير موارد بشرية. اقترح 10 مهارات مهنية مناسبة لوظيفة ${jobTitle || 'محترف'} في مجال ${industry || 'الأعمال'}. استبعد هذه المهارات الموجودة: ${currentSkills?.join(', ') || ''}. أعطني النتائج كقائمة مفصولة بفواصل.`
    : `You are an HR expert. Suggest 10 professional skills suitable for a ${jobTitle || 'professional'} in the ${industry || 'business'} industry. Exclude these existing skills: ${currentSkills?.join(', ') || ''}. Return as comma-separated list.`;

  const result = await aiService.generateText(jobTitle || 'professional', systemPrompt, 'skills');
  const skills = result.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
  
  res.json({
    success: true,
    skills: skills
  });
}));

/**
 * POST /ai-assistant/suggest-sports-skills
 * Suggest sports-specific skills
 */
router.post('/suggest-sports-skills', auth.optionalAuth, catchAsync(async (req, res) => {
  const { sport, role, language } = req.body;
  
  const sportsSkillsMap = {
    'player': ['Team Collaboration', 'Physical Fitness', 'Quick Decision Making', 'Stress Management', 'Competition Experience'],
    'coach': ['Leadership', 'Training Programs', 'Performance Analysis', 'Team Building', 'Strategy Development'],
    'manager': ['Team Management', 'Budget Planning', 'Contract Negotiation', 'Media Relations', 'Talent Scouting'],
    'analyst': ['Data Analysis', 'Performance Metrics', 'Video Analysis', 'Statistical Modeling', 'Report Writing'],
    'trainer': ['Injury Prevention', 'Rehabilitation', 'Fitness Programming', 'Nutrition Knowledge', 'Sports Psychology'],
    'physiotherapist': ['Manual Therapy', 'Sports Rehabilitation', 'Injury Assessment', 'Treatment Planning', 'Recovery Protocols']
  };

  const skills = sportsSkillsMap[role] || sportsSkillsMap['player'];
  
  res.json({
    success: true,
    skills: skills
  });
}));

/**
 * POST /ai-assistant/extract-keywords
 * Extract keywords from text
 */
router.post('/extract-keywords', auth.optionalAuth, catchAsync(async (req, res) => {
  const { text, count } = req.body;
  
  if (!text) {
    return res.json({ success: true, keywords: [] });
  }

  // Simple keyword extraction
  const words = text.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count || 10)
    .map(([word]) => word);

  res.json({
    success: true,
    keywords: keywords
  });
}));

/**
 * POST /ai-assistant/match-keywords
 * Match CV keywords with job description
 */
router.post('/match-keywords', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData, jobDescription } = req.body;
  
  if (!cvData || !jobDescription) {
    throw new AppError('بيانات السيرة الذاتية ووصف الوظيفة مطلوبة', 400);
  }

  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  
  // Build CV text
  const cvText = buildCVText(cvData).toLowerCase();
  
  // Find matches
  const matchedKeywords = jobKeywords.filter(kw => cvText.includes(kw.toLowerCase()));
  const missingKeywords = jobKeywords.filter(kw => !cvText.includes(kw.toLowerCase()));
  const matchScore = Math.round((matchedKeywords.length / jobKeywords.length) * 100);

  res.json({
    success: true,
    matchScore: matchScore,
    matchedKeywords: matchedKeywords,
    missingKeywords: missingKeywords
  });
}));

/**
 * POST /ai-assistant/chat
 * AI chat for CV assistance
 */
router.post('/chat', auth.optionalAuth, catchAsync(async (req, res) => {
  const { message, context } = req.body;
  
  if (!message) {
    throw new AppError('الرسالة مطلوبة', 400);
  }

  const systemPrompt = context?.language === 'ar'
    ? 'أنت مساعد ذكي متخصص في كتابة السير الذاتية. ساعد المستخدم في تحسين سيرته الذاتية وأجب على أسئلته بشكل مفيد ومختصر.'
    : 'You are an AI assistant specialized in CV writing. Help the user improve their CV and answer questions helpfully and concisely.';

  const response = await aiService.generateText(message, systemPrompt, 'chat');
  
  res.json({
    success: true,
    response: response
  });
}));

/**
 * POST /ai-assistant/tailor-cv
 * Tailor CV for specific job
 */
router.post('/tailor-cv', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData, jobDescription, jobTitle } = req.body;
  
  // For now, return the CV with recommendations
  const recommendations = [
    'أضف الكلمات المفتاحية من وصف الوظيفة',
    'ركز على المهارات ذات الصلة',
    'عدّل الملخص ليتناسب مع المنصب'
  ];

  res.json({
    success: true,
    tailoredCV: cvData,
    changes: recommendations.map((r, i) => ({ id: i, recommendation: r })),
    matchScore: 75
  });
}));

/**
 * POST /ai-assistant/generate-cover-letter
 * Generate cover letter
 */
router.post('/generate-cover-letter', auth.optionalAuth, catchAsync(async (req, res) => {
  const { cvData, jobDescription, companyName } = req.body;
  
  const promptData = {
    candidateProfile: cvData?.personalInfo || cvData,
    jobDescription: { title: jobDescription },
    companyName: companyName
  };

  const coverLetter = await aiService.generateText(
    JSON.stringify(promptData), 
    'Generate a professional cover letter', 
    'coverLetter'
  );
  
  res.json({
    success: true,
    coverLetter: coverLetter
  });
}));

/**
 * POST /ai-assistant/fix-grammar
 * Fix grammar in text
 */
router.post('/fix-grammar', auth.optionalAuth, catchAsync(async (req, res) => {
  const { text, language } = req.body;
  
  const systemPrompt = language === 'ar'
    ? 'صحح الأخطاء اللغوية والنحوية في هذا النص مع الحفاظ على المعنى:'
    : 'Fix grammar and spelling errors in this text while preserving the meaning:';

  const corrected = await aiService.generateText(text, systemPrompt, 'grammar');
  
  res.json({
    success: true,
    corrected: corrected
  });
}));

/**
 * POST /ai-assistant/adjust-tone
 * Adjust text tone
 */
router.post('/adjust-tone', auth.optionalAuth, catchAsync(async (req, res) => {
  const { text, targetTone, language } = req.body;
  
  const toneMap = {
    'professional': 'احترافي ورسمي',
    'friendly': 'ودي ومرحب',
    'formal': 'رسمي جداً',
    'casual': 'عفوي وبسيط',
    'confident': 'واثق وقوي'
  };

  const systemPrompt = language === 'ar'
    ? `اعد صياغة هذا النص بأسلوب ${toneMap[targetTone] || 'احترافي'}:`
    : `Rewrite this text in a ${targetTone || 'professional'} tone:`;

  const adjusted = await aiService.generateText(text, systemPrompt, 'tone');
  
  res.json({
    success: true,
    adjusted: adjusted
  });
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateCVAnalysis(cvData) {
  const scores = {
    content: 0,
    formatting: 0,
    keywords: 0,
    completeness: 0,
    sportsRelevance: 0
  };

  const suggestions = [];
  const strengths = [];
  const weaknesses = [];

  // Check personal info
  const personalInfo = cvData.personalInfo || cvData.basics || {};
  if (personalInfo.fullName || personalInfo.name) {
    scores.content += 10;
  } else {
    weaknesses.push('الاسم مفقود');
  }
  if (personalInfo.email) scores.content += 10;
  if (personalInfo.phone) scores.content += 10;
  if (personalInfo.summary) {
    scores.content += 20;
    strengths.push('ملخص مهني موجود');
  } else {
    suggestions.push({
      id: '1',
      type: 'critical',
      category: 'content',
      section: 'summary',
      message: 'أضف ملخصاً مهنياً',
      impact: 'high'
    });
  }

  // Check experience
  const experience = cvData.experience || cvData.work || [];
  if (experience.length > 0) {
    scores.content += 25;
    strengths.push(`${experience.length} خبرة عمل مسجلة`);
  } else {
    weaknesses.push('لا توجد خبرات عمل');
  }

  // Check education
  const education = cvData.education || [];
  if (education.length > 0) {
    scores.content += 15;
  }

  // Check skills
  const skills = cvData.skills || [];
  if (skills.length >= 5) {
    scores.keywords += 40;
    strengths.push('مهارات كافية');
  } else if (skills.length > 0) {
    scores.keywords += 20;
    suggestions.push({
      id: '2',
      type: 'important',
      category: 'keywords',
      section: 'skills',
      message: 'أضف المزيد من المهارات',
      impact: 'medium'
    });
  }

  // Calculate completeness
  let filledSections = 0;
  if (personalInfo.fullName || personalInfo.name) filledSections++;
  if (personalInfo.email) filledSections++;
  if (personalInfo.phone) filledSections++;
  if (personalInfo.summary) filledSections++;
  if (experience.length > 0) filledSections++;
  if (education.length > 0) filledSections++;
  if (skills.length > 0) filledSections++;

  scores.completeness = Math.round((filledSections / 7) * 100);
  scores.formatting = 70; // Default formatting score
  
  // Check for sports content
  const cvText = buildCVText(cvData).toLowerCase();
  const sportsTerms = ['football', 'soccer', 'coach', 'player', 'team', 'training', 'match', 'كرة', 'رياضة', 'تدريب', 'فريق'];
  const sportsMatches = sportsTerms.filter(term => cvText.includes(term));
  scores.sportsRelevance = Math.min(100, sportsMatches.length * 20);

  const overallScore = Math.round(
    (scores.content + scores.formatting + scores.keywords + scores.completeness + scores.sportsRelevance) / 5
  );

  // ATS score calculation
  const atsScore = calculateATSScore(cvData);

  return {
    overallScore,
    categoryScores: scores,
    suggestions,
    strengths,
    weaknesses,
    atsScore,
    atsIssues: atsScore < 70 ? ['قد يحتاج التنسيق لتحسين', 'أضف المزيد من الكلمات المفتاحية'] : []
  };
}

function checkATSCompatibility(cvData) {
  const issues = [];
  const recommendations = [];
  let score = 100;

  // Check for basic info
  const personalInfo = cvData.personalInfo || cvData.basics || {};
  if (!personalInfo.email) {
    issues.push('البريد الإلكتروني مفقود');
    score -= 15;
    recommendations.push('أضف بريدك الإلكتروني');
  }
  if (!personalInfo.phone) {
    issues.push('رقم الهاتف مفقود');
    score -= 10;
    recommendations.push('أضف رقم هاتفك');
  }

  // Check for summary
  if (!personalInfo.summary) {
    issues.push('الملخص المهني مفقود');
    score -= 15;
    recommendations.push('أضف ملخصاً مهنياً واضحاً');
  }

  // Check experience descriptions
  const experience = cvData.experience || cvData.work || [];
  experience.forEach((exp, i) => {
    if (!exp.description || exp.description.length < 50) {
      issues.push(`وصف الوظيفة ${i + 1} قصير جداً`);
      score -= 5;
    }
  });

  // Check skills count
  const skills = cvData.skills || [];
  if (skills.length < 5) {
    issues.push('عدد المهارات قليل');
    score -= 10;
    recommendations.push('أضف 5 مهارات على الأقل');
  }

  return {
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

function calculateATSScore(cvData) {
  let score = 50; // Base score

  const personalInfo = cvData.personalInfo || cvData.basics || {};
  if (personalInfo.email) score += 10;
  if (personalInfo.phone) score += 10;
  if (personalInfo.summary) score += 15;

  const experience = cvData.experience || cvData.work || [];
  if (experience.length > 0) score += 10;

  const skills = cvData.skills || [];
  if (skills.length >= 5) score += 5;

  return Math.min(100, score);
}

function detectMissingSections(cvData) {
  const missingSections = [];
  let completenessScore = 100;
  const sectionWeight = 15;

  const personalInfo = cvData.personalInfo || cvData.basics || {};

  if (!personalInfo.fullName && !personalInfo.name) {
    missingSections.push('الاسم الكامل');
    completenessScore -= sectionWeight;
  }
  if (!personalInfo.email) {
    missingSections.push('البريد الإلكتروني');
    completenessScore -= sectionWeight;
  }
  if (!personalInfo.phone) {
    missingSections.push('رقم الهاتف');
    completenessScore -= sectionWeight;
  }
  if (!personalInfo.summary) {
    missingSections.push('الملخص المهني');
    completenessScore -= sectionWeight;
  }

  const experience = cvData.experience || cvData.work || [];
  if (experience.length === 0) {
    missingSections.push('الخبرات العملية');
    completenessScore -= sectionWeight;
  }

  const education = cvData.education || [];
  if (education.length === 0) {
    missingSections.push('التعليم');
    completenessScore -= sectionWeight;
  }

  const skills = cvData.skills || [];
  if (skills.length === 0) {
    missingSections.push('المهارات');
    completenessScore -= sectionWeight;
  }

  return {
    missingSections,
    completenessScore: Math.max(0, completenessScore)
  };
}

function extractKeywords(text) {
  if (!text) return [];
  
  // Common job keywords
  const importantWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b[a-z]{4,}\b/g) || [];
  return [...new Set(importantWords)].slice(0, 20);
}

function buildCVText(cvData) {
  const parts = [];
  
  const personalInfo = cvData.personalInfo || cvData.basics || {};
  if (personalInfo.summary) parts.push(personalInfo.summary);
  if (personalInfo.title || personalInfo.headline) parts.push(personalInfo.title || personalInfo.headline);

  const experience = cvData.experience || cvData.work || [];
  experience.forEach(exp => {
    if (exp.jobTitle) parts.push(exp.jobTitle);
    if (exp.description) parts.push(exp.description);
  });

  const skills = cvData.skills || [];
  skills.forEach(skill => {
    if (typeof skill === 'string') parts.push(skill);
    else if (skill.name) parts.push(skill.name);
  });

  return parts.join(' ');
}

module.exports = router;
