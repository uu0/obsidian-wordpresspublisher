/**
 * Application-wide constants
 * Centralized location for all magic numbers and hardcoded values
 */

/**
 * HTTP Request Configuration
 */
export const HTTP_CONFIG = {
  /** Default timeout for HTTP requests in milliseconds */
  DEFAULT_TIMEOUT: 30000,
  /** Timeout for media upload requests in milliseconds */
  UPLOAD_TIMEOUT: 120000,
  /** Maximum retry attempts for failed requests */
  MAX_RETRIES: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY: 1000,
} as const;

/**
 * WordPress API Configuration
 */
export const WP_API_CONFIG = {
  /** Default number of items per page for list requests */
  DEFAULT_PER_PAGE: 100,
  /** Maximum number of categories to fetch */
  MAX_CATEGORIES: 100,
  /** Maximum number of tags to fetch */
  MAX_TAGS: 100,
  /** Default REST API namespace */
  REST_NAMESPACE: 'wp/v2',
  /** Default REST API base path */
  REST_BASE_PATH: 'wp-json',
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  /** Error notice display timeout in milliseconds */
  ERROR_NOTICE_TIMEOUT: 5000,
  /** Success notice display timeout in milliseconds */
  SUCCESS_NOTICE_TIMEOUT: 3000,
  /** Info notice display timeout in milliseconds */
  INFO_NOTICE_TIMEOUT: 4000,
} as const;

/**
 * File Upload Configuration
 */
export const UPLOAD_CONFIG = {
  /** Maximum file size for upload in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** Supported image MIME types */
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ] as const,
  /** Supported video MIME types */
  SUPPORTED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ] as const,
  /** Supported audio MIME types */
  SUPPORTED_AUDIO_TYPES: [
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ] as const,
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  /** Image cache expiration time in milliseconds (24 hours) */
  IMAGE_CACHE_EXPIRATION: 24 * 60 * 60 * 1000,
  /** Maximum number of cached images */
  MAX_CACHED_IMAGES: 100,
} as const;

/**
 * WordPress Profile Configuration
 */
export const PROFILE_CONFIG = {
  /** Default profile name */
  DEFAULT_PROFILE_NAME: 'Default',
  /** Maximum number of profiles */
  MAX_PROFILES: 10,
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum title length */
  MAX_TITLE_LENGTH: 200,
  /** Maximum excerpt length */
  MAX_EXCERPT_LENGTH: 500,
  /** Maximum slug length */
  MAX_SLUG_LENGTH: 200,
} as const;

/**
 * Regular Expressions
 */
export const REGEX = {
  /** URL validation pattern */
  URL: /^https?:\/\/.+/,
  /** Email validation pattern */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Slug validation pattern (alphanumeric and hyphens) */
  SLUG: /^[a-z0-9-]+$/,
} as const;

/**
 * Error Codes
 */
export const ERROR_CODES = {
  /** Network error */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Authentication error */
  AUTH_ERROR: 'AUTH_ERROR',
  /** Validation error */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Not found error */
  NOT_FOUND: 'NOT_FOUND',
  /** Server error */
  SERVER_ERROR: 'SERVER_ERROR',
  /** Timeout error */
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  /** Unknown error */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Log Levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Default log level (can be overridden by settings)
 */
export const DEFAULT_LOG_LEVEL = LogLevel.INFO;
