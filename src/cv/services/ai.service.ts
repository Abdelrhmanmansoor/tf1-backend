import { Injectable } from '@nestjs/common';
import { OpenAIService } from 'src/integrations/openai';
import { CVData } from 'src/cv/parsers';

/**
 * CV Analysis Result Interface
 */
export interface CVAnalysis {
  score: number; // Overall score (0-100)
  scores: {
    formatting: number;
    content: number;
    keywords: number;
    structure: number;
    completeness: number;
  };
  suggestions: CVSuggestion[];
  keywords: {
    present: string[];
    missing: string[];
    suggested: string[];
  };
  strengths: string[];
  weaknesses: string[];
  atsCompatibility: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

export interface CVSuggestion {
  type: 'critical' | 'important' | 'optional';
  category: 'content' | 'formatting' | 'keywords' | 'structure';
  message: string;
  section?: string;
  actionable: string;
}

/**
 * Job Tailoring Result
 */
export interface TailoredCV {
  originalCV: CVData;
  tailoredCV: CVData;
  changes: {
    section: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }[];
  matchScore: number;
  improvements: string[];
}

/**
 * CV AI Service
 * 
 * Provides AI-powered features for CV building:
 * - Content generation (summaries, descriptions)
 * - CV analysis and scoring
 * - Job-specific tailoring
 * - Keyword optimization
 * - ATS compatibility checking
 */
@Injectable()
export class CVAIService {
  constructor(private openaiService: OpenAIService) {}

  /**
   * Generate a professional summary based on CV data
   * 
   * @param cvData - The CV data
   * @param language - Target language (en/ar)
   * @returns Generated professional summary
   */
  async generateSummary(
    cvData: CVData,
    language: 'en' | 'ar' = 'en',
  ): Promise<string> {
    const currentJob = cvData.experience[0];
    const totalYears = this.calculateTotalExperience(cvData.experience);
    const topSkills = cvData.skills.slice(0, 5).map((s) => s.name).join(', ');

    const prompt =
      language === 'ar'
        ? `اكتب ملخصاً احترافياً لسيرة ذاتية بناءً على المعلومات التالية:

المسمى الوظيفي الحالي: ${currentJob?.jobTitle || 'محترف'}
سنوات الخبرة: ${totalYears}
المهارات الرئيسية: ${topSkills}
عدد الشركات: ${cvData.experience.length}

اكتب ملخصاً احترافياً من 3-4 جمل يبرز:
1. الخبرة والمسمى الوظيفي
2. المهارات الرئيسية
3. الإنجازات المهمة
4. القيمة المضافة للشركة

يجب أن يكون الملخص:
- احترافي وجذاب
- متوافق مع أنظمة ATS
- مركز على النتائج
- مكتوب بضمير المتكلم (أنا/لدي خبرة)

الملخص فقط بدون مقدمات:`
        : `Write a professional summary for a CV based on the following information:

Current Position: ${currentJob?.jobTitle || 'Professional'}
Years of Experience: ${totalYears}
Top Skills: ${topSkills}
Number of Companies: ${cvData.experience.length}

Write a professional 3-4 sentence summary that highlights:
1. Experience and position
2. Core competencies
3. Key achievements
4. Value proposition

The summary should be:
- Professional and compelling
- ATS-friendly
- Results-oriented
- Written in first person

Summary only, no preamble:`;

    return await this.openaiService.complete(prompt, {
      temperature: 0.8,
      maxTokens: 250,
    });
  }

  /**
   * Improve a job description to be more professional and ATS-friendly
   * 
   * @param description - Original description
   * @param jobTitle - Job title for context
   * @param language - Target language
   * @returns Improved description
   */
  async improveJobDescription(
    description: string,
    jobTitle: string,
    language: 'en' | 'ar' = 'en',
  ): Promise<string> {
    const prompt =
      language === 'ar'
        ? `حسّن وصف الوظيفة التالي ليكون أكثر احترافية ومتوافقاً مع أنظمة ATS:

المسمى الوظيفي: ${jobTitle}
الوصف الحالي: ${description}

التحسينات المطلوبة:
1. استخدم أفعالاً قوية (أدرت، طورت، قدت، حققت)
2. أضف أرقام ونتائج قابلة للقياس
3. ركز على الإنجازات وليس المهام
4. اجعله متوافقاً مع ATS
5. استخدم كلمات مفتاحية صناعية

الوصف المحسّن فقط:`
        : `Improve the following job description to be more professional and ATS-friendly:

Job Title: ${jobTitle}
Current Description: ${description}

Improvements needed:
1. Use strong action verbs (managed, developed, led, achieved)
2. Add quantifiable results and metrics
3. Focus on achievements, not tasks
4. Make it ATS-compatible
5. Use industry keywords

Improved description only:`;

    return await this.openaiService.complete(prompt, {
      temperature: 0.7,
      maxTokens: 300,
    });
  }

  /**
   * Analyze CV and provide comprehensive feedback
   * 
   * @param cvData - The CV to analyze
   * @returns Detailed analysis with scores and suggestions
   */
  async analyzeCV(cvData: CVData): Promise<CVAnalysis> {
    const analysis = await this.openaiService.completeJSON<CVAnalysis>(
      `Analyze this CV and provide detailed feedback:

${JSON.stringify(cvData, null, 2)}

Provide analysis in the following JSON format:
{
  "score": <overall score 0-100>,
  "scores": {
    "formatting": <0-100>,
    "content": <0-100>,
    "keywords": <0-100>,
    "structure": <0-100>,
    "completeness": <0-100>
  },
  "suggestions": [
    {
      "type": "critical|important|optional",
      "category": "content|formatting|keywords|structure",
      "message": "specific suggestion",
      "section": "section name",
      "actionable": "what to do"
    }
  ],
  "keywords": {
    "present": ["keyword1", "keyword2"],
    "missing": ["keyword3"],
    "suggested": ["keyword4"]
  },
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "atsCompatibility": {
    "score": <0-100>,
    "issues": ["issue1"],
    "recommendations": ["rec1"]
  }
}

Consider:
- Formatting consistency
- Content quality and professionalism
- Keyword optimization for ATS
- Structure and organization
- Completeness of information
- Quantifiable achievements
- Action verbs usage
- Industry-specific terminology`,
      {
        score: 85,
        scores: { formatting: 0, content: 0, keywords: 0, structure: 0, completeness: 0 },
        suggestions: [],
        keywords: { present: [], missing: [], suggested: [] },
        strengths: [],
        weaknesses: [],
        atsCompatibility: { score: 0, issues: [], recommendations: [] },
      },
    );

    return analysis;
  }

  /**
   * Tailor CV for a specific job description
   * 
   * @param cvData - Original CV
   * @param jobDescription - Target job description
   * @returns Tailored CV with changes documented
   */
  async tailorCVForJob(
    cvData: CVData,
    jobDescription: string,
  ): Promise<TailoredCV> {
    const prompt = `Tailor this CV for the following job:

CV DATA:
${JSON.stringify(cvData, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Provide a tailored version that:
1. Emphasizes relevant experience
2. Highlights matching skills
3. Uses keywords from job description
4. Reorders sections for relevance
5. Optimizes for ATS matching

Return JSON with:
{
  "tailoredCV": <modified CV data>,
  "changes": [
    {
      "section": "section name",
      "field": "field name",
      "oldValue": "old value",
      "newValue": "new value",
      "reason": "why changed"
    }
  ],
  "matchScore": <0-100 match percentage>,
  "improvements": ["improvement1", "improvement2"]
}`;

    const result = await this.openaiService.completeJSON<{
      tailoredCV: CVData;
      changes: TailoredCV['changes'];
      matchScore: number;
      improvements: string[];
    }>(prompt);

    return {
      originalCV: cvData,
      tailoredCV: result.tailoredCV,
      changes: result.changes,
      matchScore: result.matchScore,
      improvements: result.improvements,
    };
  }

  /**
   * Generate bullet points for experience/education
   * 
   * @param context - Context (job title, company, etc.)
   * @param count - Number of bullet points
   * @param language - Target language
   * @returns Array of bullet points
   */
  async generateBulletPoints(
    context: {
      jobTitle: string;
      company?: string;
      industry?: string;
    },
    count: number = 3,
    language: 'en' | 'ar' = 'en',
  ): Promise<string[]> {
    const prompt =
      language === 'ar'
        ? `اكتب ${count} نقاط إنجاز احترافية لهذه الوظيفة:

المسمى الوظيفي: ${context.jobTitle}
${context.company ? `الشركة: ${context.company}` : ''}
${context.industry ? `المجال: ${context.industry}` : ''}

كل نقطة يجب أن:
- تبدأ بفعل قوي
- تتضمن نتيجة قابلة للقياس
- تكون محددة وواضحة
- لا تتجاوز سطرين

أعد النقاط كـ JSON array فقط:
["نقطة 1", "نقطة 2", "نقطة 3"]`
        : `Write ${count} professional achievement bullet points for this position:

Job Title: ${context.jobTitle}
${context.company ? `Company: ${context.company}` : ''}
${context.industry ? `Industry: ${context.industry}` : ''}

Each bullet should:
- Start with a strong action verb
- Include quantifiable results
- Be specific and clear
- Be no longer than 2 lines

Return as JSON array only:
["bullet 1", "bullet 2", "bullet 3"]`;

    const bullets = await this.openaiService.completeJSON<string[]>(prompt);
    return bullets;
  }

  /**
   * Suggest skills based on job title and experience
   * 
   * @param jobTitle - Current/target job title
   * @param currentSkills - Already listed skills
   * @returns Suggested skills to add
   */
  async suggestSkills(
    jobTitle: string,
    currentSkills: string[],
  ): Promise<string[]> {
    const prompt = `Suggest relevant skills for a ${jobTitle} that are NOT in this list:

Current Skills: ${currentSkills.join(', ')}

Suggest 10 important skills that are:
- Industry-relevant
- In-demand
- Professional
- Specific to the role

Return as JSON array of skill names only.`;

    const skills = await this.openaiService.completeJSON<string[]>(prompt);
    return skills;
  }

  /**
   * Generate a cover letter based on CV and job
   * 
   * @param cvData - CV data
   * @param jobDescription - Job description
   * @param companyName - Company name
   * @param language - Target language
   * @returns Generated cover letter
   */
  async generateCoverLetter(
    cvData: CVData,
    jobDescription: string,
    companyName: string,
    language: 'en' | 'ar' = 'en',
  ): Promise<string> {
    const prompt =
      language === 'ar'
        ? `اكتب خطاب تقديم احترافي بناءً على:

المتقدم: ${cvData.personalInfo.fullName}
الوظيفة المستهدفة: من الوصف الوظيفي
الشركة: ${companyName}

بيانات السيرة الذاتية:
${JSON.stringify(cvData, null, 2)}

الوصف الوظيفي:
${jobDescription}

اكتب خطاب تقديم احترافي (3-4 فقرات):
1. مقدمة تعبر عن الاهتمام بالوظيفة
2. ربط الخبرات بمتطلبات الوظيفة
3. إبراز الإنجازات الرئيسية
4. خاتمة قوية تدعو للتواصل

الخطاب فقط بدون مقدمات:`
        : `Write a professional cover letter based on:

Applicant: ${cvData.personalInfo.fullName}
Target Position: From job description
Company: ${companyName}

CV Data:
${JSON.stringify(cvData, null, 2)}

Job Description:
${jobDescription}

Write a professional cover letter (3-4 paragraphs):
1. Opening expressing interest
2. Connecting experience to requirements
3. Highlighting key achievements
4. Strong closing with call to action

Cover letter only, no preamble:`;

    return await this.openaiService.complete(prompt, {
      temperature: 0.8,
      maxTokens: 600,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate total years of experience
   */
  private calculateTotalExperience(experience: any[]): number {
    if (!experience || experience.length === 0) return 0;

    let totalMonths = 0;

    for (const exp of experience) {
      const start = new Date(exp.startDate);
      const end = exp.currentlyWorking ? new Date() : new Date(exp.endDate);
      const months = this.monthsDifference(start, end);
      totalMonths += months;
    }

    return Math.round(totalMonths / 12);
  }

  /**
   * Calculate months between two dates
   */
  private monthsDifference(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }

  /**
   * Extract keywords from text using AI
   */
  async extractKeywords(text: string, count: number = 10): Promise<string[]> {
    const prompt = `Extract the ${count} most important keywords from this text:

${text}

Return as JSON array of keywords only.`;

    return await this.openaiService.completeJSON<string[]>(prompt);
  }

  /**
   * Check if content is professional and appropriate
   */
  async moderateContent(content: string): Promise<boolean> {
    const moderation = await this.openaiService.moderate(content);
    return !moderation.flagged;
  }
}
