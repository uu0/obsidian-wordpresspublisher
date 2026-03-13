import { requestUrl, RequestUrlParam } from 'obsidian';
import { createModuleLogger } from './utils/logger';

const log = createModuleLogger('AIService');

export interface AIConfig {
  provider: 'openai' | 'claude';
  baseURL: string;
  /**
   * API key for the AI service (runtime only, never persisted as plaintext).
   * Optional because on-disk representation uses encryptedApiKey instead.
   */
  apiKey?: string;
  /**
   * Encrypted API key stored on disk.
   */
  encryptedApiKey?: {
    encrypted: string;
    key?: string;
    vector?: string;
  };
  model: string;
}

export interface AIServiceConfig {
  textAI: AIConfig;
  imageAI: AIConfig;
}

/**
 * AI service options
 */
export interface AIServiceOptions {
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
}

/**
 * Default AI service options
 */
const DEFAULT_OPTIONS: Required<AIServiceOptions> = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  retryDelay: 1000 // 1 second base delay
};

/**
 * Custom error class for AI service
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API request with retry and timeout support
 */
async function apiRequestWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: Required<AIServiceOptions>
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AIServiceError(
          'Request timeout',
          'TIMEOUT',
          undefined,
          true
        )), options.timeout);
      });

      // Make the request with timeout
      const requestPromise = async () => {
        const params: RequestUrlParam = {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(body),
          throw: false
        };

        log.debug('API request', { url, model: (body as any)?.model, attempt });
        const response = await requestUrl(params);

        if (response.status < 200 || response.status >= 300) {
          // Extract error details
          let errorDetail = '';
          try {
            const errorBody = response.json;
            if (errorBody?.error?.message) {
              errorDetail = errorBody.error.message;
            } else if (errorBody?.error) {
              errorDetail = typeof errorBody.error === 'string'
                ? errorBody.error
                : JSON.stringify(errorBody.error);
            } else if (errorBody?.message) {
              errorDetail = errorBody.message;
            } else {
              errorDetail = JSON.stringify(errorBody);
            }
          } catch {
            errorDetail = response.text || '(empty response body)';
          }

          // Determine if error is retryable
          const isRetryable = response.status === 429 || // Rate limit
                             response.status === 503 || // Service unavailable
                             response.status === 504;  // Gateway timeout

          throw new AIServiceError(
            `HTTP ${response.status}: ${errorDetail}`,
            `HTTP_${response.status}`,
            response.status,
            isRetryable
          );
        }

        return response.json;
      };

      const result = await Promise.race([requestPromise(), timeoutPromise]);

      // Validate response
      if (!result) {
        throw new AIServiceError(
          'Empty response from API',
          'EMPTY_RESPONSE',
          undefined,
          true
        );
      }

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      const isRetryable = error instanceof AIServiceError && error.retryable;

      log.warn(`API request attempt ${attempt}/${options.maxRetries} failed`, {
        error: lastError.message,
        retryable: isRetryable
      });

      // Don't retry if not retryable or last attempt
      if (!isRetryable || attempt === options.maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = options.retryDelay * Math.pow(2, attempt - 1);
      log.debug(`Waiting ${delay}ms before retry`);
      await sleep(delay);
    }
  }

  // All retries failed
  throw new AIServiceError(
    `API request failed after ${options.maxRetries} attempts: ${lastError?.message}`,
    lastError instanceof AIServiceError ? lastError.code : 'UNKNOWN',
    lastError instanceof AIServiceError ? lastError.statusCode : undefined,
    false
  );
}

export class AIService {
  private options: Required<AIServiceOptions>;

  constructor(
    private config: AIServiceConfig,
    options?: AIServiceOptions
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    log.debug('AIService initialized', { provider: config.textAI.provider });
  }

  /**
   * Validate AI configuration
   */
  async validateConfig(config: AIConfig, isImageModel: boolean = false): Promise<{ valid: boolean; error?: string }> {
    // Basic validation
    if (!config.provider || !['openai', 'claude'].includes(config.provider)) {
      return { valid: false, error: 'Invalid or missing provider' };
    }

    if (!config.baseURL || !this.isValidUrl(config.baseURL)) {
      return { valid: false, error: 'Invalid or missing baseURL' };
    }

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return { valid: false, error: 'Invalid or missing apiKey' };
    }

    if (!config.model || config.model.trim().length === 0) {
      return { valid: false, error: 'Invalid or missing model' };
    }

    // apiKey is guaranteed non-empty by the guard above
    const apiKey = config.apiKey!;

    try {
      if (config.provider === 'openai') {
        const baseURL = config.baseURL.replace(/\/+$/, '');
        const endpoint = isImageModel ? '/images/generations' : '/chat/completions';
        const requestBody = isImageModel
          ? { model: config.model, prompt: 'test', n: 1, size: '1024x1024' }
          : { model: config.model, messages: [{ role: 'user', content: 'test' }], max_tokens: 5 };

        await apiRequestWithRetry(
          `${baseURL}${endpoint}`,
          { 'Authorization': `Bearer ${apiKey}` },
          requestBody,
          { ...this.options, maxRetries: 1 } // Only try once for validation
        );

        return { valid: true };
      } else if (config.provider === 'claude') {
        const baseURL = config.baseURL.replace(/\/+$/, '');
        await apiRequestWithRetry(
          `${baseURL}/messages`,
          {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          {
            model: config.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          },
          { ...this.options, maxRetries: 1 }
        );

        return { valid: true };
      }

      return { valid: false, error: 'Unsupported provider' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('Configuration validation failed', error);
      return { valid: false, error: errorMsg };
    }
  }

  /**
   * Generate text content with retry and timeout
   */
  async generateText(prompt: string, options?: Partial<AIServiceOptions>): Promise<string> {
    const opts = { ...this.options, ...options };
    const config = this.config.textAI;
    const baseURL = config.baseURL.replace(/\/+$/, '');
    const apiKey = config.apiKey ?? '';

    log.debug('Generating text', { provider: config.provider, model: config.model });

    try {
      if (config.provider === 'openai') {
        const data = await apiRequestWithRetry(
          `${baseURL}/chat/completions`,
          { 'Authorization': `Bearer ${apiKey}` },
          {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
          },
          opts
        );

        const result = data?.choices?.[0]?.message?.content || '';
        
        if (!result || result.trim().length === 0) {
          throw new AIServiceError(
            'Empty response from AI',
            'EMPTY_RESPONSE',
            undefined,
            false
          );
        }

        log.debug('Text generated successfully', { length: result.length });
        return result;

      } else if (config.provider === 'claude') {
        const data = await apiRequestWithRetry(
          `${baseURL}/messages`,
          {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          {
            model: config.model,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          },
          opts
        );

        const textContent = data?.content?.find((c: any) => c.type === 'text');
        const result = textContent?.text || '';

        if (!result || result.trim().length === 0) {
          throw new AIServiceError(
            'Empty response from AI',
            'EMPTY_RESPONSE',
            undefined,
            false
          );
        }

        log.debug('Text generated successfully', { length: result.length });
        return result;
      }

      throw new AIServiceError('Unsupported provider', 'UNSUPPORTED_PROVIDER', undefined, false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('Text generation failed', error);
      throw new AIServiceError(
        `AI text generation failed: ${errorMsg}`,
        error instanceof AIServiceError ? error.code : 'UNKNOWN',
        error instanceof AIServiceError ? error.statusCode : undefined,
        error instanceof AIServiceError ? error.retryable : false
      );
    }
  }

  /**
   * Generate image with retry and timeout
   */
  async generateImage(prompt: string, options?: Partial<AIServiceOptions>): Promise<string> {
    const opts = { ...this.options, ...options };
    const config = this.config.imageAI;
    const baseURL = config.baseURL.replace(/\/+$/, '');
    const apiKey = config.apiKey ?? '';

    log.debug('Generating image', { provider: config.provider, model: config.model });

    try {
      if (config.provider === 'openai') {
        const data = await apiRequestWithRetry(
          `${baseURL}/images/generations`,
          { 'Authorization': `Bearer ${apiKey}` },
          {
            model: config.model,
            prompt: prompt,
            n: 1,
            size: '1024x1024'
          },
          opts
        );

        if (!data?.data || data.data.length === 0) {
          throw new AIServiceError(
            'No image generated',
            'NO_IMAGE',
            undefined,
            false
          );
        }

        const imageUrl = data.data[0]?.url;
        if (!imageUrl) {
          throw new AIServiceError(
            'No image URL in response',
            'NO_IMAGE_URL',
            undefined,
            false
          );
        }

        log.debug('Image generated successfully', { url: imageUrl });
        return imageUrl;

      } else {
        throw new AIServiceError(
          'Claude does not support direct image generation',
          'UNSUPPORTED_OPERATION',
          undefined,
          false
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      log.error('Image generation failed', error);
      throw new AIServiceError(
        `AI image generation failed: ${errorMsg}`,
        error instanceof AIServiceError ? error.code : 'UNKNOWN',
        error instanceof AIServiceError ? error.statusCode : undefined,
        error instanceof AIServiceError ? error.retryable : false
      );
    }
  }

  /**
   * Translate Chinese title to English slug
   */
  async translateToSlug(title: string): Promise<string> {
    const prompt = `将以下中文标题翻译成简洁的英文，只返回翻译结果，单词之间用空格分隔，不要有标点符号：\n\n${title}`;

    try {
      const translation = await this.generateText(prompt);
      const slug = translation
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      log.debug('Title translated to slug', { title, slug });
      return slug;
    } catch (error) {
      throw new AIServiceError(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof AIServiceError ? error.code : 'TRANSLATION_FAILED',
        error instanceof AIServiceError ? error.statusCode : undefined,
        error instanceof AIServiceError ? error.retryable : false
      );
    }
  }

  /**
   * Generate summary from content
   */
  async generateSummary(content: string, maxLength: number = 200): Promise<string> {
    const truncatedContent = content.substring(0, 2000);
    const prompt = `请为以下文章生成一个简洁的摘要，不超过${maxLength}字：\n\n${truncatedContent}`;

    log.debug('Generating summary', { contentLength: truncatedContent.length, maxLength });
    return this.generateText(prompt);
  }

  /**
   * Generate image prompt from title and content
   */
  async generateImagePrompt(title: string, content: string): Promise<string> {
    const truncatedContent = content.substring(0, 500);
    const prompt = `根据以下文章标题和内容，生成一个适合作为特色图片的英文描述（用于 AI 图片生成），要求简洁、视觉化、专业：\n\n标题：${title}\n\n内容摘要：${truncatedContent}`;

    log.debug('Generating image prompt', { title });
    return this.generateText(prompt);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
