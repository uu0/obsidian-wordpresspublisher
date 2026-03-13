/**
 * Unit tests for error-handler utility
 */

import {
  handleClientError,
  isXmlRpcFault,
  isWpApiError,
  createAuthErrorMessage,
  createPublishErrorMessage,
  createUploadErrorMessage,
  validateResponse,
} from '../../src/utils/error-handler';
import { WordPressClientReturnCode } from '../../src/wp-client';
import { ERROR_CODES } from '../../src/constants';

describe('error-handler', () => {
  describe('isXmlRpcFault', () => {
    it('should identify XML-RPC fault response', () => {
      const fault = {
        faultCode: 403,
        faultString: 'Incorrect username or password.',
      };
      expect(isXmlRpcFault(fault)).toBe(true);
    });

    it('should return false for non-fault objects', () => {
      expect(isXmlRpcFault({})).toBe(false);
      expect(isXmlRpcFault({ code: 'error' })).toBe(false);
      expect(isXmlRpcFault(null)).toBe(false);
    });
  });

  describe('isWpApiError', () => {
    it('should identify WordPress API error', () => {
      const error = {
        code: 'rest_cannot_create',
        message: 'Sorry, you are not allowed to create posts.',
      };
      expect(isWpApiError(error)).toBe(true);
    });

    it('should return false for non-API-error objects', () => {
      expect(isWpApiError({})).toBe(false);
      expect(isWpApiError({ faultCode: 403 })).toBe(false);
      expect(isWpApiError(null)).toBe(false);
    });
  });

  describe('handleClientError', () => {
    it('should handle XML-RPC fault', () => {
      const fault = {
        faultCode: 403,
        faultString: 'Incorrect username or password.',
      };
      const result = handleClientError(fault, 'Authentication');

      expect(result.code).toBe(WordPressClientReturnCode.Error);
      if (result.code === WordPressClientReturnCode.Error) {
        expect(result.error.code).toBe('403');
        expect(result.error.message).toContain('Authentication');
        expect(result.error.message).toContain('Incorrect username or password');
      }
    });

    it('should handle WordPress API error', () => {
      const error = {
        code: 'rest_cannot_create',
        message: 'Sorry, you are not allowed to create posts.',
      };
      const result = handleClientError(error, 'Publish');

      expect(result.code).toBe(WordPressClientReturnCode.Error);
      if (result.code === WordPressClientReturnCode.Error) {
        expect(result.error.code).toBe('rest_cannot_create');
        expect(result.error.message).toContain('Publish');
      }
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed: network error');
      const result = handleClientError(error, 'Request');

      expect(result.code).toBe(WordPressClientReturnCode.Error);
      if (result.code === WordPressClientReturnCode.Error) {
        expect(result.error.code).toBe(ERROR_CODES.NETWORK_ERROR);
        expect(result.error.message).toContain('Network error');
      }
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      const result = handleClientError(error, 'Request');

      expect(result.code).toBe(WordPressClientReturnCode.Error);
      if (result.code === WordPressClientReturnCode.Error) {
        expect(result.error.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
        expect(result.error.message).toContain('timeout');
      }
    });

    it('should handle unknown errors', () => {
      const error = 'some string error';
      const result = handleClientError(error, 'Operation');

      expect(result.code).toBe(WordPressClientReturnCode.Error);
      if (result.code === WordPressClientReturnCode.Error) {
        expect(result.error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      }
    });
  });

  describe('createAuthErrorMessage', () => {
    it('should create message for 401 error', () => {
      const message = createAuthErrorMessage(401);
      expect(message).toContain('Invalid username or password');
    });

    it('should create message for 403 error', () => {
      const message = createAuthErrorMessage(403);
      expect(message).toContain('Access forbidden');
    });

    it('should create message for 404 error', () => {
      const message = createAuthErrorMessage(404);
      expect(message).toContain('endpoint not found');
    });

    it('should create default message for unknown status', () => {
      const message = createAuthErrorMessage(500);
      expect(message).toContain('Unable to verify credentials');
    });
  });

  describe('createPublishErrorMessage', () => {
    it('should create message for permission error', () => {
      const error = {
        code: 'rest_cannot_create',
        message: 'Sorry, you are not allowed to create posts.',
      };
      const message = createPublishErrorMessage(error);
      expect(message).toContain('do not have permission');
    });

    it('should create message for invalid ID error', () => {
      const error = {
        code: 'rest_post_invalid_id',
        message: 'Invalid post ID.',
      };
      const message = createPublishErrorMessage(error);
      expect(message).toContain('Invalid post ID');
    });

    it('should handle XML-RPC fault', () => {
      const fault = {
        faultCode: 500,
        faultString: 'Internal server error',
      };
      const message = createPublishErrorMessage(fault);
      expect(message).toContain('Internal server error');
    });
  });

  describe('createUploadErrorMessage', () => {
    it('should create message with filename', () => {
      const error = {
        code: 'rest_upload_file_too_big',
        message: 'File is too large.',
      };
      const message = createUploadErrorMessage(error, 'image.jpg');
      expect(message).toContain('image.jpg');
      expect(message).toContain('exceeds server limit');
    });

    it('should create message for quota exceeded', () => {
      const error = {
        code: 'rest_upload_user_quota_exceeded',
        message: 'User quota exceeded.',
      };
      const message = createUploadErrorMessage(error);
      expect(message).toContain('quota exceeded');
    });

    it('should create message for invalid file type', () => {
      const error = {
        code: 'rest_upload_invalid_file_type',
        message: 'Invalid file type.',
      };
      const message = createUploadErrorMessage(error, 'document.exe');
      expect(message).toContain('Invalid file type');
      expect(message).toContain('document.exe');
    });
  });

  describe('validateResponse', () => {
    it('should pass validation for valid response', () => {
      const response = {
        id: 123,
        title: 'Test Post',
        content: 'Test content',
      };

      expect(() => {
        validateResponse(response, ['id', 'title'], 'Test');
      }).not.toThrow();
    });

    it('should throw for missing required field', () => {
      const response = {
        title: 'Test Post',
      };

      expect(() => {
        validateResponse(response, ['id', 'title'], 'Test');
      }).toThrow('missing required field "id"');
    });

    it('should throw for non-object response', () => {
      expect(() => {
        validateResponse(null, ['id'], 'Test');
      }).toThrow('expected object');

      expect(() => {
        validateResponse('string', ['id'], 'Test');
      }).toThrow('expected object');
    });
  });
});
