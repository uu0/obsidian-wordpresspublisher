import { createApi } from 'unsplash-js';
import { requestUrl } from 'obsidian';

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

export class UnsplashService {
  private api: ReturnType<typeof createApi> | null = null;

  constructor(private accessKey: string) {
    if (accessKey) {
      this.api = createApi({
        accessKey: accessKey,
      });
    }
  }

  /**
   * 搜索图片
   */
  async searchPhotos(query: string, page: number = 1, perPage: number = 12): Promise<UnsplashImage[]> {
    if (!this.api) {
      throw new Error('Unsplash API not configured');
    }

    try {
      const result = await this.api.search.getPhotos({
        query,
        page,
        perPage,
        orientation: 'landscape'
      });

      if (result.errors) {
        throw new Error(result.errors.join(', '));
      }

      return result.response?.results || [];
    } catch (error) {
      throw new Error(`Unsplash search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取随机图片
   */
  async getRandomPhotos(count: number = 30): Promise<UnsplashImage[]> {
    if (!this.api) {
      throw new Error('Unsplash API not configured');
    }

    try {
      const result = await this.api.photos.getRandom({
        count,
        orientation: 'landscape'
      });

      if (result.errors) {
        throw new Error(result.errors.join(', '));
      }

      // getRandom 可以返回单个或数组
      if (Array.isArray(result.response)) {
        return result.response;
      } else if (result.response) {
        return [result.response];
      }
      return [];
    } catch (error) {
      throw new Error(`Unsplash random photos failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 下载图片到 ArrayBuffer
   */
  async downloadImage(url: string): Promise<ArrayBuffer> {
    try {
      const response = await requestUrl({
        url: url,
        method: 'GET',
      });

      return response.arrayBuffer;
    } catch (error) {
      throw new Error(`Image download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 触发下载统计（Unsplash API 要求）
   */
  async trackDownload(downloadLocation: string): Promise<void> {
    if (!this.api) return;

    try {
      await requestUrl({
        url: downloadLocation,
        method: 'GET',
      });
    } catch (error) {
      console.warn('Failed to track Unsplash download:', error);
    }
  }

  /**
   * 验证 API Key 是否有效
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.api) return false;

    try {
      const result = await this.api.photos.list({ page: 1, perPage: 1 });
      return !result.errors;
    } catch (error) {
      return false;
    }
  }
}
