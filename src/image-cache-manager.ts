import { App, TFile, normalizePath } from 'obsidian';
import { SafeAny } from './utils';

/**
 * Cache entry for a single note's featured image
 */
export interface ImageCacheEntry {
  /** Unique cache ID (used as filename) */
  cacheId: string;
  /** Original filename */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** Timestamp when cached */
  cachedAt: string;
  /** Image source type */
  sourceType: 'local' | 'unsplash' | 'ai' | 'vault';
  /** Additional metadata */
  meta?: Record<string, SafeAny>;
}

/**
 * Index file structure - maps note paths to cache entries
 */
export interface ImageCacheIndex {
  [notePath: string]: ImageCacheEntry;
}

/**
 * Featured image result with content
 */
export interface CachedFeaturedImage {
  fileName: string;
  mimeType: string;
  content: ArrayBuffer;
  width: number;
  sourceType: 'local' | 'unsplash' | 'ai' | 'vault';
}

/**
 * Manages featured image caching for the WordPress Publisher plugin
 * 
 * Cache structure:
 * .obsidian/plugins/wordpress-publisher/
 * └── cache/
 *     ├── index.json        # Note path → cache entry mapping
 *     └── images/
 *         └── {cacheId}.jpg # Cached image files
 */
export class ImageCacheManager {
  private pluginDir: string;
  private cacheDir: string;
  private imagesDir: string;
  private indexPath: string;
  private index: ImageCacheIndex = {};
  private initialized: boolean = false;

  constructor(
    private app: App,
    private pluginId: string = 'wordpress-publisher'
  ) {
    this.pluginDir = `.obsidian/plugins/${pluginId}`;
    this.cacheDir = `${this.pluginDir}/cache`;
    this.imagesDir = `${this.cacheDir}/images`;
    this.indexPath = `${this.cacheDir}/index.json`;
  }

  /**
   * Initialize cache manager - load index and create directories
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure directories exist
      await this.ensureDirectory(this.cacheDir);
      await this.ensureDirectory(this.imagesDir);

      // Load existing index
      await this.loadIndex();

      this.initialized = true;
      console.log('[ImageCacheManager] Initialized successfully');
    } catch (error) {
      console.error('[ImageCacheManager] Initialization failed:', error);
      // Create empty index if loading failed
      this.index = {};
      this.initialized = true;
    }
  }

  /**
   * Save featured image to cache
   * @param notePath - Path to the note file (relative to vault root)
   * @param imageData - Image binary data
   * @param fileName - Original filename
   * @param mimeType - MIME type
   * @param sourceType - Source of the image
   * @returns Cache entry
   */
  async saveImage(
    notePath: string,
    imageData: ArrayBuffer,
    fileName: string,
    mimeType: string,
    sourceType: 'local' | 'unsplash' | 'ai' | 'vault'
  ): Promise<ImageCacheEntry> {
    await this.initialize();

    const normalizedPath = normalizePath(notePath);
    
    // Check if there's an existing cache for this note
    const existingEntry = this.index[normalizedPath];
    if (existingEntry) {
      // Delete old image file
      await this.deleteImageFile(existingEntry.cacheId);
    }

    // Generate new cache ID
    const cacheId = this.generateCacheId();
    const extension = this.getExtensionFromMime(mimeType);
    const imageFileName = `${cacheId}.${extension}`;
    const imagePath = `${this.imagesDir}/${imageFileName}`;

    // Save image file
    await this.app.vault.adapter.writeBinary(imagePath, imageData);

    // Create cache entry
    const entry: ImageCacheEntry = {
      cacheId,
      fileName,
      mimeType,
      cachedAt: new Date().toISOString(),
      sourceType,
    };

    // Update index
    this.index[normalizedPath] = entry;
    await this.saveIndex();

    console.log('[ImageCacheManager] Image cached:', normalizedPath, '→', imageFileName);
    return entry;
  }

  /**
   * Load cached image for a note
   * @param notePath - Path to the note file
   * @returns Cached image data or null if not found
   */
  async loadImage(notePath: string): Promise<CachedFeaturedImage | null> {
    await this.initialize();

    const normalizedPath = normalizePath(notePath);
    const entry = this.index[normalizedPath];

    if (!entry) {
      return null;
    }

    const extension = this.getExtensionFromMime(entry.mimeType);
    const imagePath = `${this.imagesDir}/${entry.cacheId}.${extension}`;

    try {
      // Check if file exists
      const exists = await this.app.vault.adapter.exists(imagePath);
      if (!exists) {
        console.warn('[ImageCacheManager] Cached image file not found:', imagePath);
        // Clean up stale entry
        delete this.index[normalizedPath];
        await this.saveIndex();
        return null;
      }

      const content = await this.app.vault.adapter.readBinary(imagePath);

      return {
        fileName: entry.fileName,
        mimeType: entry.mimeType,
        content,
        width: 1200, // Default width
        sourceType: entry.sourceType,
      };
    } catch (error) {
      console.error('[ImageCacheManager] Failed to load cached image:', error);
      return null;
    }
  }

  /**
   * Check if a note has cached image
   * @param notePath - Path to the note file
   */
  async hasCachedImage(notePath: string): Promise<boolean> {
    await this.initialize();
    const normalizedPath = normalizePath(notePath);
    return normalizedPath in this.index;
  }

  /**
   * Get cache entry without loading image data
   * @param notePath - Path to the note file
   */
  async getCacheEntry(notePath: string): Promise<ImageCacheEntry | null> {
    await this.initialize();
    const normalizedPath = normalizePath(notePath);
    return this.index[normalizedPath] || null;
  }

  /**
   * Clear cache for a specific note
   * @param notePath - Path to the note file
   */
  async clearCache(notePath: string): Promise<void> {
    await this.initialize();

    const normalizedPath = normalizePath(notePath);
    const entry = this.index[normalizedPath];

    if (entry) {
      await this.deleteImageFile(entry.cacheId);
      delete this.index[normalizedPath];
      await this.saveIndex();
      console.log('[ImageCacheManager] Cache cleared for:', normalizedPath);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await this.initialize();

    // Delete all image files
    for (const entry of Object.values(this.index)) {
      await this.deleteImageFile(entry.cacheId);
    }

    // Clear index
    this.index = {};
    await this.saveIndex();
    console.log('[ImageCacheManager] All caches cleared');
  }

  /**
   * Clean up orphan caches (notes that no longer exist)
   */
  async cleanupOrphanCaches(): Promise<number> {
    await this.initialize();

    let cleanedCount = 0;
    const pathsToRemove: string[] = [];

    for (const [notePath, entry] of Object.entries(this.index)) {
      // Check if note file exists
      const file = this.app.vault.getAbstractFileByPath(notePath);
      if (!(file instanceof TFile)) {
        pathsToRemove.push(notePath);
        await this.deleteImageFile(entry.cacheId);
        cleanedCount++;
      }
    }

    // Remove from index
    for (const path of pathsToRemove) {
      delete this.index[path];
    }

    if (cleanedCount > 0) {
      await this.saveIndex();
      console.log('[ImageCacheManager] Cleaned up', cleanedCount, 'orphan caches');
    }

    return cleanedCount;
  }

  /**
   * Clean up old caches (older than specified days)
   * @param maxAgeDays - Maximum age in days
   */
  async cleanupOldCaches(maxAgeDays: number = 30): Promise<number> {
    await this.initialize();

    const now = new Date();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;
    const pathsToRemove: string[] = [];

    for (const [notePath, entry] of Object.entries(this.index)) {
      const cachedAt = new Date(entry.cachedAt);
      if (now.getTime() - cachedAt.getTime() > maxAgeMs) {
        pathsToRemove.push(notePath);
        await this.deleteImageFile(entry.cacheId);
        cleanedCount++;
      }
    }

    // Remove from index
    for (const path of pathsToRemove) {
      delete this.index[path];
    }

    if (cleanedCount > 0) {
      await this.saveIndex();
      console.log('[ImageCacheManager] Cleaned up', cleanedCount, 'old caches (>', maxAgeDays, 'days)');
    }

    return cleanedCount;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestCache: string | null;
    newestCache: string | null;
  }> {
    await this.initialize();

    let totalSize = 0;
    let oldestCache: string | null = null;
    let newestCache: string | null = null;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const entry of Object.values(this.index)) {
      const extension = this.getExtensionFromMime(entry.mimeType);
      const imagePath = `${this.imagesDir}/${entry.cacheId}.${extension}`;
      
      try {
        const stat = await this.app.vault.adapter.stat(imagePath);
        if (stat) {
          totalSize += stat.size;
        }
      } catch {
        // Ignore errors
      }

      const cachedTime = new Date(entry.cachedAt).getTime();
      if (cachedTime < oldestTime) {
        oldestTime = cachedTime;
        oldestCache = entry.cachedAt;
      }
      if (cachedTime > newestTime) {
        newestTime = cachedTime;
        newestCache = entry.cachedAt;
      }
    }

    return {
      totalEntries: Object.keys(this.index).length,
      totalSize,
      oldestCache,
      newestCache,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Ensure a directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    const exists = await this.app.vault.adapter.exists(dirPath);
    if (!exists) {
      await this.app.vault.adapter.mkdir(dirPath);
    }
  }

  /**
   * Load index from file
   */
  private async loadIndex(): Promise<void> {
    try {
      const exists = await this.app.vault.adapter.exists(this.indexPath);
      if (exists) {
        const content = await this.app.vault.adapter.read(this.indexPath);
        this.index = JSON.parse(content);
      }
    } catch (error) {
      console.warn('[ImageCacheManager] Failed to load index, starting fresh:', error);
      this.index = {};
    }
  }

  /**
   * Save index to file
   */
  private async saveIndex(): Promise<void> {
    const content = JSON.stringify(this.index, null, 2);
    await this.app.vault.adapter.write(this.indexPath, content);
  }

  /**
   * Delete an image file by cache ID
   */
  private async deleteImageFile(cacheId: string): Promise<void> {
    // Try common extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    for (const ext of extensions) {
      const imagePath = `${this.imagesDir}/${cacheId}.${ext}`;
      try {
        const exists = await this.app.vault.adapter.exists(imagePath);
        if (exists) {
          await this.app.vault.adapter.remove(imagePath);
          return;
        }
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Generate unique cache ID
   */
  private generateCacheId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return mimeToExt[mimeType.toLowerCase()] || 'jpg';
  }
}
