/**
 * Unit tests for constants
 */

import {
  HTTP_CONFIG,
  WP_API_CONFIG,
  UI_CONFIG,
  UPLOAD_CONFIG,
  CACHE_CONFIG,
  PROFILE_CONFIG,
  VALIDATION,
  REGEX,
  ERROR_CODES,
  LogLevel,
  DEFAULT_LOG_LEVEL,
} from '../../src/constants';

describe('constants', () => {
  describe('HTTP_CONFIG', () => {
    it('should have valid timeout values', () => {
      expect(HTTP_CONFIG.DEFAULT_TIMEOUT).toBe(30000);
      expect(HTTP_CONFIG.UPLOAD_TIMEOUT).toBe(120000);
      expect(HTTP_CONFIG.MAX_RETRIES).toBe(3);
      expect(HTTP_CONFIG.RETRY_DELAY).toBe(1000);
    });

    it('should have upload timeout greater than default', () => {
      expect(HTTP_CONFIG.UPLOAD_TIMEOUT).toBeGreaterThan(HTTP_CONFIG.DEFAULT_TIMEOUT);
    });
  });

  describe('WP_API_CONFIG', () => {
    it('should have valid pagination values', () => {
      expect(WP_API_CONFIG.DEFAULT_PER_PAGE).toBe(100);
      expect(WP_API_CONFIG.MAX_CATEGORIES).toBe(100);
      expect(WP_API_CONFIG.MAX_TAGS).toBe(100);
    });

    it('should have valid API paths', () => {
      expect(WP_API_CONFIG.REST_NAMESPACE).toBe('wp/v2');
      expect(WP_API_CONFIG.REST_BASE_PATH).toBe('wp-json');
    });
  });

  describe('UI_CONFIG', () => {
    it('should have valid notice timeouts', () => {
      expect(UI_CONFIG.ERROR_NOTICE_TIMEOUT).toBe(5000);
      expect(UI_CONFIG.SUCCESS_NOTICE_TIMEOUT).toBe(3000);
      expect(UI_CONFIG.INFO_NOTICE_TIMEOUT).toBe(4000);
    });
  });

  describe('UPLOAD_CONFIG', () => {
    it('should have valid max file size', () => {
      expect(UPLOAD_CONFIG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have supported image types', () => {
      expect(UPLOAD_CONFIG.SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
      expect(UPLOAD_CONFIG.SUPPORTED_IMAGE_TYPES).toContain('image/png');
      expect(UPLOAD_CONFIG.SUPPORTED_IMAGE_TYPES).toContain('image/webp');
    });

    it('should have supported video types', () => {
      expect(UPLOAD_CONFIG.SUPPORTED_VIDEO_TYPES).toContain('video/mp4');
      expect(UPLOAD_CONFIG.SUPPORTED_VIDEO_TYPES).toContain('video/webm');
    });

    it('should have supported audio types', () => {
      expect(UPLOAD_CONFIG.SUPPORTED_AUDIO_TYPES).toContain('audio/mpeg');
      expect(UPLOAD_CONFIG.SUPPORTED_AUDIO_TYPES).toContain('audio/ogg');
    });
  });

  describe('VALIDATION', () => {
    it('should have valid length constraints', () => {
      expect(VALIDATION.MIN_PASSWORD_LENGTH).toBe(8);
      expect(VALIDATION.MAX_TITLE_LENGTH).toBe(200);
      expect(VALIDATION.MAX_EXCERPT_LENGTH).toBe(500);
      expect(VALIDATION.MAX_SLUG_LENGTH).toBe(200);
    });
  });

  describe('REGEX', () => {
    it('should validate URLs correctly', () => {
      expect(REGEX.URL.test('https://example.com')).toBe(true);
      expect(REGEX.URL.test('http://example.com')).toBe(true);
      expect(REGEX.URL.test('ftp://example.com')).toBe(false);
      expect(REGEX.URL.test('not-a-url')).toBe(false);
    });

    it('should validate emails correctly', () => {
      expect(REGEX.EMAIL.test('user@example.com')).toBe(true);
      expect(REGEX.EMAIL.test('invalid-email')).toBe(false);
      expect(REGEX.EMAIL.test('@example.com')).toBe(false);
    });

    it('should validate slugs correctly', () => {
      expect(REGEX.SLUG.test('valid-slug-123')).toBe(true);
      expect(REGEX.SLUG.test('invalid_slug')).toBe(false);
      expect(REGEX.SLUG.test('Invalid Slug')).toBe(false);
    });
  });

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ERROR_CODES.AUTH_ERROR).toBe('AUTH_ERROR');
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR');
      expect(ERROR_CODES.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('LogLevel', () => {
    it('should have correct log level hierarchy', () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
    });

    it('should have default log level', () => {
      expect(DEFAULT_LOG_LEVEL).toBe(LogLevel.INFO);
    });
  });
});
