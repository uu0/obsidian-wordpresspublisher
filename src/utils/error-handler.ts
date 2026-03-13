/**
 * Centralized error handling utilities
 * Provides consistent error handling across different WordPress clients
 */

import { WordPressClientResult, WordPressClientReturnCode } from '../wp-client';
import { logger } from './logger';
import { ERROR_CODES } from '../constants';

/**
 * WordPress API Error
 */
export interface WpApiError {
  code: string;
  message: string;
  data?: {
    status?: number;
    [key: string]: unknown;
  };
}

/**
 * XML-RPC Fault Response
 */
export interface XmlRpcFault {
  faultCode: number | string;
  faultString: string;
}

/**
 * Type guard for XML-RPC fault response
 */
export function isXmlRpcFault(error: unknown): error is XmlRpcFault {
  return (
    typeof error === 'object' &&
    error !== null &&
    'faultCode' in error &&
    'faultString' in error
  );
}

/**
 * Type guard for WordPress API error
 */
export function isWpApiError(error: unknown): error is WpApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Convert various error types to standardized WordPressClientResult
 */
export function handleClientError<T>(
  error: unknown,
  context: string,
  moduleName: string = 'ErrorHandler'
): WordPressClientResult<T> {
  logger.error(moduleName, `Error in ${context}`, error);

  // Handle XML-RPC fault
  if (isXmlRpcFault(error)) {
    return {
      code: WordPressClientReturnCode.Error,
      error: {
        code: String(error.faultCode),
        message: `${context}: ${error.faultString}`,
      },
    };
  }

  // Handle WordPress API error
  if (isWpApiError(error)) {
    return {
      code: WordPressClientReturnCode.Error,
      error: {
        code: error.code,
        message: `${context}: ${error.message}`,
      },
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: ERROR_CODES.NETWORK_ERROR,
          message: `${context}: Network error - ${error.message}`,
        },
      };
    }

    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: ERROR_CODES.TIMEOUT_ERROR,
          message: `${context}: Request timeout - ${error.message}`,
        },
      };
    }

    return {
      code: WordPressClientReturnCode.Error,
      error: {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: `${context}: ${error.message}`,
      },
    };
  }

  // Handle unknown error types
  return {
    code: WordPressClientReturnCode.Error,
    error: {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: `${context}: An unknown error occurred`,
    },
  };
}

/**
 * Create a descriptive error message for authentication failures
 */
export function createAuthErrorMessage(statusCode?: number): string {
  switch (statusCode) {
    case 401:
      return 'Authentication failed: Invalid username or password';
    case 403:
      return 'Authentication failed: Access forbidden - check your permissions';
    case 404:
      return 'Authentication failed: WordPress endpoint not found';
    default:
      return 'Authentication failed: Unable to verify credentials';
  }
}

/**
 * Create a descriptive error message for publish failures
 */
export function createPublishErrorMessage(error: unknown): string {
  if (isWpApiError(error)) {
    switch (error.code) {
      case 'rest_cannot_create':
        return 'Publish failed: You do not have permission to create posts';
      case 'rest_cannot_edit':
        return 'Publish failed: You do not have permission to edit this post';
      case 'rest_post_invalid_id':
        return 'Publish failed: Invalid post ID';
      case 'rest_invalid_param':
        return `Publish failed: Invalid parameter - ${error.message}`;
      default:
        return `Publish failed: ${error.message}`;
    }
  }

  if (isXmlRpcFault(error)) {
    return `Publish failed: ${error.faultString}`;
  }

  if (error instanceof Error) {
    return `Publish failed: ${error.message}`;
  }

  return 'Publish failed: An unknown error occurred';
}

/**
 * Create a descriptive error message for media upload failures
 */
export function createUploadErrorMessage(error: unknown, filename?: string): string {
  const fileInfo = filename ? ` (${filename})` : '';

  if (isWpApiError(error)) {
    switch (error.code) {
      case 'rest_upload_user_quota_exceeded':
        return `Upload failed${fileInfo}: User quota exceeded`;
      case 'rest_upload_file_too_big':
        return `Upload failed${fileInfo}: File size exceeds server limit`;
      case 'rest_upload_invalid_file_type':
        return `Upload failed${fileInfo}: Invalid file type`;
      case 'rest_cannot_create':
        return `Upload failed${fileInfo}: You do not have permission to upload files`;
      default:
        return `Upload failed${fileInfo}: ${error.message}`;
    }
  }

  if (isXmlRpcFault(error)) {
    return `Upload failed${fileInfo}: ${error.faultString}`;
  }

  if (error instanceof Error) {
    return `Upload failed${fileInfo}: ${error.message}`;
  }

  return `Upload failed${fileInfo}: An unknown error occurred`;
}

/**
 * Validate response and throw descriptive error if invalid
 */
export function validateResponse<T>(
  response: unknown,
  requiredFields: string[],
  context: string
): asserts response is T {
  if (!response || typeof response !== 'object') {
    throw new Error(`${context}: Invalid response - expected object, got ${typeof response}`);
  }

  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`${context}: Invalid response - missing required field "${field}"`);
    }
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context: string = 'Operation'
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(
          'RetryHandler',
          `${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
