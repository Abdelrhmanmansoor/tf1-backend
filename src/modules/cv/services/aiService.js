const AppError = require('../../../utils/appError');

/**
 * AI Service for CV/Resume Enhancement
 * Supports OpenAI and Google Gemini
 * Features: retry logic, timeout handling, detailed error messages
 */
class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'gemini'
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    this.timeout = 30000; // 30 seconds timeout
    this.maxRetries = 2; // Maximum retry attempts
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
        console.log(`محاولة ${i + 1} فشلت. إعادة المحاولة بعد ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async generateText(prompt, systemInstruction = '') {
    if (!this.apiKey) {
      console.warn('⚠️ AI_API_KEY غير موجود. يتم إرجاع استجابة تجريبية.');
      
      // Smart mock response based on instruction
      if (systemInstruction && (systemInstruction.includes('comma-separated') || systemInstruction.includes('skills'))) {
        return "Communication, Leadership, Teamwork, Problem Solving, Time Management, Adaptability, Work Ethic, Technical Skills, Creativity, Organization";
      }
      
      return "هذا نص تجريبي. يرجى تكوين AI_API_KEY في ملف .env الخاص بك.";
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
      console.error('❌ AI Service Error:', error.response?.data || error.message);
      
      // Enhanced error messages in Arabic
      if (error.statusCode === 401 || error.message?.includes('Incorrect API key')) {
        throw new AppError('مفتاح API غير صحيح. يرجى التحقق من AI_API_KEY في ملف .env', 401);
      } else if (error.statusCode === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new AppError('تم تجاوز حد استخدام خدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.', 429);
      } else if (error.statusCode === 408) {
        throw error; // Timeout error already formatted
      } else if (!error.statusCode) {
        throw new AppError('فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصال الإنترنت.', 503);
      }
      
      throw new AppError(`فشل توليد النص بالذكاء الاصطناعي: ${error.message}`, error.statusCode || 500);
    }
  }

  async callOpenAI(prompt, systemInstruction) {
    const response = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', 
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || 'OpenAI API Error');
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('استجابة غير متوقعة من OpenAI API');
    }

    return data.choices[0].message.content.trim();
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

  async generateSummary(profileData, language = 'ar') {
    const systemPrompt = language === 'ar' 
      ? 'أنت مساعد مهني متخصص في كتابة السير الذاتية. قم بصياغة ملخص مهني احترافي ومختصر بناءً على البيانات المقدمة. تجنب الزخرفة الزائدة وركز على الإنجازات والمهارات.'
      : 'You are a professional resume writer. Write a professional and concise professional summary based on the provided data. Focus on achievements and skills.';
    
    const userPrompt = JSON.stringify(profileData);
    return await this.generateText(userPrompt, systemPrompt);
  }

  async improveDescription(description, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? 'قم بتحسين وصف الوظيفة التالي ليكون أكثر احترافية ومناسباً لأنظمة ATS. استخدم نقاط (Bullet points) وابدأ بأفعال قوية.'
      : 'Improve the following job description to be professional and ATS-friendly. Use bullet points and start with action verbs.';
    
    return await this.generateText(description, systemPrompt);
  }

  async suggestSkills(jobTitle, language = 'ar') {
    const systemPrompt = language === 'ar'
      ? `اقترح قائمة من 10 مهارات تقنية وشخصية مهمة للمسمى الوظيفي: ${jobTitle}. المخرجات يجب أن تكون قائمة مفصولة بفواصل فقط.`
      : `Suggest a list of 10 technical and soft skills relevant to the job title: ${jobTitle}. Output should be a comma-separated list only.`;
    
    return await this.generateText(jobTitle, systemPrompt);
  }

  /**
   * Validate API key on service initialization (optional)
   */
  async validateApiKey() {
    if (!this.apiKey) {
      return { valid: false, message: 'API key not configured' };
    }

    try {
      // Test with minimal request
      await this.generateText('test', 'Respond with "ok"');
      return { valid: true, message: 'API key is valid' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }
}

module.exports = new AIService();
