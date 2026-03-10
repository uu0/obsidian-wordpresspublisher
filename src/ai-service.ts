import { requestUrl } from 'obsidian';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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

export class AIService {
  constructor(private config: AIServiceConfig) {}

  /**
   * 验证 AI 配置是否有效
   */
  async validateConfig(config: AIConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      if (config.provider === 'openai') {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: true
        });

        // 简单的测试请求
        await client.models.list();
        return { valid: true };
      } else if (config.provider === 'claude') {
        const client = new Anthropic({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: true
        });

        // 测试请求
        await client.messages.create({
          model: config.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        });
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
   */
  async generateText(prompt: string): Promise<string> {
    const config = this.config.textAI;

    try {
      if (config.provider === 'openai') {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: true
        });

        const response = await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        });

        return response.choices[0]?.message?.content || '';
      } else if (config.provider === 'claude') {
        const client = new Anthropic({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: true
        });

        const response = await client.messages.create({
          model: config.model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        });

        const textContent = response.content.find(c => c.type === 'text');
        return textContent && 'text' in textContent ? textContent.text : '';
      }
      throw new Error('Unsupported provider');
    } catch (error) {
      throw new Error(`AI text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成图片
   */
  async generateImage(prompt: string): Promise<string> {
    const config = this.config.imageAI;

    try {
      if (config.provider === 'openai') {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          dangerouslyAllowBrowser: true
        });

        const response = await client.images.generate({
          model: config.model,
          prompt: prompt,
          n: 1,
          size: '1024x1024'
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('No image generated');
        }

        return response.data[0]?.url || '';
      } else {
        // Claude 不直接支持图片生成，需要通过其他方式
        throw new Error('Claude does not support direct image generation');
      }
    } catch (error) {
      throw new Error(`AI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
