const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const OpenAI = require('openai');

/**
 * Professional AI Service for CV/Resume Enhancement
 * Features:
 * - OpenAI GPT-4/GPT-3.5 support
 * - Google Gemini support
 * - Intelligent Rule-Based Fallback System (when API unavailable)
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Detailed error messages in Arabic/English
 * - Comprehensive logging
 */
class AIService {
  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    this.timeout = parseInt(process.env.AI_TIMEOUT_MS) || 30000;
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES) || 2;
    this.enableFallback = process.env.AI_ENABLE_FALLBACK !== 'false';
    
    this._validateConfig();
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        timeout: this.timeout
      });
    }
  }

  _validateConfig() {
    if (!this.apiKey && this.enableFallback) {
      logger.warn('⚠️ AI_API_KEY not configured. Using intelligent fallback system.');
    } else if (!this.apiKey) {
      logger.error('❌ AI_API_KEY is required but not configured.');
    } else {
      logger.info(`✅ AI Service initialized: Provider=${this.provider}, Model=${this.model}`);
    }
  }

  /**
   * Intelligent Rule-Based Fallback System
   * This provides professional CV content when AI API is unavailable
   */
  _generateIntelligentFallback(systemInstruction = '', prompt = '', type = '') {
    logger.info('Using intelligent rule-based fallback system');
    
    // Skills suggestion with industry-specific knowledge
    if (type === 'skills' || systemInstruction.includes('skills') || systemInstruction.includes('مهارات')) {
      const jobTitle = (typeof prompt === 'string' ? prompt : '').toLowerCase();
      const skillsMap = {
        'developer': 'JavaScript, React, Node.js, Git, RESTful APIs, Problem Solving, Agile, Team Collaboration, Code Review, Testing',
        'engineer': 'Problem Solving, Technical Analysis, Project Management, CAD Software, Quality Control, Team Leadership, Documentation, Safety Standards',
        'manager': 'Leadership, Strategic Planning, Team Management, Budget Management, Communication, Decision Making, Project Management, Stakeholder Relations',
        'designer': 'Adobe Creative Suite, UI/UX Design, Prototyping, User Research, Typography, Color Theory, Design Systems, Figma',
        'marketing': 'Digital Marketing, SEO, Content Creation, Social Media Management, Analytics, Campaign Management, Brand Management, Market Research',
        'sales': 'Customer Relations, Negotiation, CRM Software, Sales Strategy, Communication, Relationship Building, Target Achievement, Product Knowledge',
        'teacher': 'Curriculum Development, Classroom Management, Student Assessment, Educational Technology, Communication, Lesson Planning, Student Engagement',
        'coach': 'Training Programs, Performance Analysis, Team Building, Communication, Motivation, Strategy Development, Player Development, Sports Psychology',
        'analyst': 'Data Analysis, Excel, SQL, Statistical Analysis, Reporting, Problem Solving, Critical Thinking, Business Intelligence',
        'accountant': 'Financial Reporting, Tax Preparation, Accounting Software, Auditing, Budget Analysis, Compliance, Excel, Attention to Detail'
      };
      
      // Find matching skills
      for (const [key, skills] of Object.entries(skillsMap)) {
        if (jobTitle.includes(key)) {
          return skills;
        }
      }
      
      // Default professional skills
      return 'Communication, Leadership, Teamwork, Problem Solving, Time Management, Adaptability, Work Ethic, Technical Skills, Creativity, Organization, Critical Thinking, Project Management';
    }
    
    // Professional Summary Generation
    if (type === 'summary' || systemInstruction.includes('summary') || systemInstruction.includes('ملخص')) {
      try {
        const data = typeof prompt === 'object' ? prompt : JSON.parse(prompt || '{}');
        const name = data.fullName || data.name || '';
        const role = data.jobTitle || data.role || 'محترف';
        const exp = data.experienceYears || data.experience || '';
        const skills = data.skills || [];
        const education = data.education || [];
        
        const yearsText = exp ? `بخبرة تزيد عن ${exp} ${exp == 1 ? 'سنة' : 'سنوات'}` : 'محترف';
        const skillsText = skills.length > 0 ? `متخصص في ${skills.slice(0, 3).join('، ')}` : 'ذو مهارات متعددة';
        const eduText = education.length > 0 ? `حاصل على ${education[0].degree || 'شهادة'}` : '';
        
        const summary = `${name || 'محترف'} هو ${role} ${yearsText} ${skillsText}. ${eduText ? eduText + '. ' : ''}يتمتع بخبرة واسعة في مجاله وقدرة على تحقيق نتائج متميزة. يمتلك مهارات قوية في التواصل والعمل الجماعي والتفكير الاستراتيجي.`;
        
        return summary;
      } catch {
        return 'محترف ذو خبرة واسعة في مجاله يتمتع بمهارات تقنية وشخصية ممتازة. قادر على تحقيق نتائج متميزة والعمل بكفاءة في بيئات عمل متنوعة.';
      }
    }
    
    // Description Improvement with Professional Templates
    if (type === 'description' || systemInstruction.includes('improve') || systemInstruction.includes('تحسين')) {
      const original = typeof prompt === 'string' ? prompt : '';
      if (!original || original.length < 10) {
        return original;
      }
      
      // Extract key information
      const sentences = original.split(/[.!?]\s+/).filter(s => s.trim());
      
      // Professional improvement patterns
      const improved = sentences.map(sentence => {
        let improved = sentence.trim();
        
        // Add action verbs if missing
        if (!/^(طور|نفذ|أدار|قاد|صمم|أنشأ|حقق|زاد|حسن|طور)/i.test(improved)) {
          const actionVerbs = ['طور', 'نفذ', 'أدار', 'قاد', 'صمم', 'أنشأ', 'حقق', 'زاد', 'حسن'];
          const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
          improved = `${randomVerb} ${improved}`;
        }
        
        // Add measurable results if possible
        if (!/\d+/.test(improved) && improved.length > 20) {
          improved += ' بنجاح';
        }
        
        return improved;
      }).join('. ') + '.';
      
      return improved || original;
    }
    
    // Cover Letter Generation
    if (type === 'coverLetter' || systemInstruction.includes('cover')) {
      const data = typeof prompt === 'object' ? prompt : JSON.parse(prompt || '{}');
      const candidateName = data.candidateProfile?.fullName || 'المتقدم';
      const jobTitle = data.jobDescription?.title || 'الوظيفة';
      const companyName = data.companyName || 'الشركة';
      
      return `السيد/السيدة المحترم/ة،

أكتب إليكم للتعبير عن اهتمامي الكبير بوظيفة ${jobTitle} في ${companyName}.

بصفتي ${data.candidateProfile?.jobTitle || 'محترف'} بخبرة ${data.candidateProfile?.experienceYears || 'واسعة'}، أعتقد أنني مؤهل بشكل جيد لهذا المنصب. ${data.candidateProfile?.skills ? `مهاراتي في ${data.candidateProfile.skills.slice(0, 3).join('، ')}` : 'خبراتي ومهاراتي'} تتوافق بشكل مباشر مع متطلبات الوظيفة.

أنا متحمس لإمكانية المساهمة في نجاح ${companyName} وأتطلع لمناقشة كيف يمكنني إضافة قيمة لفريقكم.

شكراً لوقتكم واهتمامكم.

مع أطيب التحيات،
${candidateName}`;
    }
    
    // Default fallback
    return 'يرجى تكوين AI_API_KEY في ملف .env لاستخدام ميزات الذكاء الاصطناعي الكاملة.';
  }

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

  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
        if (i === retries) {
          throw error;
        }
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

  async generateText(prompt, systemInstruction = '', type = '') {
    // Try API first if available
    if (this.apiKey) {
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
        });
        
        // Use intelligent fallback on error
        if (this.enableFallback) {
          logger.info('Falling back to intelligent rule-based system');
          return this._generateIntelligentFallback(systemInstruction, prompt, type);
        }
        
        // Enhanced error messages
        if (error.statusCode === 401) {
          throw new AppError('مفتاح API غير صحيح. يرجى التحقق من AI_API_KEY في ملف .env', 401);
        } else if (error.statusCode === 429) {
          throw new AppError('تم تجاوز حد استخدام خدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.', 429);
        } else if (error.statusCode === 408) {
          throw error;
        }
        
        throw new AppError(`فشل توليد النص بالذكاء الاصطناعي: ${error.message}`, error.statusCode || 500);
      }
    }
    
    // No API key - use intelligent fallback
    if (this.enableFallback) {
      return this._generateIntelligentFallback(systemInstruction, prompt, type);
    }
    
    throw new AppError('خدمة الذكاء الاصطناعي غير متاحة. يرجى تكوين AI_API_KEY في ملف .env', 503);
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
          { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2) }
        ],
        temperature: 0.7,
        max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
      });

      const duration = Date.now() - startTime;
      logger.info('OpenAI API success', { 
        duration,
        tokensUsed: response.usage?.total_tokens,
        model: this.model 
      });

      return response.choices[0].message.content.trim();
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
          parts: [{ text: systemInstruction + "\n\n" + (typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2)) }]
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

  async generateSummary(profileData, language = 'ar') {
    const systemPrompt = language === 'ar' 
      ? 'أنت خبير في كتابة السير الذاتية الاحترافية. قم بكتابة ملخص مهني احترافي ومقنع (2-4 جمل) بناءً على البيانات المقدمة. ركز على:\n1. الخبرة والسنوات\n2. المهارات الرئيسية\n3. الإنجازات البارزة\n4. القيمة المضافة\nتجنب الزخرفة الزائدة واستخدم لغة احترافية ومناسبة لأنظمة ATS.'
      : 'You are a professional resume writer expert. Write a compelling professional summary (2-4 sentences) based on the provided data. Focus on:\n1. Experience and years\n2. Key skills\n3. Notable achievements\n4. Value proposition\nAvoid excessive decoration and use professional ATS-friendly language.';
    
    logger.info('Generating CV summary', { language, hasData: !!profileData });
    return await this.generateText(profileData, systemPrompt, 'summary');
  }

  async improveDescription(description, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في تحسين أوصاف الوظائف. قم بتحسين الوصف التالي ليكون:\n1. احترافي ومناسب لأنظمة ATS\n2. يستخدم نقاط (Bullet points) واضحة\n3. يبدأ بأفعال قوية (Developed, Managed, Implemented, etc.)\n4. يركز على الإنجازات والنتائج القابلة للقياس\n5. يبرز القيمة المضافة\nأعد كتابة الوصف بشكل كامل ومحسّن.'
      : 'You are an expert in improving job descriptions. Improve the following description to be:\n1. Professional and ATS-friendly\n2. Use clear bullet points\n3. Start with strong action verbs (Developed, Managed, Implemented, etc.)\n4. Focus on measurable achievements and results\n5. Highlight value proposition\nRewrite the description completely and improved.';
    
    logger.info('Improving description', { language, length: description.length });
    return await this.generateText(description, systemPrompt, 'description');
  }

  async suggestSkills(jobTitle, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? `اقترح قائمة من 10-15 مهارة مهمة للمسمى الوظيفي "${jobTitle}". يجب أن تشمل:\n- مهارات تقنية متخصصة\n- مهارات برمجية/أدوات إن أمكن\n- مهارات شخصية (Soft Skills)\nالمخرجات يجب أن تكون قائمة مفصولة بفواصل فقط، بدون أرقام أو نقاط. مثال: "JavaScript, React, Node.js, Leadership, Problem Solving"`
      : `Suggest a list of 10-15 important skills for the job title "${jobTitle}". Should include:\n- Specialized technical skills\n- Programming/tool skills if applicable\n- Soft skills\nOutput should be a comma-separated list only, no numbers or bullets. Example: "JavaScript, React, Node.js, Leadership, Problem Solving"`;
    
    logger.info('Suggesting skills', { jobTitle, language });
    return await this.generateText(jobTitle, systemPrompt, 'skills');
  }

  async generateCoverLetter(data, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في كتابة خطابات التقديم الاحترافية. اكتب خطاب تقديم مقنع ومخصص للوظيفة والشركة. يجب أن:\n1. يبدأ بتحية احترافية\n2. يوضح الاهتمام بالوظيفة والشركة\n3. يبرز المهارات والخبرات ذات الصلة\n4. يوضح القيمة المضافة\n5. ينتهي بدعوة للتواصل\nاستخدم لغة احترافية ومهذبة.'
      : 'You are an expert in writing professional cover letters. Write a compelling and customized cover letter for the job and company. Should:\n1. Start with professional greeting\n2. Express interest in the position and company\n3. Highlight relevant skills and experience\n4. Show value proposition\n5. End with call to action\nUse professional and polite language.';
    
    logger.info('Generating cover letter', { language, companyName: data.companyName });
    return await this.generateText(data, systemPrompt, 'coverLetter');
  }

  async optimizeForATS(cvData, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'أنت خبير في تحسين السير الذاتية لأنظمة ATS. حلل السيرة الذاتية التالية وقدم اقتراحات محددة لتحسينها. ركز على:\n1. استخدام الكلمات المفتاحية المناسبة\n2. تنسيق واضح ومنظم\n3. تجنب الأخطاء الإملائية والنحوية\n4. استخدام أفعال قوية\n5. إبراز الإنجازات القابلة للقياس\nأعد السيرة الذاتية محسّنة مع شرح التحسينات.'
      : 'You are an expert in optimizing resumes for ATS systems. Analyze the following resume and provide specific suggestions for improvement. Focus on:\n1. Using appropriate keywords\n2. Clear and organized formatting\n3. Avoiding spelling and grammar errors\n4. Using strong action verbs\n5. Highlighting measurable achievements\nReturn the optimized resume with explanation of improvements.';
    
    logger.info('Optimizing CV for ATS', { language });
    return await this.generateText(cvData, systemPrompt, 'optimizeATS');
  }

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
      await this.generateText('test', 'Respond with "ok"', 'test');
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
