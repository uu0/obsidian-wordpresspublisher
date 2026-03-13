/**
 * WordPress REST API Response Types
 * These types define the structure of responses from WordPress REST API endpoints
 */

/**
 * WordPress REST API Post Response
 */
export interface WpRestPostResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, unknown>;
  categories: number[];
  tags: number[];
}

/**
 * WordPress REST API Category/Tag Response
 */
export interface WpRestTermResponse {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: Record<string, unknown>;
}

/**
 * WordPress REST API Media Upload Response
 */
export interface WpRestMediaResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  comment_status: string;
  ping_status: string;
  template: string;
  meta: Record<string, unknown>;
  description: {
    rendered: string;
  };
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }>;
    image_meta: Record<string, unknown>;
  };
  post: number | null;
  source_url: string;
}

/**
 * WordPress REST API User Response
 */
export interface WpRestUserResponse {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  url: string;
  description: string;
  link: string;
  locale: string;
  nickname: string;
  slug: string;
  roles: string[];
  registered_date: string;
  capabilities: Record<string, boolean>;
  extra_capabilities: Record<string, boolean>;
  avatar_urls: Record<string, string>;
  meta: Record<string, unknown>;
}

/**
 * WordPress REST API Post Type Response
 */
export interface WpRestPostTypeResponse {
  capabilities: Record<string, string>;
  description: string;
  hierarchical: boolean;
  viewable: boolean;
  labels: Record<string, string>;
  name: string;
  slug: string;
  supports: Record<string, boolean>;
  taxonomies: string[];
  rest_base: string;
  rest_namespace: string;
}

/**
 * WordPress REST API Error Response
 */
export interface WpRestErrorResponse {
  code: string;
  message: string;
  data: {
    status: number;
    params?: Record<string, string>;
  };
}

/**
 * Type guard to check if response is an error
 */
export function isWpRestError(response: unknown): response is WpRestErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response &&
    'data' in response
  );
}
