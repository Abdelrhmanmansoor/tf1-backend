const AppError = require('../../../utils/appError');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'gemini'
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  }

  async generateText(prompt, systemInstruction = '') {
    if (!this.apiKey) {
      console.warn('AI_API_KEY or OPENAI_API_KEY is not set. Returning mock response.');
      return "This is a mock AI response. Please configure AI_API_KEY in your .env file.";
    }

    try {
      if (this.provider === 'openai') {
        return await this.callOpenAI(prompt, systemInstruction);
      } else if (this.provider === 'gemini') {
        return await this.callGemini(prompt, systemInstruction);
      }
    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      throw new AppError('AI service failed to generate text', 500);
    }
  }

  async callOpenAI(prompt, systemInstruction) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'OpenAI API Error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async callGemini(prompt, systemInstruction) {
    // Basic Gemini implementation via REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
            parts: [{ text: systemInstruction + "\n\n" + prompt }]
        }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
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
}

module.exports = new AIService();
