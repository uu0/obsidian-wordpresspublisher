import { requestUrl } from 'obsidian';
import { getBoundary, SafeAny } from './utils';
import { FormItemNameMapper, FormItems } from './types';
import { HTTP_CONFIG } from './constants';
import { logger } from './utils/logger';

interface RestOptions {
  url: URL;
  timeout?: number;
}

export class RestClient {

  /**
   * Href without '/' at the very end.
   * @private
   */
  private readonly href: string;
  private readonly timeout: number;
  private readonly moduleName = 'RestClient';

  constructor(
    private readonly options: RestOptions
  ) {
    logger.debug(this.moduleName, 'Initializing RestClient', { url: options.url.href });

    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }
    this.timeout = options.timeout ?? HTTP_CONFIG.DEFAULT_TIMEOUT;
  }

  async httpGet(
    path: string,
    options?: {
      headers: Record<string, string>;
      timeout?: number;
    }
  ): Promise<unknown> {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const opts = {
      headers: {},
      ...options
    };

    logger.debug(this.moduleName, 'HTTP GET request', { endpoint, headers: opts.headers });

    const timeoutMs = options?.timeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await requestUrl({
        url: endpoint,
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'obsidian.md',
          ...opts.headers
        }
      });

      logger.debug(this.moduleName, 'HTTP GET response received', {
        status: response.status,
        endpoint
      });

      return response.json;
    } catch (error) {
      logger.error(this.moduleName, 'HTTP GET request failed', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async httpPost(
    path: string,
    body: SafeAny,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: FormItemNameMapper;
      timeout?: number;
    }): Promise<unknown> {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: SafeAny;
    if (body instanceof FormItems) {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }

    logger.debug(this.moduleName, 'HTTP POST request', {
      endpoint,
      contentType: predefinedHeaders['content-type']
    });

    const timeoutMs = options?.timeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await requestUrl({
        url: endpoint,
        method: 'POST',
        headers: {
          'user-agent': 'obsidian.md',
          ...predefinedHeaders,
          ...options.headers
        },
        body: requestBody
      });

      logger.debug(this.moduleName, 'HTTP POST response received', {
        status: response.status,
        endpoint
      });

      return response.json;
    } catch (error) {
      logger.error(this.moduleName, 'HTTP POST request failed', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

}
