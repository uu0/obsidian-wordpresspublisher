/**
 * Unit tests for AIService
 * Tests text generation, image generation, and error handling
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AIService, AIConfig, AIServiceConfig } from '../../src/ai-service';
import { requestUrl } from 'obsidian';

// Mock Obsidian requestUrl
jest.mock('obsidian', () => ({
  requestUrl: jest.fn()
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('AIService', () => {
  let aiService: AIService;
  let config: AIServiceConfig;

  beforeEach(() => {
    // Reset mock
    mockRequestUrl.mockReset();

    // Default configuration
    config = {
      textAI: {
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo'
      },
      imageAI: {
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-api-key',
        model: 'dall-e-3'
      }
    };

    aiService = new AIService(config);
  });

  describe('constructor', () => {
    it('should create AIService instance with valid config', () => {
      expect(aiService).toBeInstanceOf(AIService);
    });
  });

  describe('generateText', () => {
    it('should generate text successfully with OpenAI', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'This is a test response'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateText('Test prompt');

      expect(result).toBe('This is a test response');
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST'
        })
      );
    });

    it('should generate text successfully with Claude', async () => {
      const claudeConfig: AIServiceConfig = {
        textAI: {
          provider: 'claude',
          baseURL: 'https://api.anthropic.com/v1',
          apiKey: 'test-api-key',
          model: 'claude-3-sonnet'
        },
        imageAI: config.imageAI
      };

      aiService = new AIService(claudeConfig);

      const mockResponse = {
        status: 200,
        json: {
          content: [
            {
              type: 'text',
              text: 'Claude response'
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateText('Test prompt');

      expect(result).toBe('Claude response');
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.anthropic.com/v1/messages'
        })
      );
    });

    it('should handle API error', async () => {
      const mockResponse = {
        status: 401,
        json: {
          error: {
            message: 'Invalid API key'
          }
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      await expect(aiService.generateText('Test prompt')).rejects.toThrow(
        'AI text generation failed'
      );
    });

    it('should handle network error', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('Network error'));

      await expect(aiService.generateText('Test prompt')).rejects.toThrow(
        'AI text generation failed: Network error'
      );
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: []
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateText('Test prompt');
      expect(result).toBe('');
    });
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const mockResponse = {
        status: 200,
        json: {
          data: [
            {
              url: 'https://example.com/image.png'
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateImage('A beautiful sunset');

      expect(result).toBe('https://example.com/image.png');
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/images/generations'
        })
      );
    });

    it('should handle image generation error', async () => {
      const mockResponse = {
        status: 500,
        json: {
          error: {
            message: 'Service unavailable'
          }
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      await expect(aiService.generateImage('Test prompt')).rejects.toThrow(
        'AI image generation failed'
      );
    });

    it('should throw error for Claude provider (not supported)', async () => {
      const claudeConfig: AIServiceConfig = {
        textAI: config.textAI,
        imageAI: {
          provider: 'claude',
          baseURL: 'https://api.anthropic.com/v1',
          apiKey: 'test-api-key',
          model: 'claude-3-sonnet'
        }
      };

      aiService = new AIService(claudeConfig);

      await expect(aiService.generateImage('Test prompt')).rejects.toThrow(
        'Claude does not support direct image generation'
      );
    });
  });

  describe('translateToSlug', () => {
    it('should translate Chinese title to English slug', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'weight loss recipes'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.translateToSlug('减脂食谱');

      expect(result).toBe('weight-loss-recipes');
    });

    it('should handle special characters in translation', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'Test!@#$ Translation'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.translateToSlug('测试翻译');

      expect(result).toBe('test-translation');
    });

    it('should handle translation error', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('Translation failed'));

      await expect(aiService.translateToSlug('测试')).rejects.toThrow(
        'Translation failed'
      );
    });
  });

  describe('generateSummary', () => {
    it('should generate summary from content', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'This is a summary of the article.'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const content = 'Long article content...';
      const result = await aiService.generateSummary(content);

      expect(result).toBe('This is a summary of the article.');
    });

    it('should respect max length parameter', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'Short summary.'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateSummary('Content', 100);

      expect(result).toBe('Short summary.');
    });

    it('should truncate long content before sending to API', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'Summary'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const longContent = 'x'.repeat(3000);
      await aiService.generateSummary(longContent);

      const callArgs = mockRequestUrl.mock.calls[0][0];
      const body = JSON.parse(callArgs.body as string);
      
      // The content should be truncated to 2000 characters
      expect(body.messages[0].content.length).toBeLessThan(3000);
    });
  });

  describe('generateImagePrompt', () => {
    it('should generate image prompt from title and content', async () => {
      const mockResponse = {
        status: 200,
        json: {
          choices: [
            {
              message: {
                content: 'A beautiful landscape with mountains'
              }
            }
          ]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateImagePrompt('Travel Story', 'Amazing trip...');

      expect(result).toBe('A beautiful landscape with mountains');
    });
  });

  describe('validateConfig', () => {
    it('should validate OpenAI text model config successfully', async () => {
      const mockResponse = {
        status: 200,
        json: {}
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.validateConfig(config.textAI, false);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate OpenAI image model config successfully', async () => {
      const mockResponse = {
        status: 200,
        json: {}
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.validateConfig(config.imageAI, true);

      expect(result.valid).toBe(true);
    });

    it('should validate Claude config successfully', async () => {
      const mockResponse = {
        status: 200,
        json: {}
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const claudeConfig: AIConfig = {
        provider: 'claude',
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: 'test-api-key',
        model: 'claude-3-sonnet'
      };

      const result = await aiService.validateConfig(claudeConfig, false);

      expect(result.valid).toBe(true);
    });

    it('should handle invalid config', async () => {
      const mockResponse = {
        status: 401,
        json: {
          error: {
            message: 'Invalid API key'
          }
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.validateConfig(config.textAI, false);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP 401');
    });

    it('should handle unsupported provider', async () => {
      const invalidConfig: AIConfig = {
        provider: 'unsupported' as any,
        baseURL: 'https://example.com',
        apiKey: 'test',
        model: 'test'
      };

      const result = await aiService.validateConfig(invalidConfig, false);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported provider');
    });
  });

  describe('Edge cases', () => {
    it('should handle base URL with trailing slash', async () => {
      const configWithSlash: AIServiceConfig = {
        textAI: {
          ...config.textAI,
          baseURL: 'https://api.openai.com/v1/'
        },
        imageAI: config.imageAI
      };

      aiService = new AIService(configWithSlash);

      const mockResponse = {
        status: 200,
        json: {
          choices: [{ message: { content: 'Test' } }]
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      await aiService.generateText('Test');

      const callArgs = mockRequestUrl.mock.calls[0][0];
      // Should not have double slashes after domain
      expect(callArgs.url).toBe('https://api.openai.com/v1/chat/completions');
      expect(callArgs.url).not.toMatch(/v1\/\/chat/);
    });

    it('should handle malformed API response', async () => {
      const mockResponse = {
        status: 200,
        json: null
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      const result = await aiService.generateText('Test');
      expect(result).toBe('');
    });

    it('should handle API rate limit error', async () => {
      const mockResponse = {
        status: 429,
        json: {
          error: {
            message: 'Rate limit exceeded'
          }
        }
      };

      mockRequestUrl.mockResolvedValueOnce(mockResponse as any);

      await expect(aiService.generateText('Test')).rejects.toThrow('HTTP 429');
    });
  });
});
