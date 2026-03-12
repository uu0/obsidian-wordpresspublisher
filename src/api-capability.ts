/**
 * API capability detection and feature flags
 * Helps identify which features are supported by different WordPress API types
 */

import { ApiType } from './plugin-settings';

/**
 * Feature capabilities for different API types
 */
export interface ApiCapabilities {
  /**
   * Whether the API supports creating categories
   */
  supportsCategoryCreation: boolean;
  
  /**
   * Whether the API supports creating tags
   */
  supportsTagCreation: boolean;
  
  /**
   * Whether the API supports rich category properties
   * (description, slug, parent, etc.)
   */
  supportsRichCategoryProperties: boolean;
  
  /**
   * Whether the API supports batch operations
   */
  supportsBatchOperations: boolean;
  
  /**
   * Whether the API supports custom post types
   */
  supportsCustomPostTypes: boolean;
  
  /**
   * Whether the API supports application passwords authentication
   */
  supportsApplicationPasswords: boolean;
  
  /**
   * Whether the API supports OAuth2 authentication
   */
  supportsOAuth2: boolean;
}

/**
 * Get capabilities for a specific API type
 */
export function getApiCapabilities(apiType: ApiType): ApiCapabilities {
  const capabilities: Record<ApiType, ApiCapabilities> = {
    [ApiType.XML_RPC]: {
      supportsCategoryCreation: true, // wp.newCategory
      supportsTagCreation: true,      // wp.newTerm
      supportsRichCategoryProperties: false, // Limited properties in XML-RPC
      supportsBatchOperations: false, // XML-RPC is single-operation oriented
      supportsCustomPostTypes: false, // Limited support in XML-RPC
      supportsApplicationPasswords: false, // XML-RPC uses basic auth
      supportsOAuth2: false, // XML-RPC doesn't support OAuth2
    },
    [ApiType.RestAPI_miniOrange]: {
      supportsCategoryCreation: true,
      supportsTagCreation: true,
      supportsRichCategoryProperties: true,
      supportsBatchOperations: true,
      supportsCustomPostTypes: true,
      supportsApplicationPasswords: true,
      supportsOAuth2: true,
    },
    [ApiType.RestApi_ApplicationPasswords]: {
      supportsCategoryCreation: true,
      supportsTagCreation: true,
      supportsRichCategoryProperties: true,
      supportsBatchOperations: true,
      supportsCustomPostTypes: true,
      supportsApplicationPasswords: true,
      supportsOAuth2: false,
    },
    [ApiType.RestApi_WpComOAuth2]: {
      supportsCategoryCreation: true,
      supportsTagCreation: true,
      supportsRichCategoryProperties: true,
      supportsBatchOperations: true,
      supportsCustomPostTypes: true,
      supportsApplicationPasswords: false,
      supportsOAuth2: true,
    },
  };
  
  return capabilities[apiType] || capabilities[ApiType.RestApi_ApplicationPasswords];
}

/**
 * Check if a specific feature is supported by the API type
 */
export function isFeatureSupported(apiType: ApiType, feature: keyof ApiCapabilities): boolean {
  const capabilities = getApiCapabilities(apiType);
  return capabilities[feature];
}

/**
 * Get a human-readable description of API limitations
 */
export function getApiLimitations(apiType: ApiType): string[] {
  const capabilities = getApiCapabilities(apiType);
  const limitations: string[] = [];
  
  if (!capabilities.supportsRichCategoryProperties) {
    limitations.push('Limited category properties (description, slug, parent may not be fully supported)');
  }
  
  if (!capabilities.supportsBatchOperations) {
    limitations.push('No batch operations support');
  }
  
  if (!capabilities.supportsCustomPostTypes) {
    limitations.push('Limited custom post type support');
  }
  
  if (apiType === ApiType.XML_RPC) {
    limitations.push('Uses basic authentication (consider switching to REST API with application passwords for better security)');
    limitations.push('Some modern WordPress features may not be available');
  }
  
  return limitations;
}

/**
 * Get recommendation based on API type
 */
export function getApiRecommendation(apiType: ApiType): string {
  switch (apiType) {
    case ApiType.XML_RPC:
      return 'Consider migrating to REST API with Application Passwords for better security and feature support';
    case ApiType.RestAPI_miniOrange:
      return 'Using miniOrange authentication - ensure your WordPress site has the miniOrange plugin installed';
    case ApiType.RestApi_ApplicationPasswords:
      return 'Best practice: Using WordPress Application Passwords for secure REST API access';
    case ApiType.RestApi_WpComOAuth2:
      return 'Using WordPress.com OAuth2 authentication for WordPress.com sites';
    default:
      return 'Unknown API type';
  }
}