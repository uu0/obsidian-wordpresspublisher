import MarkdownIt from 'markdown-it';
import { Notice, TFile } from 'obsidian';
import WordpressPlugin from './main';
import {
  WordPressAuthParams,
  WordPressClient,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-types';
import { WpPublishModalV2 } from './wp-publish-modal-v2';
import { compressImage } from './featured-image-modal';
import { PostType, PostTypeConst, Term } from './wp-api';
import { WP_DEFAULT_PROFILE_NAME, AUTH_CACHE_DURATION_MS } from './consts';
import { isValidUrl, openWithBrowser, processFile, SafeAny, showError } from './utils';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import fileTypeChecker from 'file-type-checker';
import { MatterData, Media } from './types';
import { openPostPublishedModal } from './post-published-modal';
import { openLoginModal } from './wp-login-modal';
import { isFunction } from 'lodash-es';
import { FrontmatterManager, RemotePostData } from './frontmatter-manager';
import { openConflictModal } from './frontmatter-conflict-modal';
import { TagFormatter } from './tag-formatter';
import { HttpError } from './rest-client';
import { resolveUncertainUpload } from './publish-recovery-modal';
import { sanitizeHtml } from './html-sanitizer';
import { applyPublishedNote, PublishCancelledError, PublishCheckpoint, publishKey } from './publish-safety';
import { createModuleLogger } from './utils/logger';
import type { PublishProgressReporter } from './publish-progress';

// 将散落的 console.* 统一收口到插件 logger（支持多参数）
const wpLog = createModuleLogger('AbstractWpClient');


interface AuthCacheEntry {
  auth: WordPressAuthParams;
  timestamp: number;
  profileName: string;
}

// Static cache for authentication across all client instances
const activePublications = new Set<string>();

const mediaUploads = new Map<string, Promise<WordPressClientResult<WordPressMediaUploadResult>>>();

const globalAuthCache = new Map<string, AuthCacheEntry>();

export abstract class AbstractWordPressClient implements WordPressClient {

  /**
   * Client name.
   */
  name = 'AbstractWordPressClient';

  protected categoriesList: Term[] = [];
  protected tagsList: Term[] = [];
  private frontmatterManager: FrontmatterManager;

  protected constructor(
    protected readonly plugin: WordpressPlugin,
    protected readonly profile: WpProfile
  ) {
    this.frontmatterManager = new FrontmatterManager(plugin.app, plugin);
  }

  abstract publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>>;

  abstract getCategories(
    certificate: WordPressAuthParams
  ): Promise<Term[]>;

  /**
   * Fetch all tags from WordPress.
   * @param certificate - Authentication parameters
   * @returns Array of tag terms
   */
  abstract getTagsList(
    certificate: WordPressAuthParams
  ): Promise<Term[]>;

  abstract getPostTypes(
    certificate: WordPressAuthParams
  ): Promise<PostType[]>;

  abstract validateUser(
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<boolean>>;

  abstract getTag(
    name: string,
    certificate: WordPressAuthParams
  ): Promise<Term>;

  abstract createCategory(
    name: string,
    certificate: WordPressAuthParams
  ): Promise<Term>;

  abstract uploadMedia(
    media: Media,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressMediaUploadResult>>;

  abstract getPost(
    postId: string | number,
    certificate: WordPressAuthParams,
    postType?: PostType
  ): Promise<SafeAny | null>;

  abstract getMediaUrl(
    mediaId: number | string,
    certificate: WordPressAuthParams
  ): Promise<string | null>;

  protected needLogin(): boolean {
    return true;
  }

  /**
   * Fetch remote post data for conflict detection
   * @param postId - Post ID to fetch
   * @param auth - Authentication parameters
   * @returns Remote post data or null if not found
   */
  protected async fetchRemotePostData(
    postId: string | number,
    auth: WordPressAuthParams,
    postType?: PostType
  ): Promise<RemotePostData | null> {
    try {
      const post = await this.getPost(postId, auth, postType);
      if (!post) return null;

      // Fetch categories list if we have categories to extract
      if ((post.categories && post.categories.length > 0 && this.categoriesList.length === 0) ||
          (post.tags && post.tags.length > 0 && this.tagsList.length === 0)) {
        try {
          if (this.categoriesList.length === 0) {
            this.categoriesList = await this.getCategories(auth);
          }
          if (post.tags && post.tags.length > 0 && this.tagsList.length === 0) {
            this.tagsList = await this.getTagsList(auth);
          }
        } catch (e) {
          wpLog.warn('[fetchRemotePostData] Failed to fetch categories/tags list:', e);
        }
      }

      // Extract relevant fields for conflict detection
      return {
        postId: post.id || postId,
        postType: post.type || 'post',
        categories: this.extractCategoryNames(post.categories || []),
        slug: post.slug || '',
        tags: this.extractTagNames(post.tags || []),
        excerpt: post.excerpt?.rendered || post.excerpt || '',
        featuredImageId: post.featured_media || undefined,
        featurePicture: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || undefined
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract category names from category IDs
   */
  private extractCategoryNames(categoryIds: number[]): string[] {
    return categoryIds.map(id => {
      const term = this.categoriesList.find(t => String(t.id) === String(id));
      return term ? term.name : String(id);
    });
  }

  /**
   * Extract tag names from tag IDs
   */
  private extractTagNames(tagIds: number[]): string[] {
    return tagIds.map(id => {
      const term = this.tagsList.find(t => String(t.id) === String(id));
      return term ? term.name : String(id);
    });
  }

  /**
   * Get the cache key for the current profile
   */
  private getAuthCacheKey(): string {
    return `${this.profile.name}_${this.profile.endpoint}_${this.profile.username ?? ""}_${this.profile.savePassword}`;
  }

  /**
   * Check if the cached authentication is still valid based on user's cache duration setting
   */
  private isAuthCacheValid(cacheEntry: AuthCacheEntry): boolean {
    const cacheDuration = this.plugin.settings.authCacheDuration ?? '1m';
    const maxAge = AUTH_CACHE_DURATION_MS[cacheDuration] ?? AUTH_CACHE_DURATION_MS['1m'];
    const age = Date.now() - cacheEntry.timestamp;
    return age < maxAge;
  }

  /**
   * Get cached authentication if available and valid
   */
  private getCachedAuth(): WordPressAuthParams | null {
    const cacheKey = this.getAuthCacheKey();
    const cacheEntry = globalAuthCache.get(cacheKey);

    if (cacheEntry && cacheEntry.profileName === this.profile.name) {
      if (this.isAuthCacheValid(cacheEntry)) {
        wpLog.info(`[getCachedAuth] Using cached auth for profile: ${this.profile.name}`);
        return cacheEntry.auth;
      } else {
        wpLog.info(`[getCachedAuth] Cache expired for profile: ${this.profile.name}`);
        globalAuthCache.delete(cacheKey);
      }
    }
    return null;
  }

  /**
   * Cache authentication for future use
   */
  private cacheAuth(auth: WordPressAuthParams): void {
    const cacheKey = this.getAuthCacheKey();
    const cacheDuration = this.plugin.settings.authCacheDuration ?? '1m';
    wpLog.info(`[cacheAuth] Caching auth for profile: ${this.profile.name}, duration: ${cacheDuration}`);
    globalAuthCache.set(cacheKey, {
      auth,
      timestamp: Date.now(),
      profileName: this.profile.name
    });
  }

  /**
   * Clear cached authentication for current profile
   */
  private clearCachedAuth(): void {
    const cacheKey = this.getAuthCacheKey();
    wpLog.info(`[clearCachedAuth] Clearing cache for profile: ${this.profile.name}`);
    globalAuthCache.delete(cacheKey);
  }

  private async getAuth(): Promise<WordPressAuthParams> {
    let auth: WordPressAuthParams = {
      username: null,
      password: null
    };

    try {
      if (this.needLogin()) {
        // First, check if we have a valid cached auth (P1 feature)
        const cachedAuth = this.getCachedAuth();
        if (cachedAuth) {
          return cachedAuth;
        }

        // Check if there's saved username and password
        if (this.profile.username && this.profile.password) {
          auth = {
            username: this.profile.username,
            password: this.profile.password
          };
          const authResult = await this.validateUser(auth);
          if (authResult.code !== WordPressClientReturnCode.OK) {
            throw new Error(this.plugin.i18n.t('error_invalidUser'));
          }
          // Cache the successful auth (P1 feature)
          this.cacheAuth(auth);
        } else {
          throw new Error(this.plugin.i18n.t('error_invalidUser'));
        }
      }
    } catch (error) {
      showError(error);
      // Clear cache on auth failure
      this.clearCachedAuth();
      const result = await openLoginModal(this.plugin, this.profile, async (auth) => {
        const authResult = await this.validateUser(auth);
        if (authResult.code === WordPressClientReturnCode.OK) {
          // Cache the successful auth from login modal (P1 feature)
          this.cacheAuth(auth);
        }
        return authResult.code === WordPressClientReturnCode.OK;
      });
      auth = result.auth;
    }
    return auth;
  }

  private async checkExistingProfile(matterData: MatterData) {
    // Support both old profileName and new blogName
    const profileName = matterData.blogName ?? matterData.profileName;
    const isProfileNameMismatch = profileName && profileName !== this.profile.name;
    if (isProfileNameMismatch) {
      const confirm = await openConfirmModal({
        message: this.plugin.i18n.t('error_profileNotMatch'),
        cancelText: this.plugin.i18n.t('profileNotMatch_useOld', {
          profileName: matterData.profileName
        }),
        confirmText: this.plugin.i18n.t('profileNotMatch_useNew', {
          profileName: this.profile.name
        })
      }, this.plugin);
      if (confirm.code === ConfirmCode.Cancel) throw new PublishCancelledError();
      {
        delete matterData.postId;
        matterData.categories = this.profile.lastSelectedCategories ?? [ 1 ];
      }
    }
  }

  async resolveUncertainPublish(): Promise<void> {
    const file = this.plugin.app.workspace.getActiveFile();
    if (!file) throw new Error('Open the source note first.');
    const key = publishKey(this.profile.endpoint, file.path);
    if (activePublications.has(key)) throw new Error('Wait for the active publish to finish.');
    activePublications.add(key);
    try {
      const auth = await this.getAuth();
      const data = await this.plugin.loadData();
      const checkpoint = data?.publishCheckpoints?.[key] as PublishCheckpoint | undefined;
      if (checkpoint?.stage === 'published') { await this.recoverPublication(file); return; }
      if (checkpoint) {
        await resolveUncertainUpload(this.plugin.app, `${this.profile.endpoint}: ${file.path}`, async id => {
          if (id) {
            const post = await this.getPost(id, auth, String(checkpoint.metadata.postType || 'post'));
            if (!post) throw new Error('That post was not found on this site.');
            await this.saveCheckpoint(file, { ...checkpoint, stage: 'published', postId: id, metadata: { ...checkpoint.metadata, postId: id } });
            await this.recoverPublication(file);
          } else await this.saveCheckpoint(file);
        });
      }
      const receipts = data?.mediaReceipts ?? {};
      for (const [receiptKey, value] of Object.entries(receipts)) {
        const receipt = value as { endpoint: string; fileName: string; pending?: boolean };
        if (!receipt.pending || receipt.endpoint !== this.profile.endpoint) continue;
        await resolveUncertainUpload(this.plugin.app, `${receipt.endpoint}: ${receipt.fileName}`, async id => {
          const url = id ? await this.getMediaUrl(id, auth) : null;
          if (id && !url) throw new Error('That media item was not found on this site.');
          await this.plugin.updateStoredData(stored => {
            const items = (stored.mediaReceipts ?? {}) as Record<string, unknown>;
            if (id) items[receiptKey] = { ...receipt, pending: false, result: { id: Number(id), url } };
            else delete items[receiptKey];
            stored.mediaReceipts = items;
          });
        });
      }
      if (!checkpoint && !Object.values(receipts).some(value => (value as { pending?: boolean; endpoint?: string }).pending && (value as { endpoint?: string }).endpoint === this.profile.endpoint)) {
        new Notice('No uncertain publish or upload for this site.');
      }
    } finally { activePublications.delete(key); }
  }

  private async uploadMediaSafely(media: Media, auth: WordPressAuthParams): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', media.content))).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const key = JSON.stringify([this.profile.endpoint, media.fileName, media.mimeType, media.altText ?? '', hash]);
    const running = mediaUploads.get(key);
    if (running) return running;
    const operation = (async (): Promise<WordPressClientResult<WordPressMediaUploadResult>> => {
      const existing = (await this.plugin.loadData())?.mediaReceipts?.[key];
      if (existing?.pending) throw new Error(`Upload result unknown for ${media.fileName}. Check the media library and use “Resolve uncertain publish” before retrying.`);
      if (existing?.result) return { code: WordPressClientReturnCode.OK, data: existing.result };
      const save = async (result?: WordPressMediaUploadResult) => this.plugin.updateStoredData(data => {
        const receipts = (data.mediaReceipts ?? {}) as Record<string, unknown>;
        receipts[key] = { endpoint: this.profile.endpoint, fileName: media.fileName, pending: !result, result };
        data.mediaReceipts = receipts;
      });
      await save();
      const result = await this.uploadMedia(media, auth);
      if (result.code === WordPressClientReturnCode.OK) await save(result.data);
      if (result.code !== WordPressClientReturnCode.OK && result.response instanceof HttpError && result.response.status < 500) {
        await this.plugin.updateStoredData(data => { delete (data.mediaReceipts as Record<string, unknown>)[key]; });
      }
      // A transport failure may have happened after the server accepted the bytes.
      return result;
    })();
    mediaUploads.set(key, operation);
    try { return await operation; } finally { mediaUploads.delete(key); }
  }

  private async saveCheckpoint(file: TFile, value?: PublishCheckpoint): Promise<void> {
    await this.plugin.updateStoredData(data => {
      const checkpoints = (data.publishCheckpoints ?? {}) as Record<string, PublishCheckpoint>;
      const key = publishKey(this.profile.endpoint, file.path);
      if (value) checkpoints[key] = value;
      else delete checkpoints[key];
      data.publishCheckpoints = checkpoints;
    });
  }

  private async recoverPublication(file: TFile): Promise<WordPressClientResult<WordPressPublishResult> | null> {
    const data = await this.plugin.loadData();
    const checkpoint = data?.publishCheckpoints?.[publishKey(this.profile.endpoint, file.path)] as PublishCheckpoint | undefined;
    if (!checkpoint) return null;
    if (checkpoint.stage === 'sending') {
      throw new Error('A previous publish has an unknown result. Check WordPress before retrying. Use the “Resolve uncertain publish” command to record its post ID or confirm it did not succeed.');
    }
    // Explicit retry recovers metadata only, preserving any edits made since the publish.
    await this.plugin.app.fileManager.processFrontMatter(file, fm => Object.assign(fm, checkpoint.metadata));
    await this.saveCheckpoint(file);
    new Notice('Recovered the existing WordPress post ID. Your current note content was preserved.');
    return { code: WordPressClientReturnCode.OK, data: { postId: checkpoint.postId!, categories: [] } };
  }

  private async tryToPublish(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
    file: TFile,
    sourceSnapshot: string,
    updateMatterData?: (matter: MatterData) => void,
    onProgress?: PublishProgressReporter,
  }): Promise<WordPressClientResult<WordPressPublishResult>> {
    const { auth, file, sourceSnapshot, updateMatterData, onProgress } = params;
    onProgress?.({ stage: 'prepare' });
    const recovered = await this.recoverPublication(file);
    if (recovered) return recovered;
    if (await this.plugin.app.vault.read(file) !== sourceSnapshot) {
      throw new Error('The source note changed. Reopen the publisher to use its latest content.');
    }
    if (!['post', 'page'].includes(params.postParams.postType)) throw new Error('This version supports posts and pages only.');
    // Never mutate the modal's draft into remote IDs/URLs; retries still start from local values.
    const postParams = { ...params.postParams, tags: [...params.postParams.tags], categories: [...params.postParams.categories] };
    const tagNames = [...postParams.tags];
    if (postParams.postType === 'post') {
      const terms = await this.getTags(tagNames, auth);
      postParams.tags = terms.map(term => term.id);
      postParams.categories = await Promise.all(postParams.categories.map(async id => {
        if (id >= 0) return id;
        const term = this.categoriesList.find(t => Number(t.id) === id);
        if (!term) throw new Error('Selected category no longer exists. Reopen the publisher.');
        const created = await this.createCategory(term.name, auth);
        return Number(created.id);
      }));
    } else {
      postParams.tags = [];
      postParams.categories = [];
    }
    await this.updatePostImages({ auth, postParams, file, onProgress });
    const html = sanitizeHtml(AppState.markdownParser.render(postParams.content));
    const rendered = new DOMParser().parseFromString(html, 'text/html');
    for (const image of Array.from(rendered.querySelectorAll('img'))) {
      const src = image.getAttribute('src') ?? '';
      if (!/^https?:\/\//i.test(src)) throw new Error(`Unresolved image: ${src}. Use a local inline image or an HTTPS URL.`);
    }
    const metadata: Record<string, unknown> = {
      blogName: this.profile.name,
      postType: postParams.postType,
      slug: postParams.slug ?? '',
      excerpt: postParams.excerpt ?? '',
      ...(postParams.featuredMedia !== undefined ? { featuredImageId: postParams.featuredMedia } : {}),
    };
    if (postParams.postType === 'post') {
      metadata.categories = params.postParams.categories.map(id => this.categoriesList.find(t => Number(t.id) === id)?.name ?? String(id));
      metadata.tags = TagFormatter.formatTags(tagNames, this.plugin.settings.tagFormat);
    }
    if (updateMatterData) updateMatterData(metadata);
    onProgress?.({ stage: 'wordpress' });
    // Persist intent before issuing a non-idempotent POST. Any ambiguous result blocks blind retry.
    await this.saveCheckpoint(file, { stage: 'sending', sourcePath: file.path, metadata });
    let result: WordPressClientResult<WordPressPublishResult>;
    try {
      result = await this.publish(postParams.title, html, postParams, auth);
    } catch (error) {
      // A definitive client rejection did not create a post; a transport failure is ambiguous.
      if (error instanceof HttpError && error.status >= 400 && error.status < 500) await this.saveCheckpoint(file);
      throw error;
    }
    if (result.code !== WordPressClientReturnCode.OK) {
      throw new Error(result.error.message);
    }
    metadata.postId = result.data.postId;
    await this.saveCheckpoint(file, { stage: 'published', sourcePath: file.path, postId: result.data.postId, metadata });
    onProgress?.({ stage: 'writeback' });
    await this.plugin.app.vault.process(file, raw => applyPublishedNote(
      raw, sourceSnapshot, metadata,
      this.plugin.settings.replaceMediaLinks ? postParams.content : undefined
    ));
    await this.saveCheckpoint(file);
    if (this.plugin.settings.rememberLastSelectedCategories) {
      this.profile.lastSelectedCategories = postParams.categories;
      // A secondary settings failure must not turn a completed post into a failed one.
      try { await this.plugin.saveSettings(); } catch (error) { wpLog.warn('Could not save last categories', error); }
    }
    if (this.plugin.settings.showWordPressEditConfirm) {
      void openPostPublishedModal(this.plugin).then(open => { if (open) openWithBrowser(`${this.profile.endpoint}/wp-admin/post.php`, {
        action: 'edit', post: result.data.postId
      }); }).catch(error => wpLog.warn('Could not open WordPress', error));
    }
    return result;
  }

  private async updatePostImages(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
    file: TFile,
    onProgress?: PublishProgressReporter,
  }): Promise<void> {
    const { postParams, auth, file, onProgress } = params;
    const images = getImages(postParams.content);
    const localImages = images.filter(image => !image.srcIsUrl).sort((a, b) => b.startIndex - a.startIndex);
    if (localImages.length === 0) onProgress?.({ stage: 'media', current: 0, total: 0 });
    for (const [index, img] of localImages.entries()) {
      onProgress?.({
        stage: 'media',
        current: index,
        total: localImages.length,
        detail: img.src
      });
      const source = decodeURI(img.src);
      const imgFile = this.plugin.app.metadataCache.getFirstLinkpathDest(source, file.path);
      if (!(imgFile instanceof TFile)) throw new Error(`Image not found: ${source}`);
      const content = await this.plugin.app.vault.readBinary(imgFile);
      const fileType = fileTypeChecker.detectFile(content);
      const result = await this.uploadMediaSafely({
        mimeType: fileType?.mimeType ?? 'application/octet-stream', fileName: imgFile.name,
        content, altText: img.altText
      }, auth);
      if (result.code !== WordPressClientReturnCode.OK) {
        throw new Error(result.error.message);
      }
      const alt = (img.altText ?? '').replace(/[\[\]\\]/g, '\\$&');
      const size = img.width ? `|${img.width}${img.height ? `x${img.height}` : ''}` : '';
      const replacement = `![${alt}${size}](<${result.data.url}>)`;
      postParams.content = postParams.content.slice(0, img.startIndex) + replacement + postParams.content.slice(img.endIndex);
      onProgress?.({ stage: 'media', current: index + 1, total: localImages.length, detail: imgFile.name });
    }
  }

  async publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult<WordPressPublishResult>> {
    const file = this.plugin.app.workspace.getActiveFile();
    if (!file) return showError('Open a note first.');
    const key = publishKey(this.profile.endpoint, file.path);
    if (activePublications.has(key)) return showError('This note is already being published.');
    activePublications.add(key);
    try { return await this.publishPostInner(defaultPostParams, file); }
    finally { activePublications.delete(key); }
  }

  private async publishPostInner(defaultPostParams: WordPressPostParams | undefined, sourceFile: TFile): Promise<WordPressClientResult<WordPressPublishResult>> {
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(this.plugin.i18n.t('error_noEndpoint'));
      }
      // const { activeEditor } = this.plugin.app.workspace;
      const file = sourceFile;
      if (file === null) {
        throw new Error(this.plugin.i18n.t('error_noActiveFile'));
      }

      const recovered = await this.recoverPublication(file);
      if (recovered) return recovered;

      // get auth info
      const auth = await this.getAuth();

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.plugin.app);

      await this.checkExistingProfile(matterData);

      // Step 2: Check for conflicts with remote data (if postId exists)
      if (matterData.postId) {
        const remoteData = await this.fetchRemotePostData(matterData.postId, auth, matterData.postType);
        if (remoteData) {
          // Update feature picture cache with remote data
          if (remoteData.featurePicture && remoteData.featuredImageId) {
            await this.plugin.featurePictureCacheManager.set(
              remoteData.postId,
              remoteData.featurePicture,
              remoteData.featuredImageId, this.profile.endpoint
            );
            wpLog.info('[publishPost] Updated feature picture cache from remote');
          }

          const conflicts = this.frontmatterManager.detectConflicts(matterData, remoteData);
          if (conflicts.length > 0) {
            const resolution = await openConflictModal(this.plugin.app, this.plugin, conflicts);

            if (resolution === 'cancel') {
              new Notice(this.plugin.t('notice_publishCancelled'));
              return {
                code: WordPressClientReturnCode.Error,
                error: {
                  code: WordPressClientReturnCode.Error,
                  message: this.plugin.t('error_userCancelledPublish')
                }
              };
            } else if (resolution === 'remote') {
              // Update local frontmatter with remote values
              const updates: Partial<MatterData> = {};
              for (const conflict of conflicts) {
                updates[conflict.field] = conflict.remoteValue;
              }
              await this.frontmatterManager.updateFrontmatter(file, updates);
              // Re-read frontmatter after update
              const { matter: updatedMatter } = await processFile(file, this.plugin.app);
              Object.assign(matterData, updatedMatter);
            }
            // If resolution === 'local', continue with local values (no action needed)
          }
        }
      }

      // check if profile selected is matched to the one in note property,
      // if not, ask whether to update or not
      const latestSource = await processFile(file, this.plugin.app);
      if (latestSource.content !== content) throw new Error('The note changed while preparing the publisher. Reopen it.');
      const sourceSnapshot = latestSource.raw;

      // now we're preparing the publishing data
      let postParams: WordPressPostParams;
      let result: WordPressClientResult<WordPressPublishResult> | undefined;
      if (defaultPostParams) {
        if (!matterData.postType || matterData.postType === 'post') this.categoriesList = await this.getCategories(auth);
        postParams = this.readFromFrontMatter(title, matterData, defaultPostParams);
        postParams.content = content;
        result = await this.tryToPublish({
          auth,
          postParams, file, sourceSnapshot
        });
      } else {
        let categories = await this.getCategories(auth);
        this.categoriesList = categories;

        // Handle frontmatter categories - may be names (new format) or IDs (old format)
        let selectedCategories: number[];
        const rawFmCats = matterData.categories;
        // Normalize to array: handle string (single/comma-separated) or array (multiple categories)
        let fmCatArray: (string | number)[] = [];
        if (typeof rawFmCats === 'string') {
          // Split by comma to support "分类1, 分类2" format
          fmCatArray = rawFmCats.split(/[,，]/).map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(rawFmCats)) {
          fmCatArray = rawFmCats;
        }

        wpLog.info(`[publishPost] Raw frontmatter categories: ${JSON.stringify(rawFmCats)} Normalized: ${JSON.stringify(fmCatArray)}`);

        if (fmCatArray.length > 0 && typeof fmCatArray[0] === 'string') {
          // New format: category names
          const newCategoryNames: string[] = [];
          selectedCategories = [];
          for (const name of fmCatArray as string[]) {
            // Try exact match first, then case-insensitive match
            let existing = categories.find(c => c.name === name);
            if (!existing) {
              existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
            }
            if (existing) {
              selectedCategories.push(Number(existing.id));
              wpLog.info(`[publishPost] Matched category "${name}" to ID ${existing.id}`);
            } else {
              // Category not found in remote - add it as a local-only category for the UI
              // It will be created on the remote only when user clicks publish
              newCategoryNames.push(name);
              wpLog.info(`[publishPost] Category "${name}" not found in remote, will add as local-only`);
            }
          }

          // Add missing categories as local-only entries to the UI list
          // They will be created on the remote during actual publish
          for (const name of newCategoryNames) {
            const tempId = -(categories.length + 1); // negative ID = local-only
            const tempTerm: Term = {
              id: String(tempId),
              name: name,
              slug: name.toLowerCase().replace(/\s+/g, '-'),
              taxonomy: 'category',
              description: '',
              count: 0
            };
            categories.push(tempTerm);
            this.categoriesList = categories;
            selectedCategories.push(tempId);
            wpLog.info(`[publishPost] Added local-only category: ${name} (temp ID ${tempId})`);
          }

          // Only fall back to lastSelectedCategories if frontmatter was empty (not when match failed)
          // This preserves user's category selection from frontmatter
        } else if (fmCatArray.length > 0 && typeof fmCatArray[0] === 'number') {
          // Old format: numeric IDs - convert to names for consistency
          selectedCategories = fmCatArray as number[];
          wpLog.info('[publishPost] Using numeric IDs from frontmatter:', selectedCategories);
        } else {
          // No categories in frontmatter, use last selected or find "Uncategorized"
          if (this.profile.lastSelectedCategories && this.profile.lastSelectedCategories.length > 0) {
            selectedCategories = this.profile.lastSelectedCategories;
          } else {
            // Find "Uncategorized" category by name
            const uncategorized = categories.find(cat =>
              cat.name === 'Uncategorized' ||
              cat.name === '未分类' ||
              cat.name.toLowerCase() === 'uncategorized'
            );
            selectedCategories = uncategorized ? [Number(uncategorized.id)] : [1];
          }
          wpLog.info(`[publishPost] No categories in frontmatter, using default: ${JSON.stringify(selectedCategories)}`);
        }
        const postTypes = await this.getPostTypes(auth);
        if (postTypes.length === 0) {
          postTypes.push(PostTypeConst.Post);
        }
        const selectedPostType = matterData.postType || PostTypeConst.Post;
        result = await new Promise(resolve => {
          wpLog.info('[WpPublishModalV2] Creating modal instance...');
          const publishModal = new WpPublishModalV2(
            this.plugin,
            { items: categories, selected: selectedCategories },
            { items: postTypes, selected: selectedPostType },
            async (postParams: WordPressPostParams, updateMatterData: (matter: MatterData) => void, featuredImage, onProgress) => {
              onProgress?.({ stage: 'prepare' });
              const recovered = await this.recoverPublication(file);
              if (recovered) { resolve(recovered); publishModal.close(); return; }
              if (await this.plugin.app.vault.read(file) !== sourceSnapshot) throw new Error('The note changed. Reopen the publisher.');
              // Save user-selected values from modal before readFromFrontMatter overwrites them
              const userSelectedTitle = postParams.title;
              const userSelectedType = postParams.postType;
              const userSelectedCategories = postParams.categories;
              const userSelectedTags = postParams.tags;
              const editedContent = postParams.content;
              const publishAsNew = postParams.publishAsNew; // Save publishAsNew flag
              
              postParams = this.readFromFrontMatter(title, matterData, postParams);
              postParams.title = userSelectedTitle;
              postParams.postType = userSelectedType;
              
              // Handle "publish as new" option - remove postId to create new post instead of updating
              if (publishAsNew) {
                wpLog.info('[WpPublishModalV2] Publish as new post requested, removing postId');
                delete postParams.postId;
              }
              
              // Restore user-selected values from modal (they take priority over frontmatter)
              if (userSelectedCategories !== undefined) {
                postParams.categories = userSelectedCategories;
              }
              if (userSelectedTags !== undefined) {
                postParams.tags = userSelectedTags;
              }
              // Use edited content from modal if available, otherwise use original file content
              postParams.content = editedContent;

              // Store featured image info for frontmatter update
              let featuredImageUrl: string | undefined;
              let featuredImageId: number | undefined;

              try {
                // Handle featured image
                if (featuredImage) {
                  onProgress?.({ stage: 'media', current: 0, total: 1, detail: featuredImage.fileName });
                  wpLog.info('[WpPublishModalV2] Processing featured image:', featuredImage.fileName);

                  // Apply image compression if enabled
                  let imageContent = featuredImage.content;
                  let imageMimeType = featuredImage.mimeType;

                  if (this.plugin.settings.enableImageCompression) {
                    const maxSizeKB = this.plugin.settings.imageMaxSizeKB || 500;
                    const minQuality = this.plugin.settings.imageMinQuality || 0.6;

                    wpLog.info('[WpPublishModalV2] Attempting image compression...');
                    const compressedContent = await compressImage(
                      featuredImage.content,
                      featuredImage.mimeType,
                      maxSizeKB,
                      minQuality
                    );

                    if (compressedContent) {
                      const originalSizeKB = (featuredImage.content.byteLength / 1024).toFixed(1);
                      const compressedSizeKB = (compressedContent.byteLength / 1024).toFixed(1);
                      new Notice(this.plugin.i18n.t('notice_imageCompressed', {
                        originalSize: originalSizeKB,
                        compressedSize: compressedSizeKB
                      }));
                      imageContent = compressedContent;
                      // PNG is converted to JPEG during compression
                      imageMimeType = featuredImage.mimeType === 'image/png' ? 'image/jpeg' : featuredImage.mimeType;
                      wpLog.info(`[WpPublishModalV2] Image compressed: ${originalSizeKB}KB -> ${compressedSizeKB}KB`);
                    } else {
                      wpLog.info('[WpPublishModalV2] Image does not need compression or compression failed');
                    }
                  }

                  // Upload with retry logic for transient errors (P0 feature)
                  const uploadResult = await this.uploadMediaWithRetry({
                    mimeType: imageMimeType,
                    fileName: imageMimeType === 'image/jpeg' ? featuredImage.fileName.replace(/\.[^.]+$/, '.jpg') : featuredImage.fileName,
                    content: imageContent
                  }, auth, featuredImage.fileName);

                  if (uploadResult.code === WordPressClientReturnCode.OK) {
                    onProgress?.({ stage: 'media', current: 1, total: 1, detail: featuredImage.fileName });
                    // Get the media ID to use as featured image
                    postParams.featuredMedia = uploadResult.data.id;
                    featuredImageUrl = uploadResult.data.url;
                    featuredImageId = uploadResult.data.id;
                    wpLog.info(`[WpPublishModalV2] Featured image uploaded, media ID: ${uploadResult.data.id}`);
                  } else {
                    // Show detailed error message from upload result
                    const errorMsg = uploadResult.error?.message || this.plugin.i18n.t('error_mediaUploadFailed', {
                      name: featuredImage.fileName,
                    });
                    wpLog.error('[WpPublishModalV2] Featured image upload failed:', errorMsg);
                    throw new Error(errorMsg);
                  }
                } else {
                  // 没有上传新图片，检查是否有缓存的 featuredImageId
                  const cachedImageId = publishModal.getCachedFeaturedImageId();
                  if (cachedImageId && postParams.featuredMedia !== 0) {
                    postParams.featuredMedia = cachedImageId;
                    featuredImageId = cachedImageId;
                    wpLog.info('[WpPublishModalV2] Using cached featured image ID:', cachedImageId);
                  }
                }

                // Wrap updateMatterData to also save featured image info
                const wrappedUpdateMatterData = (fm: MatterData) => {
                  if (featuredImageId) {
                    fm.featuredImageId = featuredImageId;
                  }
                  if (isFunction(updateMatterData)) {
                    updateMatterData(fm);
                  }
                };

                const r = await this.tryToPublish({
                  auth,
                  postParams, file, sourceSnapshot,
                  updateMatterData: wrappedUpdateMatterData,
                  onProgress
                });
                if (r.code === WordPressClientReturnCode.OK) {
                  // 发布成功，更新特色图片缓存
                  if (featuredImageUrl && featuredImageId) {
                    await this.plugin.featurePictureCacheManager.set(
                      r.data.postId,
                      featuredImageUrl,
                      featuredImageId, this.profile.endpoint
                    ).catch(error => wpLog.warn("Could not cache featured image", error));
                    wpLog.info('[WpPublishModalV2] Updated feature picture cache');
                  }
                  // 清理图片缓存
                  resolve(r);
                  await publishModal.clearImageCache().catch(error => wpLog.warn("Could not clear image cache", error));
                  publishModal.close();
                }
              } catch (error) {
                throw error;
              }
            },
            { ...matterData, blogName: this.profile.name },
            content,
            title,
            file.path,
            () => resolve({ code: WordPressClientReturnCode.Error, error: { code: 'cancelled', message: 'User cancelled' } }));  // 传递笔记路径用于缓存关联
          wpLog.info('[WpPublishModalV2] Calling publishModal.open()...');
          publishModal.open();
          wpLog.info('[WpPublishModalV2] publishModal.open() called');
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(this.plugin.i18n.t("message_publishFailed"));
      }
    } catch (error) {
      if (error instanceof PublishCancelledError) {
        return { code: WordPressClientReturnCode.Error, error: { code: 'cancelled', message: error.message } };
      }
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
  }

  private async getTags(tags: string[], certificate: WordPressAuthParams): Promise<Term[]> {
    return Promise.all(tags.map(name => this.getTag(name, certificate)));
  }

  private async uploadMediaWithRetry(media: Media, certificate: WordPressAuthParams, _fileName: string): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    // Upload POSTs are not idempotent. Never automatically repeat an ambiguous result.
    return this.uploadMediaSafely(media, certificate);
  }

  private readFromFrontMatter(
    noteTitle: string,
    matterData: MatterData,
    params: WordPressPostParams
  ): WordPressPostParams {
    const postParams = { ...params };
    postParams.title = noteTitle;
    if (matterData.title) {
      postParams.title = matterData.title;
    }
    if (matterData.postId) {
      postParams.postId = matterData.postId;
    }
    // Support both old profileName and new blogName
    postParams.profileName = matterData.blogName ?? matterData.profileName ?? WP_DEFAULT_PROFILE_NAME;
    if (matterData.postType) {
      postParams.postType = matterData.postType;
    } else {
      // if there is no post type in matter-data, assign it as 'post'
      postParams.postType = PostTypeConst.Post;
    }
    if (postParams.postType === PostTypeConst.Post) {
      // only 'post' supports categories and tags
      if (matterData.categories) {
        // Handle both string names (new format) and number IDs (old format)
        // Also handle string (single/comma-separated) vs array (multiple categories)
        const rawCats = matterData.categories;
        let catArray: (string | number)[] = [];
        if (typeof rawCats === 'string') {
          // Split by comma to support "分类1, 分类2" format
          catArray = rawCats.split(/[,，]/).map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(rawCats)) {
          catArray = rawCats;
        }
        if (catArray.length > 0) {
          if (typeof catArray[0] === 'string') {
            // Keep track of local-only categories (those not found on remote)
            const localCategoryIdMap: Map<string, number> = new Map();
            let nextNegativeId = -1;

            // Convert category names to IDs
            const catIds: number[] = [];
            for (const name of catArray) {
              const term = this.categoriesList.find(t => t.name === String(name));
              if (term) {
                catIds.push(Number(term.id));
              } else {
                // This is a local-only category, assign a negative ID
                const localId = nextNegativeId--;
                catIds.push(localId);
                localCategoryIdMap.set(String(name), localId);

                // Add to categoriesList with negative ID for later creation
                this.categoriesList.push({
                  id: String(localId),
                  name: String(name),
                  slug: String(name).toLowerCase().replace(/\s+/g, '-'),
                  taxonomy: 'category',
                  description: '',
                  count: 0
                });
              }
            }
            postParams.categories = catIds.length > 0 ? catIds : (this.profile.lastSelectedCategories ?? [1]);
          } else {
            postParams.categories = catArray as number[];
          }
        } else {
          postParams.categories = this.profile.lastSelectedCategories ?? [1];
        }
      }
      if (matterData.tags) {
        postParams.tags = TagFormatter.parseToArray(matterData.tags);
      } else if (params.tags && params.tags.length > 0) {
        // Preserve tags generated in modal if not in frontmatter
        postParams.tags = params.tags;
      }
    }
    // Read excerpt from frontmatter if not already set
    if (postParams.excerpt === undefined && matterData.excerpt !== undefined) {
      postParams.excerpt = matterData.excerpt;
    }
    // Read slug from frontmatter if not already set
    if (postParams.slug === undefined && matterData.slug !== undefined) {
      postParams.slug = matterData.slug;
    }
    // Read featured image ID from frontmatter if not already set
    // Also validate consistency between featuredImageId and featurePicture
    if (postParams.featuredMedia === undefined && matterData.featuredImageId) {
      postParams.featuredMedia = matterData.featuredImageId;

      // Validate and sync featurePicture if inconsistent
      if (matterData.featuredImageId && !matterData.featurePicture) {
        wpLog.warn('[readPostParamsFromFrontmatter] featuredImageId exists but featurePicture is empty. Will attempt to sync during publish.');
      }
    }
    return postParams;
  }

}

interface Image {
  original: string;
  src: string;
  altText?: string;
  width?: string;
  height?: string;
  srcIsUrl: boolean;
  startIndex: number;
  endIndex: number;
  file?: TFile;
  content?: ArrayBuffer;
}

function getImages(content: string): Image[] {
  const paths: Image[] = [];
  // Mask block/inline code without changing offsets, so examples are never uploaded or replaced.
  const lines = content.split('\n');
  const blocks = new MarkdownIt().parse(content, {});
  for (const token of blocks) {
    if ((token.type === 'fence' || token.type === 'code_block') && token.map) {
      for (let line = token.map[0]; line < token.map[1]; line++) lines[line] = ' '.repeat(lines[line].length);
    }
  }
  content = lines.join('\n').replace(/(`+)[\s\S]*?\1/g, match => ' '.repeat(match.length));

  // for ![Alt Text](image-url)
  let regex = /(!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]\((.*?)\))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[5].replace(/^<|>$/g, ''),
      altText: match[2],
      width: match[3],
      height: match[4],
      original: match[1],
      startIndex: match.index,
      endIndex: match.index + match.length,
      srcIsUrl: isValidUrl(match[5].replace(/^<|>$/g, '')),
    });
  }

  // for ![[image-name]]
  regex = /(!\[\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]])/g;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[2],
      original: match[1],
      width: match[3],
      height: match[4],
      startIndex: match.index,
      endIndex: match.index + match.length,
      srcIsUrl: isValidUrl(match[2]),
    });
  }

  return paths;
}
