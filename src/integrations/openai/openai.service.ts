import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * OpenAI Integration Service
 * 
 * Provides direct integration with OpenAI's GPT models
 * for text generation, embeddings, and other AI tasks.
 */
@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4';
    this.defaultTemperature = 0.7;
  }

  /**
   * Generate text completion using GPT
   * 
   * @param prompt - The prompt to send to GPT
   * @param options - Optional configuration
   * @returns Generated text
   */
  async complete(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemMessage?: string;
    },
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (options?.systemMessage) {
        messages.push({
          role: 'system',
          content: options.systemMessage,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const completion = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens || 800,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Generate structured JSON response using GPT
   * 
   * @param prompt - The prompt to send to GPT
   * @param schema - Expected JSON structure
   * @returns Parsed JSON object
   */
  async completeJSON<T = any>(
    prompt: string,
    schema?: Record<string, any>,
  ): Promise<T> {
    try {
      const systemMessage = schema
        ? `You are a helpful assistant that always responds with valid JSON matching this schema: ${JSON.stringify(schema)}`
        : 'You are a helpful assistant that always responds with valid JSON.';

      const response = await this.complete(prompt, {
        systemMessage,
        temperature: 0.3, // Lower temperature for more deterministic JSON
      });

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('OpenAI JSON completion error:', error);
      throw new Error(`Failed to generate JSON: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text
   * 
   * @param text - Text to embed
   * @returns Vector embedding
   */
  async embed(text: string): Promise<number[]> {
    try {
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return embedding.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   * 
   * @param texts - Array of texts to embed
   * @returns Array of vector embeddings
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
      });

      return embedding.data.map((item) => item.embedding);
    } catch (error) {
      console.error('OpenAI batch embedding error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Moderate content using OpenAI's moderation API
   * 
   * @param content - Content to moderate
   * @returns Moderation results
   */
  async moderate(content: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    scores: Record<string, number>;
  }> {
    try {
      const moderation = await this.openai.moderations.create({
        input: content,
      });

      const result = moderation.results[0];

      return {
        flagged: result.flagged,
        categories: result.categories as Record<string, boolean>,
        scores: result.category_scores as Record<string, number>,
      };
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      throw new Error(`Failed to moderate content: ${error.message}`);
    }
  }

  /**
   * Generate completion with retry logic
   * 
   * @param prompt - The prompt
   * @param maxRetries - Maximum number of retries
   * @returns Generated text
   */
  async completeWithRetry(
    prompt: string,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.complete(prompt);
      } catch (error) {
        lastError = error;
        console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
        
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
      }
    }

    throw lastError;
  }

  /**
   * Stream completion (for real-time responses)
   * 
   * @param prompt - The prompt
   * @param onChunk - Callback for each chunk
   */
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        temperature: this.defaultTemperature,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error(`Failed to stream completion: ${error.message}`);
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Test the connection to OpenAI
   */
  async test(): Promise<boolean> {
    try {
      await this.complete('Say "OK" if you can hear me.', {
        maxTokens: 10,
      });
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
