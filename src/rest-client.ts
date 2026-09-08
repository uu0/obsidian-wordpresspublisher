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
    assertSecureEndpoint(this.options.url);
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

    logger.debug(this.moduleName, 'HTTP GET request', { endpoint });

    const timeoutMs = options?.timeout ?? this.timeout;

    try {
      const response = await withRequestTimeout(
        requestUrl({
          url: endpoint,
          method: 'GET',
          throw: false,
          headers: {
            'content-type': 'application/json',
            'user-agent': 'obsidian.md',
            ...opts.headers
          }
        }), timeoutMs, 'GET'
      );

      logger.debug(this.moduleName, 'HTTP GET response received', {
        status: response.status,
        endpoint
      });

      if (response.status >= 400) {
        let errorBody: unknown;
        try { errorBody = response.json; } catch { errorBody = null; }
        throw new HttpError(response.status, errorBody);
      }
      return response.json;
    } catch (error) {
      logger.error(this.moduleName, 'HTTP GET request failed', error);
      throw error;
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

    try {
      const response = await withRequestTimeout(
        requestUrl({
          url: endpoint,
          method: 'POST',
          throw: false,
          headers: {
            'user-agent': 'obsidian.md',
            ...predefinedHeaders,
            ...options.headers
          },
          body: requestBody
        }), timeoutMs, 'POST'
      );

      logger.debug(this.moduleName, 'HTTP POST response received', {
        status: response.status,
        endpoint
      });

      if (response.status >= 400) {
        let errorBody: unknown;
        try { errorBody = response.json; } catch { errorBody = null; }
        throw new HttpError(response.status, errorBody);
      }
      return response.json;
    } catch (error) {
      logger.error(this.moduleName, 'HTTP POST request failed', error);
      throw error;
    }
  }

}

export class HttpError extends Error {
  readonly code: string;
  constructor(readonly status: number, response: unknown) {
    const body = response && typeof response === 'object' ? response as Record<string, unknown> : {};
    super(typeof body.message === 'string' ? body.message : `HTTP ${status}`);
    this.code = typeof body.code === 'string' ? body.code : `http_${status}`;
  }
}

export class RequestTimeoutError extends Error {
  readonly uncertain: boolean;
  constructor(method: string, timeoutMs: number) {
    super(`${method} request timed out after ${timeoutMs}ms. ${method === 'POST' ? 'The server may have accepted it; check WordPress before retrying.' : ''}`);
    this.uncertain = method === 'POST';
  }
}

export function assertSecureEndpoint(url: URL): void {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Use HTTPS for WordPress credentials (HTTP is only allowed on localhost).');
  }
  if (url.username || url.password) throw new Error('Do not include credentials in the site URL.');
}

export async function withRequestTimeout<T>(request: Promise<T>, timeoutMs: number, method: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RequestTimeoutError(method, timeoutMs)), timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
