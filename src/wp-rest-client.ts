import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-types';
import { AbstractWordPressClient } from './abstract-wp-client';
import WordpressPlugin from './main';
import { PostStatus, PostType, Term } from './wp-api';
import { RestClient } from './rest-client';
import { isArray, isFunction, isNumber, isObject, isString, template } from 'lodash-es';
import { SafeAny } from './utils';
import { logger } from './utils/logger';
import { WpProfile } from './wp-profile';
import { FormItemNameMapper, FormItems, Media } from './types';
import { formatISO } from 'date-fns';

function encodeBasicCredentials(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}


interface WpRestEndpoint {
  base: string | UrlGetter;
  newPost: string | UrlGetter;
  editPost: string | UrlGetter;
  getCategories: string | UrlGetter;
  newTag: string | UrlGetter;
  getTag: string | UrlGetter;
  validateUser: string | UrlGetter;
  uploadFile: string | UrlGetter;
  getPostTypes: string | UrlGetter;
}

export class WpRestClient extends AbstractWordPressClient {

  private readonly client: RestClient;

  constructor(
    readonly plugin: WordpressPlugin,
    readonly profile: WpProfile,
    private readonly context: WpRestClientContext
  ) {
    super(plugin, profile);
    this.name = 'WpRestClient';
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint))
    });
  }

  private postRoute(type: PostType = 'post'): string {
    if (type !== 'post' && type !== 'page') {
      throw new Error(`Unsupported content type: ${type}. This version supports posts and pages.`);
    }
    return `wp-json/wp/v2/${type === 'page' ? 'pages' : 'posts'}`;
  }

  protected needLogin(): boolean {
    if (this.context.needLoginModal !== undefined) {
      return this.context.needLoginModal;
    }
    return  super.needLogin();
  }

  async publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>> {
    const route = this.postRoute(postParams.postType);
    const url = postParams.postId
      ? getUrl(this.context.endpoints?.editPost, `${route}/<%= postId %>`, { postId: postParams.postId })
      : getUrl(this.context.endpoints?.newPost, route);
    const extra: Record<string, string> = {};
    if (postParams.status === PostStatus.Future) {
      extra.date = formatISO(postParams.datetime ?? new Date());
    }
    // Pass slug and excerpt to WordPress API
    const slug = postParams.slug || '';
    const excerpt = postParams.excerpt || '';
    const resp: SafeAny = await this.client.httpPost(
      url,
      {
        title,
        content,
        status: postParams.status,
        comment_status: postParams.commentStatus,
        ...(postParams.postType === 'post' ? { categories: postParams.categories, tags: postParams.tags ?? [] } : {}),
        ...(this.context.name === 'WpRestClientWpComOAuth2Context' ? { type: postParams.postType } : {}),
        featured_media: postParams.featuredMedia,
        ...(postParams.slug !== undefined ? { slug } : {}),
        ...(postParams.excerpt !== undefined ? { excerpt } : {}),
        ...extra
      },
      {
        headers: this.context.getHeaders(certificate)
      });
    logger.debug('WpRestClient', 'publish response', resp);
    try {
      const result = this.context.responseParser.toWordPressPublishResult(postParams, resp);
      return {
        code: WordPressClientReturnCode.OK,
        data: result,
        response: resp
      };
    } catch (e) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: this.plugin.i18n.t('error_cannotParseResponse')
        },
        response: resp
      };
    }
  }

  private async listTerms(taxonomy: 'categories' | 'tags', certificate: WordPressAuthParams): Promise<Term[]> {
    const terms: Term[] = [];
    for (let page = 1; ; page++) {
      const base = this.context.endpoints?.base ?
        getUrl(taxonomy === 'categories' ? this.context.endpoints.getCategories : this.context.endpoints.getTag, '').split('?')[0] :
        `wp-json/wp/v2/${taxonomy}`;
      const query = this.context.endpoints?.base ? `number=100&page=${page}` : `per_page=100&page=${page}`;
      const data = await this.client.httpGet(`${base}?${query}`, { headers: this.context.getHeaders(certificate) });
      const batch = this.context.responseParser.toTerms(data);
      terms.push(...batch);
      if (batch.length < 100) return terms;
    }
  }

  async getCategories(certificate: WordPressAuthParams): Promise<Term[]> { return this.listTerms('categories', certificate); }
  async getTagsList(certificate: WordPressAuthParams): Promise<Term[]> { return this.listTerms('tags', certificate); }

  async getPostTypes(certificate: WordPressAuthParams): Promise<PostType[]> {
    const data: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getPostTypes, 'wp-json/wp/v2/types'),
      {
        headers: this.context.getHeaders(certificate)
      });
    return this.context.responseParser.toPostTypes(data).filter(type => type === 'post' || type === 'page');
  }

  async validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult<boolean>> {
    try {
      const data = await this.client.httpGet(
        getUrl(this.context.endpoints?.validateUser, `wp-json/wp/v2/users/me`),
        {
          headers: this.context.getHeaders(certificate)
        });
      return {
        code: WordPressClientReturnCode.OK,
        data: !!data,
        response: data
      };
    } catch(error) {
      const message = error instanceof Error
        ? error.message
        : this.plugin.i18n.t('error_invalidUser');
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.Error,
          message,
        },
        response: error
      };
    }
  }

  async getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    const termResp: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getTag, 'wp-json/wp/v2/tags?per_page=100&search=<%= name %>', {
        name: encodeURIComponent(name)
      }),
      { headers: this.context.getHeaders(certificate) }
    );
    const exists = this.context.responseParser.toTerms(termResp).filter(term => term.name === name);
    if (exists.length === 0) {
      const resp = await this.client.httpPost(
        getUrl(this.context.endpoints?.newTag, 'wp-json/wp/v2/tags'),
        {
          name
        },
        {
          headers: this.context.getHeaders(certificate)
        });
      logger.debug('WpRestClient', 'newTag response', resp);
      return this.context.responseParser.toTerm(resp);
    } else {
      return exists[0];
    }
  }

  async createCategory(name: string, certificate: WordPressAuthParams): Promise<Term> {
    const resp = await this.client.httpPost(
      getUrl(this.context.endpoints?.getCategories, 'wp-json/wp/v2/categories'),
      { name },
      {
        headers: this.context.getHeaders(certificate)
      });
    logger.debug('WpRestClient', 'createCategory response', resp);
    return this.context.responseParser.toTerm(resp);
  }

  async uploadMedia(media: Media, certificate: WordPressAuthParams): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    try {
      const formItems = new FormItems();
      formItems.append('file', media);
      if (media.altText?.trim()) {
        formItems.append('alt_text', media.altText.trim());
      }
      if (media.title?.trim()) {
        formItems.append('title', media.title.trim());
      }
      if (media.caption?.trim()) {
        formItems.append('caption', media.caption.trim());
      }
      if (media.description?.trim()) {
        formItems.append('description', media.description.trim());
      }

      const response: SafeAny = await this.client.httpPost(
        getUrl(this.context.endpoints?.uploadFile, 'wp-json/wp/v2/media'),
        formItems,
        {
          headers: {
            ...this.context.getHeaders(certificate)
          },
          formItemNameMapper: this.context.formItemNameMapper
        });
      const result = this.context.responseParser.toWordPressMediaUploadResult(response);
      return {
        code: WordPressClientReturnCode.OK,
        data: result,
        response
      };
    } catch (e: SafeAny) {
      console.error('uploadMedia', e);
      
      // Extract more specific error message
      let errorMessage = e.toString();
      if (e.message) {
        errorMessage = e.message;
      }
      
      // Check for common upload errors
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        // Try to parse WordPress error response
        let detailedError = errorMessage;
        try {
          if (e.response && e.response.json) {
            const wpError = e.response.json;
            if (wpError.message) {
              detailedError = wpError.message;
            } else if (wpError.code) {
              detailedError = `WordPress error: ${wpError.code}`;
            }
          }
        } catch (parseError) {
          // Ignore parsing errors
        }
        
        // Provide helpful hints for common issues
        const fileName = media.fileName.toLowerCase();
        const unsupportedFormats = ['.pic', '.bmp', '.tiff', '.tif'];
        const isUnsupported = unsupportedFormats.some(ext => fileName.endsWith(ext));
        
        if (isUnsupported) {
          detailedError = `Unsupported file format "${media.fileName}". WordPress supports: JPG, PNG, GIF, MP4, MOV, PDF, etc.`;
        }
        
        return {
          code: WordPressClientReturnCode.Error,
          error: {
            code: WordPressClientReturnCode.ServerInternalError,
            message: detailedError
          },
          response: e
        };
      }
      
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: errorMessage
        },
        response: e
      };
    }
  }

  async getMediaLibrary(certificate: WordPressAuthParams, params?: { search?: string, per_page?: number, page?: number }): Promise<WordPressClientResult<SafeAny[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      queryParams.append('per_page', String(params?.per_page ?? 20));
      queryParams.append('page', String(params?.page ?? 1));

      const url = `wp-json/wp/v2/media?${queryParams.toString()}`;
      const data = await this.client.httpGet(
        this.context.endpoints?.uploadFile ? `${getUrl(this.context.endpoints.uploadFile, '').replace(/\/new$/, '')}?${queryParams.toString()}` : url,
        {
          headers: this.context.getHeaders(certificate)
        });

      return {
        code: WordPressClientReturnCode.OK,
        data: (Array.isArray(data) ? data : (data as { media?: SafeAny[] }).media ?? []),
        response: data
      };
    } catch (e: SafeAny) {
      console.error('getMediaLibrary', e);
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: e.toString()
        },
        response: e
      };
    }
  }

  async getPost(postId: string | number, certificate: WordPressAuthParams, postType: PostType = 'post'): Promise<SafeAny | null> {
    try {
      const url = getUrl(this.context.endpoints?.editPost, `${this.postRoute(postType)}/<%= postId %>`, {
        postId: String(postId)
      });
      // Add _embed parameter to get featured media info
      const fullUrl = url.includes('?') ? `${url}&_embed` : `${url}?_embed`;
      const data = await this.client.httpGet(fullUrl, {
        headers: this.context.getHeaders(certificate)
      });
      return data;
    } catch (e: SafeAny) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get media URL by media ID
   * @param mediaId WordPress media ID
   * @param certificate Authentication credentials
   * @returns Media URL or null if not found
   */
  async getMediaUrl(mediaId: number | string, certificate: WordPressAuthParams): Promise<string | null> {
    try {
      const url = `wp-json/wp/v2/media/${mediaId}`;
      const data: SafeAny = await this.client.httpGet(url, {
        headers: this.context.getHeaders(certificate)
      });
      return data?.source_url || data?.url || null;
    } catch (e: SafeAny) {
      console.error('[getMediaUrl] Failed to fetch media:', e);
      return null;
    }
  }

}

type UrlGetter = () => string;

function getUrl(
  url: string | UrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string | number }
): string {
  let resultUrl: string;
  if (isString(url)) {
    resultUrl = url;
  } else if (isFunction(url)) {
    resultUrl = url();
  } else {
    resultUrl = defaultValue;
  }
  if (params) {
    const compiled = template(resultUrl);
    return compiled(params);
  } else {
    return resultUrl;
  }
}

interface WpRestClientContext {
  name: string;

  responseParser: {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny) => WordPressPublishResult;
    /**
     * Convert response to `WordPressMediaUploadResult`.
     *
     * If there is any error, throw new error directly.
     * @param response response from remote server
     */
    toWordPressMediaUploadResult: (response: SafeAny) => WordPressMediaUploadResult;
    toTerms: (response: SafeAny) => Term[];
    toTerm: (response: SafeAny) => Term;
    toPostTypes: (response: SafeAny) => PostType[];
  };

  endpoints?: Partial<WpRestEndpoint>;

  needLoginModal?: boolean;

  formItemNameMapper?: FormItemNameMapper;

  getHeaders(wp: WordPressAuthParams): Record<string, string>;

}

class WpRestClientCommonContext implements WpRestClientContext {
  name = 'WpRestClientCommonContext';

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    const username = wp.username ?? '';
    const password = wp.password ?? '';
    return {
      'authorization': `Basic ${encodeBasicCredentials(username, password)}`
    };
  }

  responseParser = {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny): WordPressPublishResult => {
      if (response.id) {
        return {
          postId: postParams.postId ?? response.id,
          categories: postParams.categories ?? response.categories
        }
      }
      throw new Error(`Unexpected publish response: missing post id. Response: ${JSON.stringify(response)}`);
    },
    toWordPressMediaUploadResult: (response: SafeAny): WordPressMediaUploadResult => {
      if (!Number.isInteger(response.id) || typeof response.source_url !== 'string') {
        throw new Error('Invalid WordPress media response; check the media library before retrying.');
      }
      return {
        url: response.source_url,
        id: response.id
      };
    },
    toTerms: (response: SafeAny): Term[] => {
      if (isArray(response)) {
        return response as Term[];
      }
      return [];
    },
    toTerm: (response: SafeAny): Term => ({
      ...response,
      id: response.id
    }),
    toPostTypes: (response: SafeAny): PostType[] => {
      if (isObject(response)) {
        return Object.keys(response);
      }
      return [];
    }
  };
}

export class WpRestClientMiniOrangeContext extends WpRestClientCommonContext {
  name = 'WpRestClientMiniOrangeContext';

  constructor() {
    super();
    logger.debug('WpRestClientMiniOrangeContext', 'loaded');
  }
}

export class WpRestClientAppPasswordContext extends WpRestClientCommonContext {
  name = 'WpRestClientAppPasswordContext';

  constructor() {
    super();
    logger.debug('WpRestClientAppPasswordContext', 'loaded');
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return super.getHeaders({
      ...wp,
      // WordPress displays application passwords in groups separated by spaces.
      password: wp.password?.replace(/\s+/g, '') ?? null
    });
  }
}

export class WpRestClientWpComOAuth2Context implements WpRestClientContext {
  name = 'WpRestClientWpComOAuth2Context';

  needLoginModal = false;

  endpoints: WpRestEndpoint = {
    base: 'https://public-api.wordpress.com',
    newPost: () => `/rest/v1.1/sites/${this.site}/posts/new`,
    editPost: () => `/rest/v1.1/sites/${this.site}/posts/<%= postId %>`,
    getCategories: () => `/rest/v1.1/sites/${this.site}/categories`,
    newTag: () => `/rest/v1.1/sites/${this.site}/tags/new`,
    getTag: () => `/rest/v1.1/sites/${this.site}/tags?number=1&search=<%= name %>`,
    validateUser: () => `/rest/v1.1/sites/${this.site}/posts?number=1`,
    uploadFile: () => `/rest/v1.1/sites/${this.site}/media/new`,
    getPostTypes: () => `/rest/v1.1/sites/${this.site}/post-types`,
  };

  constructor(
    private readonly site: string,
    private readonly accessToken: string
  ) {
    logger.debug('WpRestClientWpComOAuth2Context', 'loaded');
  }

  formItemNameMapper(name: string, isArray: boolean): string {
    if (name === 'file' && !isArray) {
      return 'media[]';
    }
    return name;
  }

  getHeaders(_wp: WordPressAuthParams): Record<string, string> {
    return {
      'authorization': `BEARER ${this.accessToken}`
    };
  }

  responseParser = {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny): WordPressPublishResult => {
      if (response.ID) {
        return {
          postId: postParams.postId ?? response.ID,
          categories: postParams.categories ?? Object.values(response.categories).map((cat: SafeAny) => cat.ID)
        };
      }
      throw new Error(`Unexpected WP.com publish response: missing post ID. Response: ${JSON.stringify(response)}`);
    },
    toWordPressMediaUploadResult: (response: SafeAny): WordPressMediaUploadResult => {
      if (response.media.length > 0) {
        const media = response.media[0];
        return {
          url: media.link,
          id: media.ID
        };
      } else if (response.errors) {
        throw new Error(response.errors.error.message);
      }
      throw new Error('Upload failed');
    },
    toTerms: (response: SafeAny): Term[] => {
      if (isNumber(response.found)) {
        return (response.categories ?? response.tags ?? [])
          .map((it: Term & { ID: number; }) => ({
            ...it,
            id: String(it.ID)
          }));
      }
      return [];
    },
    toTerm: (response: SafeAny): Term => ({
      ...response,
      id: response.ID
    }),
    toPostTypes: (response: SafeAny): PostType[] => {
      if (isNumber(response.found)) {
        return response
          .post_types
          .map((it: { name: string }) => (it.name));
      }
      return [];
    }
  };
}
