/**
 * WordPress post status values
 * @see https://developer.wordpress.org/rest-api/reference/posts/#arguments
 */
export const enum PostStatus {
  /** Draft post - not published */
  Draft = 'draft',
  /** Published post - publicly visible */
  Publish = 'publish',
  /** Private post - visible only to authenticated users with permission */
  Private = 'private',
  /** Scheduled post - will be published at a future date */
  Future = 'future'
}

/**
 * WordPress comment status values
 */
export const enum CommentStatus {
  /** Comments are allowed */
  Open = 'open',
  /** Comments are disabled */
  Closed = 'closed'
}

/**
 * Common WordPress post type constants
 */
export const enum PostTypeConst {
  /** Standard blog post */
  Post = 'post',
  /** Static page */
  Page = 'page',
}

/**
 * WordPress post type - can be custom post types as well
 */
export type PostType = string;

/**
 * WordPress taxonomy term (category, tag, or custom taxonomy)
 * @see https://developer.wordpress.org/rest-api/reference/terms/
 */
export interface Term {
  /** Term ID */
  id: string;
  /** Term display name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Taxonomy name (e.g., 'category', 'post_tag') */
  taxonomy: string;
  /** Term description */
  description: string;
  /** Parent term ID (for hierarchical taxonomies) */
  parent?: string;
  /** Number of posts using this term */
  count: number;
}
