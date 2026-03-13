import { App, Notice, TFile } from 'obsidian';
import { MatterData } from './types';
import { SafeAny } from './utils';
import type WordpressPlugin from './main';
import { TagFormatter } from './tag-formatter';

/**
 * Standard frontmatter fields in fixed order
 * These fields are managed by the WordPress Publisher plugin
 */
export const STANDARD_FRONTMATTER_FIELDS = [
  'blogName',
  'postId',
  'postType',
  'categories',
  'slug',
  'featurePicture',
  'featuredImageId',
  'tags'
] as const;

export type StandardFrontmatterField = typeof STANDARD_FRONTMATTER_FIELDS[number];

/**
 * Remote post data for conflict detection
 */
export interface RemotePostData {
  postId: string | number;
  postType: string;
  categories: string[];
  slug: string;
  tags: string[];
  excerpt?: string;
  featuredImageId?: number;
}

/**
 * Conflict resolution choice
 */
export type ConflictResolution = 'local' | 'remote' | 'cancel';

/**
 * Frontmatter conflict information
 */
export interface FrontmatterConflict {
  field: string;
  localValue: SafeAny;
  remoteValue: SafeAny;
}

/**
 * Frontmatter Manager
 * Handles frontmatter initialization, normalization, and conflict detection
 */
export class FrontmatterManager {
  constructor(private app: App, private plugin: WordpressPlugin) {}

  /**
   * Get default value for a frontmatter field
   * Note: categories and tags default to empty to avoid conflicts with remote data
   */
  private getDefaultValue(field: StandardFrontmatterField): SafeAny {
    switch (field) {
      case 'categories':
        // Return empty string to avoid conflict with remote category
        // User will select category when publishing
        return '';
      case 'tags':
        // 根据设置选择默认格式
        return this.plugin.settings.tagFormat === 'inline'
          ? ''   // 行内标签默认空字符串
          : [];  // YAML 标签默认空数组
      default:
        return '';
    }
  }

  /**
   * Initialize or normalize frontmatter fields
   * @param file - File to process
   * @returns Promise resolving to normalized frontmatter
   */
  async initializeFrontmatter(file: TFile): Promise<MatterData> {
    let frontmatter: MatterData = {};

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const existingKeys = Object.keys(fm);

      // Case 1: Empty frontmatter - add all standard fields with default values
      if (existingKeys.length === 0) {
        for (const field of STANDARD_FRONTMATTER_FIELDS) {
          fm[field] = this.getDefaultValue(field);
        }
        frontmatter = { ...fm };
        return;
      }

      // Case 2 & 3: Partial or non-matching fields
      const standardFieldsSet = new Set(STANDARD_FRONTMATTER_FIELDS);
      const existingStandardFields = existingKeys.filter(key => standardFieldsSet.has(key as StandardFrontmatterField));
      const nonStandardFields = existingKeys.filter(key => !standardFieldsSet.has(key as StandardFrontmatterField));

      // Preserve non-standard fields
      const preservedFields: Record<string, SafeAny> = {};
      for (const key of nonStandardFields) {
        preservedFields[key] = fm[key];
      }

      // Preserve existing standard field values
      const existingValues: Record<string, SafeAny> = {};
      for (const key of existingStandardFields) {
        existingValues[key] = fm[key];
      }

      // Clear all fields (to rebuild in correct order)
      for (const key of existingKeys) {
        delete fm[key];
      }

      // Rebuild frontmatter in correct order:
      // 1. Non-standard fields first (preserve user's custom fields)
      for (const key of nonStandardFields) {
        fm[key] = preservedFields[key];
      }

      // 2. Standard fields in fixed order
      for (const field of STANDARD_FRONTMATTER_FIELDS) {
        fm[field] = existingValues[field] ?? this.getDefaultValue(field);
      }

      frontmatter = { ...fm };
    });

    return frontmatter;
  }

  /**
   * Detect conflicts between local frontmatter and remote post data
   * @param localMatter - Local frontmatter data
   * @param remoteData - Remote post data
   * @returns Array of conflicts
   */
  detectConflicts(localMatter: MatterData, remoteData: RemotePostData): FrontmatterConflict[] {
    const conflicts: FrontmatterConflict[] = [];

    // Check postId
    if (localMatter.postId && String(localMatter.postId) !== String(remoteData.postId)) {
      conflicts.push({
        field: 'postId',
        localValue: localMatter.postId,
        remoteValue: remoteData.postId
      });
    }

    // Check postType
    if (localMatter.postType && localMatter.postType !== remoteData.postType) {
      conflicts.push({
        field: 'postType',
        localValue: localMatter.postType,
        remoteValue: remoteData.postType
      });
    }

    // Check categories (normalize to array for comparison)
    const localCats = this.normalizeToArray(localMatter.categories);
    const remoteCats = this.normalizeToArray(remoteData.categories);
    if (localCats.length > 0 && !this.arraysEqual(localCats, remoteCats)) {
      conflicts.push({
        field: 'categories',
        localValue: localCats,
        remoteValue: remoteCats
      });
    }

    // Check slug
    if (localMatter.slug && localMatter.slug !== remoteData.slug) {
      conflicts.push({
        field: 'slug',
        localValue: localMatter.slug,
        remoteValue: remoteData.slug
      });
    }

    // Check tags (normalize to array for comparison)
    const localTags = this.normalizeToArray(localMatter.tags);
    const remoteTags = this.normalizeToArray(remoteData.tags);
    if (localTags.length > 0 && !this.arraysEqual(localTags, remoteTags)) {
      conflicts.push({
        field: 'tags',
        localValue: localTags,
        remoteValue: remoteTags
      });
    }

    // Check featured image ID
    if (localMatter.featuredImageId && remoteData.featuredImageId &&
        Number(localMatter.featuredImageId) !== Number(remoteData.featuredImageId)) {
      conflicts.push({
        field: 'featuredImageId',
        localValue: localMatter.featuredImageId,
        remoteValue: remoteData.featuredImageId
      });
    }

    return conflicts;
  }

  /**
   * Update frontmatter with resolved values
   * @param file - File to update
   * @param updates - Field updates to apply
   */
  async updateFrontmatter(file: TFile, updates: Partial<MatterData>): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const [key, value] of Object.entries(updates)) {
        fm[key] = value;
      }
    });
  }

  /**
   * Get tags from frontmatter (always returns array)
   * @param frontmatter - Frontmatter data
   * @returns Array of tag strings
   */
  getTags(frontmatter: MatterData): string[] {
    return TagFormatter.parseToArray(frontmatter.tags);
  }

  /**
   * Set tags to frontmatter with user preferred format
   * @param file - File to update
   * @param tags - Array of tag strings
   */
  async setTags(file: TFile, tags: string[]): Promise<void> {
    const formattedTags = TagFormatter.formatTags(
      tags,
      this.plugin.settings.tagFormat
    );

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.tags = formattedTags;
    });
  }

  /**
   * Normalize value to array (handles string, array, or empty)
   */
  private normalizeToArray(value: SafeAny): string[] {
    if (!value) return [];
    if (typeof value === 'string') {
      // Handle special cases for category names/IDs
      const normalized = this.normalizeCategoryValue(value);
      if (normalized) {
        return normalized;
      }
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (Array.isArray(value)) {
      // Handle arrays
      if (value.length === 0) return [];
      
      // Special case for single-element arrays that might be category names/IDs
      if (value.length === 1 && typeof value[0] === 'string') {
        const normalized = this.normalizeCategoryValue(value[0]);
        if (normalized) {
          return normalized;
        }
      }
      
      return value.map(v => String(v).trim()).filter(s => s.length > 0);
    }
    return [];
  }

  /**
   * Normalize category value for comparison
   * Handles common category name/ID mappings
   */
  private normalizeCategoryValue(value: string): string[] | null {
    const trimmed = value.trim();
    
    // Default WordPress category mappings
    const categoryMappings: Record<string, string> = {
      // Chinese
      '未分类': '1',
      'Uncategorized': '1',
      // Add other common mappings as needed
    };
    
    // Check if value is a known category name
    if (categoryMappings[trimmed]) {
      return [categoryMappings[trimmed]];
    }
    
    // Check if value is a known category ID that maps to a common name
    const reverseMappings: Record<string, string> = {
      '1': '未分类', // Default category ID
    };
    
    if (reverseMappings[trimmed]) {
      return [reverseMappings[trimmed]];
    }
    
    return null;
  }

  /**
   * Compare two arrays for equality (order-independent)
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
}
