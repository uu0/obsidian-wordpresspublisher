/**
 * Unit tests for SlugGenerator
 * Tests Chinese to Pinyin conversion, English slug generation, and validation
 */

import { describe, it, expect } from '@jest/globals';
import { SlugGenerator } from '../../src/slug-generator';

describe('SlugGenerator', () => {
  
  describe('chineseToSlug', () => {
    it('should convert Chinese characters to pinyin slug', () => {
      const result = SlugGenerator.chineseToSlug('减脂食谱');
      expect(result).toBe('jian-zhi-shi-pu');
    });

    it('should handle empty string', () => {
      const result = SlugGenerator.chineseToSlug('');
      expect(result).toBe('');
    });

    it('should handle mixed Chinese and English', () => {
      const result = SlugGenerator.chineseToSlug('测试Test');
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).toContain('ce-shi');
    });

    it('should convert to lowercase', () => {
      const result = SlugGenerator.chineseToSlug('你好世界');
      expect(result).toBe(result.toLowerCase());
    });

    it('should replace multiple consecutive hyphens with single hyphen', () => {
      const result = SlugGenerator.chineseToSlug('你好世界');
      expect(result).not.toMatch(/-{2,}/);
    });

    it('should trim hyphens from start and end', () => {
      const result = SlugGenerator.chineseToSlug('你好世界');
      expect(result).not.toMatch(/^-|-$/);
    });
  });

  describe('englishToSlug', () => {
    it('should convert English title to slug', () => {
      const result = SlugGenerator.englishToSlug('Hello World');
      expect(result).toBe('hello-world');
    });

    it('should handle empty string', () => {
      const result = SlugGenerator.englishToSlug('');
      expect(result).toBe('');
    });

    it('should convert to lowercase', () => {
      const result = SlugGenerator.englishToSlug('HELLO WORLD');
      expect(result).toBe('hello-world');
    });

    it('should remove special characters', () => {
      const result = SlugGenerator.englishToSlug('Hello! World@#$%');
      expect(result).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      const result = SlugGenerator.englishToSlug('hello   world');
      expect(result).toBe('hello-world');
    });

    it('should handle multiple consecutive hyphens', () => {
      const result = SlugGenerator.englishToSlug('hello--world');
      expect(result).toBe('hello-world');
    });

    it('should trim hyphens from start and end', () => {
      const result = SlugGenerator.englishToSlug('--hello-world--');
      expect(result).toBe('hello-world');
    });

    it('should preserve numbers', () => {
      const result = SlugGenerator.englishToSlug('Test 123 Article');
      expect(result).toBe('test-123-article');
    });
  });

  describe('autoGenerateSlug', () => {
    it('should detect Chinese and use pinyin conversion', () => {
      const result = SlugGenerator.autoGenerateSlug('人工智能的未来');
      expect(result).toMatch(/^[a-z0-9-]+$/);
      expect(result).toContain('ren-gong');
    });

    it('should detect English and use English conversion', () => {
      const result = SlugGenerator.autoGenerateSlug('Hello World');
      expect(result).toBe('hello-world');
    });

    it('should handle empty string', () => {
      const result = SlugGenerator.autoGenerateSlug('');
      expect(result).toBe('');
    });

    it('should handle mixed content', () => {
      const result = SlugGenerator.autoGenerateSlug('测试Test');
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid slug', () => {
      expect(SlugGenerator.isValidSlug('hello-world')).toBe(true);
      expect(SlugGenerator.isValidSlug('test-123')).toBe(true);
      expect(SlugGenerator.isValidSlug('a1b2c3')).toBe(true);
    });

    it('should return false for invalid slug', () => {
      expect(SlugGenerator.isValidSlug('')).toBe(false);
      expect(SlugGenerator.isValidSlug('Hello World')).toBe(false); // uppercase and space
      expect(SlugGenerator.isValidSlug('hello_world')).toBe(false); // underscore
      expect(SlugGenerator.isValidSlug('hello.world')).toBe(false); // dot
    });

    it('should accept hyphens and numbers', () => {
      expect(SlugGenerator.isValidSlug('a-b-c')).toBe(true);
      expect(SlugGenerator.isValidSlug('123')).toBe(true);
      expect(SlugGenerator.isValidSlug('test-2024')).toBe(true);
    });
  });

  describe('sanitizeSlug', () => {
    it('should sanitize user input slug', () => {
      const result = SlugGenerator.sanitizeSlug('Hello World!!!');
      expect(result).toBe('hello-world');
    });

    it('should handle empty string', () => {
      const result = SlugGenerator.sanitizeSlug('');
      expect(result).toBe('');
    });

    it('should convert to lowercase', () => {
      const result = SlugGenerator.sanitizeSlug('HELLO-WORLD');
      expect(result).toBe('hello-world');
    });

    it('should remove special characters', () => {
      const result = SlugGenerator.sanitizeSlug('test@#$%slug');
      expect(result).toBe('testslug');
    });

    it('should normalize spaces and hyphens', () => {
      const result = SlugGenerator.sanitizeSlug('  test   slug  ');
      expect(result).toBe('test-slug');
    });

    it('should trim hyphens', () => {
      const result = SlugGenerator.sanitizeSlug('--test--');
      expect(result).toBe('test');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long Chinese strings', () => {
      const longText = '测试'.repeat(100);
      const result = SlugGenerator.chineseToSlug(longText);
      expect(result).toMatch(/^[a-z0-9-]+$/);
      // Pinyin conversion typically makes the string longer
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very long English strings', () => {
      const longText = 'test '.repeat(100);
      const result = SlugGenerator.englishToSlug(longText);
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle strings with only special characters', () => {
      const result = SlugGenerator.englishToSlug('!@#$%^&*()');
      expect(result).toBe('');
    });

    it('should handle strings with only numbers', () => {
      const result = SlugGenerator.englishToSlug('123456');
      expect(result).toBe('123456');
    });

    it('should handle Unicode characters outside Chinese range', () => {
      const result = SlugGenerator.englishToSlug('café résumé');
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });
  });
});
