/**
 * Unit tests for modal-helpers (pure, instance-independent helpers).
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectLanguage,
  formatFileSize,
  truncateMiddle,
  getMimeType,
  getMimeTypeFromResponse,
  extractFileName,
  normalizeTags,
  getTagColor,
  TAG_COLORS,
} from '../../src/modal-helpers';

describe('modal-helpers', () => {
  describe('detectLanguage', () => {
    it('treats very short text as english', () => {
      expect(detectLanguage('hi')).toBe('en');
    });
    it('detects chinese when CJK ratio exceeds 30%', () => {
      expect(detectLanguage('这是一段中文测试文本用于检测语言')).toBe('zh');
    });
    it('detects english when latin ratio exceeds 40%', () => {
      expect(detectLanguage('This is a fairly long english sentence used for detection.')).toBe('en');
    });
    it('returns other for mixed/unknown scripts', () => {
      expect(detectLanguage('0123456789あいうえおかきくけこ')).toBe('other');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });
    it('formats kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });
    it('formats megabytes', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });

  describe('truncateMiddle', () => {
    it('returns short strings unchanged', () => {
      expect(truncateMiddle('short.txt')).toBe('short.txt');
    });
    it('truncates long strings keeping prefix/suffix', () => {
      // Default prefixLen=10 -> first 10 chars of the name are 'a-very-lon'.
      const result = truncateMiddle('a-very-long-file-name-that-exceeds-the-limit.png', 10, 8);
      expect(result).toContain('...');
      expect(result.startsWith('a-very-lon')).toBe(true);
      expect(result.endsWith('.png')).toBe(true);
    });
    it('respects a custom prefix length', () => {
      const result = truncateMiddle('a-very-long-name.png', 11, 4);
      expect(result.startsWith('a-very-long')).toBe(true);
      expect(result.endsWith('.png')).toBe(true);
    });
  });

  describe('getMimeType / getMimeTypeFromResponse / extractFileName', () => {
    it('maps known extensions', () => {
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('webp')).toBe('image/webp');
    });
    it('falls back to jpeg for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('image/jpeg');
    });
    it('derives mime from content-type image prefix', () => {
      expect(getMimeTypeFromResponse('image/png; charset=utf-8', 'x://y/z')).toBe('image/png');
    });
    it('derives mime from url extension when content-type is missing', () => {
      expect(getMimeTypeFromResponse(null, 'https://example.com/photo.gif')).toBe('image/gif');
    });
    it('extracts a file name with extension', () => {
      expect(extractFileName('https://example.com/path/img.jpg?w=200')).toBe('img.jpg');
    });
    it('falls back when the url has no extension', () => {
      expect(extractFileName('https://example.com/noext')).toBe('featured-image.jpg');
    });
  });

  describe('normalizeTags', () => {
    it('passes arrays through', () => {
      expect(normalizeTags(['a', 'b'])).toEqual(['a', 'b']);
    });
    it('handles comma-separated strings', () => {
      expect(normalizeTags('a, b, c')).toEqual(['a', 'b', 'c']);
    });
    it('handles undefined', () => {
      expect(normalizeTags(undefined)).toEqual([]);
    });
  });

  describe('getTagColor', () => {
    it('is deterministic for the same tag', () => {
      expect(getTagColor('react')).toBe(getTagColor('react'));
    });
    it('returns one of the pool colors', () => {
      const color = getTagColor('typescript');
      expect(TAG_COLORS).toContain(color);
    });
  });
});
