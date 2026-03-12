import WordpressPlugin from './main';
import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-client';
import { XmlRpcClient } from './xmlrpc-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import { PostStatus, PostType, PostTypeConst, Term } from './wp-api';
import { SafeAny, showError } from './utils';
import { WpProfile } from './wp-profile';
import { Media } from './types';

interface FaultResponse {
  faultCode: string;
  faultString: string;
}

function isFaultResponse(response: unknown): response is FaultResponse {
  return (response as FaultResponse).faultCode !== undefined;
}

export class WpXmlRpcClient extends AbstractWordPressClient {

  private readonly client: XmlRpcClient;

  constructor(
    readonly plugin: WordpressPlugin,
    readonly profile: WpProfile
  ) {
    super(plugin, profile);
    this.name = 'WpXmlRpcClient';
    this.client = new XmlRpcClient({
      url: new URL(profile.endpoint),
      xmlRpcPath: profile.xmlRpcPath ?? ''
    });
  }

  async publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>> {
    let publishContent;
    if (postParams.postType === PostTypeConst.Page) {
      publishContent = {
        post_type: postParams.postType,
        post_status: postParams.status,
        comment_status: postParams.commentStatus,
        post_title: title,
        post_content: content,
        ...(postParams.slug ? { post_name: postParams.slug } : {}),
        ...(postParams.excerpt ? { post_excerpt: postParams.excerpt } : {}),
      };
    } else {
      publishContent = {
        post_type: postParams.postType,
        post_status: postParams.status,
        comment_status: postParams.commentStatus,
        post_title: title,
        post_content: content,
        ...(postParams.slug ? { post_name: postParams.slug } : {}),
        ...(postParams.excerpt ? { post_excerpt: postParams.excerpt } : {}),
        terms: {
          'category': postParams.categories
        },
        terms_names: {
          'post_tag': postParams.tags
        }
      };
    }
    if (postParams.status === PostStatus.Future) {
      publishContent = {
        ...publishContent,
        post_date: postParams.datetime ?? new Date()
      };
    }
    if ((postParams as SafeAny).featuredMedia) {
      const mediaId = Number((postParams as SafeAny).featuredMedia);
      publishContent = {
        ...publishContent,
        post_thumbnail: mediaId
      };
    }
    let publishPromise;
    if (postParams.postId) {
      publishPromise = this.client.methodCall('wp.editPost', [
        0,
        certificate.username,
        certificate.password,
        postParams.postId,
        publishContent
      ]);
    } else {
      publishPromise = this.client.methodCall('wp.newPost', [
        0,
        certificate.username,
        certificate.password,
        publishContent
      ]);
    }
    const response = await publishPromise;
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: response.faultString
        },
        response
      };
    }
    return {
      code: WordPressClientReturnCode.OK,
      data: {
        postId: postParams.postId ?? (response as string),
        categories: postParams.categories
      },
      response
    };
  }

  async getCategories(certificate: WordPressAuthParams): Promise<Term[]> {
    const response = await this.client.methodCall('wp.getTerms', [
      0,
      certificate.username,
      certificate.password,
      'category'
    ]);
    if (isFaultResponse(response)) {
      const fault = `${response.faultCode}: ${response.faultString}`;
      showError(fault);
      throw new Error(fault);
    }
    return (response as SafeAny).map((it: SafeAny) => ({
      ...it,
      id: it.term_id
    })) ?? [];
  }

  async getTagsList(certificate: WordPressAuthParams): Promise<Term[]> {
    const response = await this.client.methodCall('wp.getTerms', [
      0,
      certificate.username,
      certificate.password,
      'post_tag'
    ]);
    if (isFaultResponse(response)) {
      const fault = `${response.faultCode}: ${response.faultString}`;
      showError(fault);
      throw new Error(fault);
    }
    return (response as SafeAny).map((it: SafeAny) => ({
      ...it,
      id: it.term_id
    })) ?? [];
  }

  async getPostTypes(certificate: WordPressAuthParams): Promise<PostType[]> {
    const response = await this.client.methodCall('wp.getPostTypes', [
      0,
      certificate.username,
      certificate.password,
    ]);
    if (isFaultResponse(response)) {
      const fault = `${response.faultCode}: ${response.faultString}`;
      showError(fault);
      throw new Error(fault);
    }
    return Object.keys(response as SafeAny) ?? [];
  }

  async validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult<boolean>> {
    const response = await this.client.methodCall('wp.getProfile', [
      0,
      certificate.username,
      certificate.password
    ]);
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: `${response.faultCode}: ${response.faultString}`
        },
        response
      };
    } else {
      return {
        code: WordPressClientReturnCode.OK,
        data: !!response,
        response
      };
    }
  }

  async getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    try {
      // First, try to search for the tag by name
      const searchResponse = await this.client.methodCall('wp.getTerms', [
        0,
        certificate.username,
        certificate.password,
        'post_tag',
        {
          search: name,
          number: 1
        }
      ]);
      
      if (isFaultResponse(searchResponse)) {
        throw new Error(`${searchResponse.faultCode}: ${searchResponse.faultString}`);
      }
      
      const terms = searchResponse as SafeAny[];
      if (terms && terms.length > 0) {
        // Found existing tag
        const term = terms[0];
        return {
          id: String(term.term_id),
          name: term.name,
          slug: term.slug,
          taxonomy: 'post_tag',
          description: term.description || '',
          count: term.count || 0
        };
      }
      
      // Tag doesn't exist, create it using wp.newTerm
      const createResponse = await this.client.methodCall('wp.newTerm', [
        0,
        certificate.username,
        certificate.password,
        {
          taxonomy: 'post_tag',
          name: name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description: ''
        }
      ]);
      
      if (isFaultResponse(createResponse)) {
        throw new Error(`${createResponse.faultCode}: ${createResponse.faultString}`);
      }
      
      // wp.newTerm returns the term ID
      const termId = createResponse;
      console.log('[wp-xml-rpc-client] Created tag:', name, 'ID:', termId);
      
      return {
        id: String(termId),
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        taxonomy: 'post_tag',
        description: '',
        count: 0
      };
    } catch (error) {
      console.error('[wp-xml-rpc-client] Failed to get/create tag:', name, error);
      throw new Error(`Failed to get/create tag "${name}" via XML-RPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCategory(name: string, certificate: WordPressAuthParams): Promise<Term> {
    // XML-RPC category creation - use wp.newCategory
    try {
      const response = await this.client.methodCall('wp.newCategory', [
        0, // blogId, usually 0 for single site
        certificate.username,
        certificate.password,
        {
          name: name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          parent_id: 0,
          description: ''
        }
      ]);
      
      if (isFaultResponse(response)) {
        throw new Error(`${response.faultCode}: ${response.faultString}`);
      }
      
      // wp.newCategory returns the category ID
      const categoryId = response;
      console.log('[wp-xml-rpc-client] Created category:', name, 'ID:', categoryId);
      
      // Return a Term object matching the expected format
      return {
        id: String(categoryId),
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        taxonomy: 'category',
        description: '',
        count: 0
      };
    } catch (error) {
      console.error('[wp-xml-rpc-client] Failed to create category:', name, error);
      throw new Error(`Failed to create category "${name}" via XML-RPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadMedia(media: Media, certificate: WordPressAuthParams): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    const wpMedia = {
      name: media.fileName,
      type: media.mimeType,
      bits: media.content,
    };
    const response = await this.client.methodCall('wp.uploadFile', [
      0,
      certificate.username,
      certificate.password,
      wpMedia,
    ]);
    if (isFaultResponse(response)) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: response.faultCode,
          message: `${response.faultCode}: ${response.faultString}`
        },
        response
      };
    }
    return {
      code: WordPressClientReturnCode.OK,
      data: {
        id: (response as SafeAny).id,
        url: (response as SafeAny).url
      },
      response
    };
  }

  async getPost(postId: string | number, certificate: WordPressAuthParams): Promise<SafeAny | null> {
    try {
      const response = await this.client.methodCall('wp.getPost', [
        0,
        certificate.username,
        certificate.password,
        postId
      ]);
      if (isFaultResponse(response)) {
        console.error('getPost fault:', response);
        return null;
      }
      return response;
    } catch (e: SafeAny) {
      console.error('getPost error:', e);
      return null;
    }
  }

}
