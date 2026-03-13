import { App } from 'obsidian';
import type WordpressPlugin from './main';
import { createModuleLogger } from './utils/logger';

const log = createModuleLogger('FeaturePictureCacheManager');

/**
 * Cached feature picture data
 */
export interface CachedFeaturePicture {
  /** Feature picture URL */
  url: string;
  /** Featured image ID */
  featuredImageId: number;
  /** Last fetch timestamp (ms) */
  lastFetchTime: number;
  /** Expiration timestamp (ms) */
  expiresAt: number;
}

/**
 * Cache storage structure
 */
interface FeaturePictureCache {
  [postId: string]: CachedFeaturePicture;
}

/**
 * Feature picture cache manager
 * Manages feature picture URLs with 7-day expiration
 */
export class FeaturePictureCacheManager {
  private cache: FeaturePictureCache = {};
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private readonly CACHE_KEY = 'feature-picture-cache';

  constructor(
    private app: App,
    private plugin: WordpressPlugin
  ) {
    this.loadCache();
  }

  /**
   * Load cache from plugin data
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await this.plugin.loadData();
      if (data && data[this.CACHE_KEY]) {
        this.cache = data[this.CACHE_KEY];
        log.debug('Loaded feature picture cache', { count: Object.keys(this.cache).length });
      }
    } catch (error) {
      log.error('Failed to load feature picture cache', error);
      this.cache = {};
    }
  }

  /**
   * Save cache to plugin data
   */
  private async saveCache(): Promise<void> {
    try {
      const data = await this.plugin.loadData() || {};
      data[this.CACHE_KEY] = this.cache;
      await this.plugin.saveData(data);
      log.debug('Saved feature picture cache', { count: Object.keys(this.cache).length });
    } catch (error) {
      log.error('Failed to save feature picture cache', error);
    }
  }

  /**
   * Get cached feature picture
   * @param postId - Post ID
   * @returns Cached data or null if not found or expired
   */
  get(postId: string | number): CachedFeaturePicture | null {
    const key = String(postId);
    const cached = this.cache[key];

    if (!cached) {
      log.debug('Cache miss', { postId });
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (now > cached.expiresAt) {
      log.debug('Cache expired', { postId, expiresAt: new Date(cached.expiresAt) });
      delete this.cache[key];
      this.saveCache();
      return null;
    }

    log.debug('Cache hit', { postId, age: Math.round((now - cached.lastFetchTime) / 1000 / 60) + 'min' });
    return cached;
  }

  /**
   * Set cached feature picture
   * @param postId - Post ID
   * @param url - Feature picture URL
   * @param featuredImageId - Featured image ID
   */
  async set(postId: string | number, url: string, featuredImageId: number): Promise<void> {
    const key = String(postId);
    const now = Date.now();

    this.cache[key] = {
      url,
      featuredImageId,
      lastFetchTime: now,
      expiresAt: now + this.CACHE_DURATION
    };

    log.debug('Cache updated', { postId, featuredImageId, expiresAt: new Date(this.cache[key].expiresAt) });
    await this.saveCache();
  }

  /**
   * Clear cache for specific post
   * @param postId - Post ID
   */
  async clear(postId: string | number): Promise<void> {
    const key = String(postId);
    if (this.cache[key]) {
      delete this.cache[key];
      log.debug('Cache cleared', { postId });
      await this.saveCache();
    }
  }

  /**
   * Clean expired cache entries
   * Should be called on plugin load
   */
  async cleanExpired(): Promise<void> {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    let cleanedCount = 0;

    for (const key of keys) {
      if (now > this.cache[key].expiresAt) {
        delete this.cache[key];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.info('Cleaned expired cache entries', { count: cleanedCount });
      await this.saveCache();
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.cache = {};
    log.info('All cache cleared');
    await this.saveCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    const expired = keys.filter(key => now > this.cache[key].expiresAt).length;

    return {
      total: keys.length,
      expired
    };
  }
}
