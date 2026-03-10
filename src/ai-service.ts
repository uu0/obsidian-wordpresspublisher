import { requestUrl, RequestUrlParam } from 'obsidian';

export interface AIConfig {
  provider: 'openai' | 'claude';
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface AIServiceConfig {
  textAI: AIConfig;
  imageAI: AIConfig;
}

/**
 * 通用 HTTP 请求辅助，使用 Obsidian requestUrl 绕过 CORS 限制
 */
async function apiRequest(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<any> {
  const params: RequestUrlParam = {
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body),
    throw: false // 不自动抛异常，手动处理状态码
  };

  console.log('[AIService] Request:', url, 'model:', (body as any)?.model);
  const response = await requestUrl(params);

  if (response.status < 200 || response.status >= 300) {
    // 尝试从响应体中提取错误信息
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
    throw new Error(`HTTP ${response.status}: ${errorDetail}`);
  }

  return response.json;
}

export class AIService {
  constructor(private config: AIServiceConfig) {}

  /**
   * 验证 AI 配置是否有效
   */
  async validateConfig(config: AIConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      if (config.provider === 'openai') {
        // 用一个最小请求验证
        const baseURL = config.baseURL.replace(/\/+$/, '');
        await apiRequest(
          `${baseURL}/chat/completions`,
          { 'Authorization': `Bearer ${config.apiKey}` },
          {
            model: config.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5
          }
        );
        return { valid: true };
      } else if (config.provider === 'claude') {
        const baseURL = config.baseURL.replace(/\/+$/, '');
        await apiRequest(
          `${baseURL}/messages`,
          {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          {
            model: config.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          }
        );
        return { valid: true };
      }
      return { valid: false, error: 'Unsupported provider' };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 生成文本内容（如摘要、SEO描述等）
   * 使用 Obsidian requestUrl 直接调用，兼容 SiliconFlow / DeepSeek 等第三方 OpenAI 兼容 API
   */
  async generateText(prompt: string): Promise<string> {
    const config = this.config.textAI;
    const baseURL = config.baseURL.replace(/\/+$/, '');

    try {
      if (config.provider === 'openai') {
        const data = await apiRequest(
          `${baseURL}/chat/completions`,
          { 'Authorization': `Bearer ${config.apiKey}` },
          {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
          }
        );

        return data?.choices?.[0]?.message?.content || '';
      } else if (config.provider === 'claude') {
        const data = await apiRequest(
          `${baseURL}/messages`,
          {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          {
            model: config.model,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          }
        );

        const textContent = data?.content?.find((c: any) => c.type === 'text');
        return textContent?.text || '';
      }
      throw new Error('Unsupported provider');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AI text generation failed: ${errorMsg}`);
    }
  }

  /**
   * 生成图片
   */
  async generateImage(prompt: string): Promise<string> {
    const config = this.config.imageAI;
    const baseURL = config.baseURL.replace(/\/+$/, '');

    try {
      if (config.provider === 'openai') {
        const data = await apiRequest(
          `${baseURL}/images/generations`,
          { 'Authorization': `Bearer ${config.apiKey}` },
          {
            model: config.model,
            prompt: prompt,
            n: 1,
            size: '1024x1024'
          }
        );

        if (!data?.data || data.data.length === 0) {
          throw new Error('No image generated');
        }

        return data.data[0]?.url || '';
      } else {
        throw new Error('Claude does not support direct image generation');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AI image generation failed: ${errorMsg}`);
    }
  }

  /**
   * 将中文标题翻译成英文 slug
   */
  async translateToSlug(title: string): Promise<string> {
    const prompt = `将以下中文标题翻译成简洁的英文，只返回翻译结果，单词之间用空格分隔，不要有标点符号：\n\n${title}`;

    try {
      const translation = await this.generateText(prompt);
      // 转换为 slug 格式：小写，空格替换为连字符
      return translation
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 根据文章内容生成摘要
   */
  async generateSummary(content: string, maxLength: number = 200): Promise<string> {
    const prompt = `请为以下文章生成一个简洁的摘要，不超过${maxLength}字：\n\n${content.substring(0, 2000)}`;
    return this.generateText(prompt);
  }

  /**
   * 根据文章内容生成特色图片提示词
   */
  async generateImagePrompt(title: string, content: string): Promise<string> {
    const prompt = `根据以下文章标题和内容，生成一个适合作为特色图片的英文描述（用于 AI 图片生成），要求简洁、视觉化、专业：\n\n标题：${title}\n\n内容摘要：${content.substring(0, 500)}`;
    return this.generateText(prompt);
  }
}
