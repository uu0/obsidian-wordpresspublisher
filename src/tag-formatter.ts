/**
 * Tag Format Type
 * Defined locally to avoid lodash-es import issues
 */
export type TagFormatType = 'yaml' | 'inline';

/**
 * Tag Formatter
 * Handles conversion between YAML array tags and inline tags (#tag)
 */
export class TagFormatter {
  /**
   * Parse tags from any format to string array
   * Supports:
   * - YAML array: ["鸡排", "牛肉", "美食"]
   * - Inline tags: "#鸡排 #牛肉 #美食"
   * - Comma-separated: "鸡排, 牛肉, 美食"
   * 
   * @param tags - Tags in any format
   * @returns Array of tag strings
   * 
   * @example
   * TagFormatter.parseToArray(['鸡排', '牛肉']) // ['鸡排', '牛肉']
   * TagFormatter.parseToArray('#鸡排 #牛肉') // ['鸡排', '牛肉']
   * TagFormatter.parseToArray('鸡排, 牛肉') // ['鸡排', '牛肉']
   */
  static parseToArray(tags: any): string[] {
    if (!tags) return [];

    // Array format: ["鸡排", "牛肉", "美食"]
    if (Array.isArray(tags)) {
      return tags.map(t => String(t).trim()).filter(t => t);
    }

    // String format
    if (typeof tags === 'string') {
      const trimmed = tags.trim();
      if (!trimmed) return [];

      // Inline tags: "#鸡排 #牛肉 #美食"
      if (trimmed.includes('#')) {
        const matches = trimmed.match(/#[^\s#]+/g);
        if (matches) {
          return matches.map(t => t.slice(1).trim()).filter(t => t);
        }
      }

      // Comma-separated: "鸡排, 牛肉, 美食"
      return trimmed.split(/[,，]/).map(t => t.trim()).filter(t => t);
    }

    return [];
  }

  /**
   * Format tags to YAML array format
   * @param tags - Array of tag strings
   * @returns YAML array format
   * 
   * @example
   * TagFormatter.toYamlFormat(['鸡排', '牛肉']) // ['鸡排', '牛肉']
   */
  static toYamlFormat(tags: string[]): string[] {
    return [...tags];
  }

  /**
   * Format tags to inline format (#tag)
   * @param tags - Array of tag strings
   * @returns Inline tags string "#鸡排 #牛肉 #美食"
   * 
   * @example
   * TagFormatter.toInlineFormat(['鸡排', '牛肉']) // '#鸡排 #牛肉'
   */
  static toInlineFormat(tags: string[]): string {
    if (!tags || tags.length === 0) return '';
    return tags.map(t => `#${t}`).join(' ');
  }

  /**
   * Format tags according to user preference
   * @param tags - Array of tag strings
   * @param format - Target format (YAML or Inline)
   * @returns Formatted tags
   * 
   * @example
   * TagFormatter.formatTags(['鸡排', '牛肉'], 'yaml') // ['鸡排', '牛肉']
   * TagFormatter.formatTags(['鸡排', '牛肉'], 'inline') // '#鸡排 #牛肉'
   */
  static formatTags(tags: string[], format: TagFormatType): string[] | string {
    if (!tags || tags.length === 0) {
      return format === 'inline' ? '' : [];
    }

    switch (format) {
      case 'yaml':
        return this.toYamlFormat(tags);
      case 'inline':
        return this.toInlineFormat(tags);
      default:
        return tags;
    }
  }

  /**
   * Check if a string is inline tag format
   * @param tags - Tags string to check
   * @returns True if the string contains inline tags
   * 
   * @example
   * TagFormatter.isInlineFormat('#鸡排 #牛肉') // true
   * TagFormatter.isInlineFormat('鸡排, 牛肉') // false
   */
  static isInlineFormat(tags: string): boolean {
    if (typeof tags !== 'string') return false;
    return tags.trim().includes('#');
  }

  /**
   * Normalize tag string (remove extra spaces, duplicate #, etc.)
   * @param tags - Tags string to normalize
   * @returns Normalized tags string
   * 
   * @example
   * TagFormatter.normalizeInlineTags('#鸡排  ##牛肉') // '#鸡排 #牛肉'
   */
  static normalizeInlineTags(tags: string): string {
    const parsed = this.parseToArray(tags);
    return this.toInlineFormat(parsed);
  }
}
