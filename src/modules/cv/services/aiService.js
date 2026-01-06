const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');

/**
 * Professional AI Service for CV/Resume Enhancement
 * Supports OpenAI (GPT-4, GPT-3.5) and Google Gemini
 * Features: 
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Detailed error messages in Arabic/English
 * - Smart fallback responses
 * - Comprehensive logging
 * - Cost optimization
 */
class AIService {
  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4o-mini'; // Default to cost-effective model
    this.timeout = parseInt(process.env.AI_TIMEOUT_MS) || 30000; // 30 seconds
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES) || 2;
    this.enableFallback = process.env.AI_ENABLE_FALLBACK !== 'false'; // Default true
    
    // Validate configuration on initialization
    this._validateConfig();
  }

  /**
   * Validate AI service configuration
   */
  _validateConfig() {
    if (!this.apiKey && this.enableFallback) {
      logger.warn('⚠️ AI_API_KEY not configured. AI features will use fallback responses.');
    } else if (!this.apiKey) {
      logger.error('❌ AI_API_KEY is required but not configured. AI features will fail.');
    } else {
      logger.info(`✅ AI Service initialized: Provider=${this.provider}, Model=${this.model}`);
    }
  }

  /**
   * Creates a fetch request with timeout
   */
  async fetchWithTimeout(url, options, timeoutMs = this.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new AppError('طلب الذكاء الاصطناعي انتهت مهلته. يرجى المحاولة مرة أخرى.', 408);
      }
      throw error;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Last attempt - throw error
        if (i === retries) {
          throw error;
        }

        // Wait before retry (exponential backoff: 1s, 2s, 4s...)
        const delay = Math.pow(2, i) * 1000;
        logger.warn(`AI request failed, retrying...`, {
          attempt: i + 1,
          maxRetries: retries + 1,
          delayMs: delay,
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Generate smart fallback response based on context
   */
  _generateFallbackResponse(systemInstruction = '', prompt = '') {
    logger.info('Using fallback response (AI API not configured)');
    
    // Skills suggestion fallback
    if (systemInstruction.includes('skills') || systemInstruction.includes('مهارات')) {
      return "Communication, Leadership, Teamwork, Problem Solving, Time Management, Adaptability, Work Ethic, Technical Skills, Creativity, Organization";
    }
    
    // Summary generation fallback
    if (systemInstruction.includes('summary') || systemInstruction.includes('ملخص')) {
      try {
        const data = JSON.parse(prompt);
        const name = data.fullName || data.name || 'المتقدم';
        const role = data.role || data.jobTitle || 'محترف';
        const exp = data.experienceYears || data.experience || '';
        return `${name} هو ${role} ${exp ? `بخبرة ${exp} سنوات` : 'محترف'} يتمتع بمهارات قوية في مجاله.`;
      } catch {
        return "محترف ذو خبرة واسعة في مجاله يتمتع بمهارات تقنية وشخصية ممتازة.";
      }
    }
    
    // Description improvement fallback
    if (systemInstruction.includes('improve') || systemInstruction.includes('تحسين')) {
      return prompt + "\n\n• إنجازات قابلة للقياس\n• استخدام أفعال قوية\n• تركيز على النتائج";
    }
    
    // Default fallback
    return "يرجى تكوين AI_API_KEY في ملف .env لاستخدام ميزات الذكاء الاصطناعي الكاملة.";
  }

  async generateText(prompt, systemInstruction = '') {
    if (!this.apiKey) {
      if (this.enableFallback) {
        return this._generateFallbackResponse(systemInstruction, prompt);
      }
      throw new AppError(
        'خدمة الذكاء الاصطناعي غير متاحة. يرجى تكوين AI_API_KEY في ملف .env',
        503
      );
    }

    try {
      return await this.retryWithBackoff(async () => {
        if (this.provider === 'openai') {
          return await this.callOpenAI(prompt, systemInstruction);
        } else if (this.provider === 'gemini') {
          return await this.callGemini(prompt, systemInstruction);
        } else {
          throw new AppError(`مزود AI غير مدعوم: ${this.provider}`, 400);
        }
      });
    } catch (error) {
      logger.error('AI Service Error', {
        provider: this.provider,
        error: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      
      // Enhanced error messages in Arabic with fallback option
      if (error.statusCode === 401 || error.message?.includes('Incorrect API key') || error.message?.includes('Invalid API key')) {
        if (this.enableFallback) {
          logger.warn('API key invalid, using fallback response');
          return this._generateFallbackResponse(systemInstruction, prompt);
        }
        throw new AppError('مفتاح API غير صحيح. يرجى التحقق من AI_API_KEY في ملف .env', 401);
      } else if (error.statusCode === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new AppError('تم تجاوز حد استخدام خدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.', 429);
      } else if (error.statusCode === 408) {
        throw error; // Timeout error already formatted
      } else if (!error.statusCode || error.statusCode >= 500) {
        // Network or server errors - use fallback if enabled
        if (this.enableFallback) {
          logger.warn('AI service unavailable, using fallback response');
          return this._generateFallbackResponse(systemInstruction, prompt);
        }
        throw new AppError('فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصال الإنترنت.', 503);
      }
      
      // Other errors - use fallback if enabled
      if (this.enableFallback) {
        logger.warn('AI request failed, using fallback response', { error: error.message });
        return this._generateFallbackResponse(systemInstruction, prompt);
      }
      
      throw new AppError(`فشل توليد النص بالذكاء الاصطناعي: ${error.message}`, error.statusCode || 500);
    }
  }

  async callOpenAI(prompt, systemInstruction) {
    const startTime = Date.now();
    
    if (!this.openai) {
      throw new AppError('OpenAI SDK not initialized. Missing API Key.', 500);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const duration = Date.now() - startTime;
      logger.debug('OpenAI API call completed', { duration, model: this.model });

      const result = response.choices[0].message.content.trim();
      logger.info('OpenAI API success', { 
        duration,
        tokensUsed: response.usage?.total_tokens,
        model: this.model 
      });

      return result;
    } catch (error) {
      logger.error('OpenAI API Error', { error: error.message });
      const statusCode = error.status || 500;
      const appError = new AppError(error.message || 'OpenAI API Error', statusCode);
      appError.errorData = error;
      throw appError;
    }
  }

  async callGemini(prompt, systemInstruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemInstruction + "\n\n" + prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'Gemini API Error');
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('استجابة غير متوقعة من Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Generate professional CV summary
   * @param {Object} profileData - User profile data
   * @param {String} language - 'ar' or 'en'
   * @returns {Promise<String>} Generated summary
   */
  async generateSummary(profileData, language = 'ar') {
    const systemPrompt = language === 'ar' 
      ? 'أنت خبير في كتابة السير الذاتية الاحترافية. قم بكتابة ملخص مهني احترافي ومقنع (2-4 جمل) بناءً على البيانات المقدمة. ركز على:\n1. الخبرة والسنوات\n2. المهارات الرئيسية\n3. الإنجازات البارزة\n4. القيمة المضافة\nتجنب الزخرفة الزائدة واستخدم لغة احترافية ومناسبة لأنظمة ATS.'
      : 'You are a professional resume writer expert. Write a compelling professional summary (2-4 sentences) based on the provided data. Focus on:\n1. Experience and years\n2. Key skills\n3. Notable achievements\n4. Value proposition\nAvoid excessive decoration and use professional ATS-friendly language.';
    
    const userPrompt = JSON.stringify(profileData, null, 2);
    logger.info('Generating CV summary', { language, hasData: !!profileData });
    return await this.generateText(userPrompt, systemPrompt);
  }

  /**
   * Improve job/experience description to be more professional and ATS-friendly
   * @param {String} description - Original description
   * @param {String} language - 'ar' or 'en'
   * @returns {Promise<String>} Improved description
   */
  async improveDescription(description, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في تحسين أوصاف الوظائف. قم بتحسين الوصف التالي ليكون:\n1. احترافي ومناسب لأنظمة ATS\n2. يستخدم نقاط (Bullet points) واضحة\n3. يبدأ بأفعال قوية (Developed, Managed, Implemented, etc.)\n4. يركز على الإنجازات والنتائج القابلة للقياس\n5. يبرز القيمة المضافة\nأعد كتابة الوصف بشكل كامل ومحسّن.'
      : 'You are an expert in improving job descriptions. Improve the following description to be:\n1. Professional and ATS-friendly\n2. Use clear bullet points\n3. Start with strong action verbs (Developed, Managed, Implemented, etc.)\n4. Focus on measurable achievements and results\n5. Highlight value proposition\nRewrite the description completely and improved.';
    
    logger.info('Improving description', { language, length: description.length });
    return await this.generateText(description, systemPrompt);
  }

  /**
   * Suggest relevant skills for a job title
   * @param {String} jobTitle - Job title or role
   * @param {String} language - 'ar' or 'en'
   * @returns {Promise<String>} Comma-separated list of skills
   */
  async suggestSkills(jobTitle, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? `اقترح قائمة من 10-15 مهارة مهمة للمسمى الوظيفي "${jobTitle}". يجب أن تشمل:\n- مهارات تقنية متخصصة\n- مهارات برمجية/أدوات إن أمكن\n- مهارات شخصية (Soft Skills)\nالمخرجات يجب أن تكون قائمة مفصولة بفواصل فقط، بدون أرقام أو نقاط. مثال: "JavaScript, React, Node.js, Leadership, Problem Solving"`
      : `Suggest a list of 10-15 important skills for the job title "${jobTitle}". Should include:\n- Specialized technical skills\n- Programming/tool skills if applicable\n- Soft skills\nOutput should be a comma-separated list only, no numbers or bullets. Example: "JavaScript, React, Node.js, Leadership, Problem Solving"`;
    
    logger.info('Suggesting skills', { jobTitle, language });
    return await this.generateText(jobTitle, systemPrompt);
  }

  /**
   * Generate cover letter based on job description and candidate profile
   * @param {Object} data - { jobDescription, candidateProfile, companyName }
   * @param {String} language - 'ar' or 'en'
   * @returns {Promise<String>} Generated cover letter
   */
  async generateCoverLetter(data, language = 'ar') {
    const { jobDescription, candidateProfile, companyName } = data;
    
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في كتابة خطابات التقديم الاحترافية. اكتب خطاب تقديم مقنع ومخصص للوظيفة والشركة. يجب أن:\n1. يبدأ بتحية احترافية\n2. يوضح الاهتمام بالوظيفة والشركة\n3. يبرز المهارات والخبرات ذات الصلة\n4. يوضح القيمة المضافة\n5. ينتهي بدعوة للتواصل\nاستخدم لغة احترافية ومهذبة.'
      : 'You are an expert in writing professional cover letters. Write a compelling and customized cover letter for the job and company. Should:\n1. Start with professional greeting\n2. Express interest in the position and company\n3. Highlight relevant skills and experience\n4. Show value proposition\n5. End with call to action\nUse professional and polite language.';
    
    const userPrompt = JSON.stringify({ jobDescription, candidateProfile, companyName }, null, 2);
    logger.info('Generating cover letter', { language, companyName });
    return await this.generateText(userPrompt, systemPrompt);
  }

  /**
   * Optimize CV for ATS (Applicant Tracking System)
   * @param {Object} cvData - Complete CV data
   * @param {String} language - 'ar' or 'en'
   * @returns {Promise<Object>} Optimized CV data with suggestions
   */
  async optimizeForATS(cvData, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في تحسين السير الذاتية لأنظمة ATS. حلل السيرة الذاتية التالية وقدم اقتراحات محددة لتحسينها. ركز على:\n1. استخدام الكلمات المفتاحية المناسبة\n2. تنسيق واضح ومنظم\n3. تجنب الأخطاء الإملائية والنحوية\n4. استخدام أفعال قوية\n5. إبراز الإنجازات القابلة للقياس\nأعد السيرة الذاتية محسّنة مع شرح التحسينات.'
      : 'You are an expert in optimizing resumes for ATS systems. Analyze the following resume and provide specific suggestions for improvement. Focus on:\n1. Using appropriate keywords\n2. Clear and organized formatting\n3. Avoiding spelling and grammar errors\n4. Using strong action verbs\n5. Highlighting measurable achievements\nReturn the optimized resume with explanation of improvements.';
    
    const userPrompt = JSON.stringify(cvData, null, 2);
    logger.info('Optimizing CV for ATS', { language });
    return await this.generateText(userPrompt, systemPrompt);
  }

  /**
   * Validate API key on service initialization
   * @returns {Promise<Object>} Validation result
   */
  async validateApiKey() {
    if (!this.apiKey) {
      return { 
        valid: false, 
        message: 'API key not configured',
        messageAr: 'مفتاح API غير مُكوّن'
      };
    }

    try {
      const startTime = Date.now();
      // Test with minimal request
      await this.generateText('test', 'Respond with "ok"');
      const duration = Date.now() - startTime;
      
      logger.info('AI API key validated successfully', { duration, provider: this.provider });
      return { 
        valid: true, 
        message: 'API key is valid',
        messageAr: 'مفتاح API صحيح',
        provider: this.provider,
        model: this.model
      };
    } catch (error) {
      logger.error('AI API key validation failed', { error: error.message });
      return { 
        valid: false, 
        message: error.message,
        messageAr: error.message.includes('API') ? 'مفتاح API غير صحيح' : 'فشل التحقق من مفتاح API'
      };
    }
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey,
      enableFallback: this.enableFallback,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      configured: !!this.apiKey
    };
  }
}

module.exports = new AIService();
