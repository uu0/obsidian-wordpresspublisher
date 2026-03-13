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
} from './wp-client';
import { WpPublishModalV2 } from './wp-publish-modal-v2';
import { PostType, PostTypeConst, Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT, WP_DEFAULT_PROFILE_NAME } from './consts';
import { isPromiseFulfilledResult, isValidUrl, openWithBrowser, processFile, SafeAny, showError, } from './utils';
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
    certificate: WordPressAuthParams
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
    auth: WordPressAuthParams
  ): Promise<RemotePostData | null> {
    try {
      const post = await this.getPost(postId, auth);
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
          console.warn('[fetchRemotePostData] Failed to fetch categories/tags list:', e);
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
      console.error('[fetchRemotePostData] Error fetching remote post:', error);
      return null;
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

  private async getAuth(): Promise<WordPressAuthParams> {
    let auth: WordPressAuthParams = {
      username: null,
      password: null
    };
    try {
      if (this.needLogin()) {
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
        }
      }
    } catch (error) {
      showError(error);
      const result = await openLoginModal(this.plugin, this.profile, async (auth) => {
        const authResult = await this.validateUser(auth);
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
      if (confirm.code !== ConfirmCode.Cancel) {
        delete matterData.postId;
        matterData.categories = this.profile.lastSelectedCategories ?? [ 1 ];
      }
    }
  }

  private async tryToPublish(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
    updateMatterData?: (matter: MatterData) => void,
  }): Promise<WordPressClientResult<WordPressPublishResult>> {
    const { postParams, auth, updateMatterData } = params;
    // Save original tag names before converting to IDs
    const tagNames = [...postParams.tags] as string[];
    const tagTerms = await this.getTags(postParams.tags, auth);
    postParams.tags = tagTerms.map(term => term.id);

    // Create any local-only categories (negative IDs) on the remote before publishing
    const resolvedCategories: number[] = [];
    const failedCategories: string[] = [];
    
    for (const catId of postParams.categories) {
      if (catId < 0) {
        // This is a local-only category, create it on the remote now
        const term = this.categoriesList.find(t => String(t.id) === String(catId));
        if (term) {
          try {
            const newTerm = await this.createCategory(term.name, auth);
            // Update the categories list with the real term
            const idx = this.categoriesList.indexOf(term);
            if (idx >= 0) this.categoriesList[idx] = newTerm;
            resolvedCategories.push(Number(newTerm.id));
            console.log(`[tryToPublish] Created remote category: ${term.name} -> ID ${newTerm.id}`);
          } catch (e) {
            console.error(`[tryToPublish] Failed to create category: ${term.name}`, e);
            failedCategories.push(term.name);
            // Continue to try other categories, but collect failed ones
          }
        }
      } else {
        resolvedCategories.push(catId);
      }
    }
    
    // If any categories failed to create, show an error and stop publishing
    if (failedCategories.length > 0) {
      throw new Error(this.plugin.i18n.t('error_categoriesCreationFailed', {
        names: failedCategories.join(', ')
      }));
    }
    
    // If all categories are local-only and all failed, we should have at least one category
    if (resolvedCategories.length === 0 && postParams.categories.length > 0) {
      throw new Error(this.plugin.i18n.t('error_noCategoriesAvailable'));
    }
    
    postParams.categories = resolvedCategories;

    await this.updatePostImages({
      auth,
      postParams
    });
    const html = AppState.markdownParser.render(postParams.content);
    const result = await this.publish(
      postParams.title ?? 'A post from Obsidian!',
      html,
      postParams,
      auth);
    if (result.code === WordPressClientReturnCode.Error) {
      throw new Error(this.plugin.i18n.t('error_publishFailed', {
        code: result.error.code as string,
        message: result.error.message
      }));
    } else {
      // post id will be returned if creating, true if editing
      const postId = result.data.postId;
      if (postId) {
        // Sync featured image URL if featuredImageId exists but featurePicture is missing
        let syncedFeaturePictureUrl: string | null = null;
        if (postParams.featuredMedia && !updateMatterData) {
          // Only sync if no custom updateMatterData callback (which handles new uploads)
          try {
            const mediaUrl = await this.getMediaUrl(postParams.featuredMedia, auth);
            if (mediaUrl) {
              syncedFeaturePictureUrl = mediaUrl;
              console.log('[tryToPublish] Synced featurePicture from featuredImageId:', postParams.featuredMedia, '->', mediaUrl);
            }
          } catch (e) {
            console.warn('[tryToPublish] Failed to sync featurePicture:', e);
          }
        }

        // const modified = matter.stringify(postParams.content, matterData, matterOptions);
        // this.updateFrontMatter(modified);
        const file = this.plugin.app.workspace.getActiveFile();
        if (file) {
          await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            // Check for duplicate keys before modification
            const knownKeys = ['blogName', 'postId', 'postType', 'categories', 'slug', 'featurePicture', 'featuredImageId', 'tags'];
            const existingKeys = Object.keys(fm);
            const duplicates = existingKeys.filter((key, index) => existingKeys.indexOf(key) !== index);
            if (duplicates.length > 0) {
              new Notice(this.plugin.t('notice_duplicateFrontmatter', { fields: duplicates.join(', ') }));
            }

            // Preserve existing non-plugin fields
            const existingOtherFields: Record<string, any> = {};
            for (const key of existingKeys) {
              if (!knownKeys.includes(key) && key !== 'excerpt' && key !== 'content') {
                existingOtherFields[key] = fm[key];
              }
            }

            // Write fields in fixed order
            // We rebuild the frontmatter to ensure correct ordering
            // Obsidian's processFrontMatter preserves insertion order

            // 1. blogName
            fm.blogName = this.profile.name;
            // 2. postId
            fm.postId = postId;
            // 3. postType
            fm.postType = postParams.postType;
            // 4. categories (single string, not array)
            if (postParams.postType === PostTypeConst.Post) {
              // Write category names instead of IDs
              const categoryNames = postParams.categories.map(catId => {
                const term = this.categoriesList.find(t => String(t.id) === String(catId));
                return term ? term.name : String(catId);
              });
              // Use first category as single string
              fm.categories = categoryNames[0] || '';
            }
            // 5. slug
            fm.slug = postParams.slug || '';
            // 6. featurePicture (preserve existing value, will be updated by updateMatterData callback if new image uploaded)
            // Only set empty string if not already present
            if (!fm.featurePicture) {
              fm.featurePicture = '';
            }
            // 7. featuredImageId (preserve existing value, will be updated by updateMatterData callback if new image uploaded)
            // Only set empty string if not already present
            if (!fm.featuredImageId) {
              fm.featuredImageId = '';
            }
            // 8. tags (formatted according to user preference)
            // Remove old 'tag' field if it exists (legacy cleanup)
            delete fm.tag;
            if (tagNames && tagNames.length > 0) {
              // Format tags according to user preference (YAML array or inline)
              fm.tags = TagFormatter.formatTags(
                tagNames,
                this.plugin.settings.tagFormat
              );
            } else if (!fm.tags) {
              // Default empty value based on format preference
              fm.tags = this.plugin.settings.tagFormat === 'inline' ? '' : [];
            }

            // Add excerpt below tag
            if (postParams.excerpt) {
              fm.excerpt = postParams.excerpt;
            }

            // Clean up content field from frontmatter (should not be stored there)
            delete fm.content;

            // Apply synced featurePicture if available
            if (syncedFeaturePictureUrl && !fm.featurePicture) {
              fm.featurePicture = syncedFeaturePictureUrl;
              console.log('[tryToPublish] Applied synced featurePicture to frontmatter');
            }

            if (isFunction(updateMatterData)) {
              updateMatterData(fm);
            }
          });
        }

        if (this.plugin.settings.rememberLastSelectedCategories) {
          this.profile.lastSelectedCategories = (result.data as SafeAny).categories;
          await this.plugin.saveSettings();
        }

        if (this.plugin.settings.showWordPressEditConfirm) {
          openPostPublishedModal(this.plugin)
            .then(() => {
              openWithBrowser(`${this.profile.endpoint}/wp-admin/post.php`, {
                action: 'edit',
                post: postId
              });
            });
        }
      }
    }
    return result;
  }

  private async updatePostImages(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
  }): Promise<void> {
    const { postParams, auth } = params;

    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile === null) {
      throw new Error(this.plugin.i18n.t('error_noActiveFile'));
    }
    const { activeEditor } = this.plugin.app.workspace;
    if (activeEditor && activeEditor.editor) {
      // process images
      const images = getImages(postParams.content);
      for (const img of images) {
        if (!img.srcIsUrl) {
          img.src = decodeURI(img.src);
          const fileName = img.src.split("/").pop();
          if (fileName === undefined) {
            continue;
          }
          const imgFile = this.plugin.app.metadataCache.getFirstLinkpathDest(img.src, fileName);
          if (imgFile instanceof TFile) {
            const content = await this.plugin.app.vault.readBinary(imgFile);
            const fileType = fileTypeChecker.detectFile(content);
            const result = await this.uploadMedia({
              mimeType: fileType?.mimeType ?? 'application/octet-stream',
              fileName: imgFile.name,
              content: content
            }, auth);
            if (result.code === WordPressClientReturnCode.OK) {
              if(img.width && img.height){
                  postParams.content = postParams.content.replace(img.original, `![[${result.data.url}|${img.width}x${img.height}]]`);
              }else if (img.width){
                  postParams.content = postParams.content.replace(img.original, `![[${result.data.url}|${img.width}]]`);
              }else{
                  postParams.content = postParams.content.replace(img.original, `![[${result.data.url}]]`);
              }
            } else {
              // Show detailed error message from upload result
              const errorMsg = result.error?.message || this.plugin.i18n.t('error_mediaUploadFailed', {
                name: imgFile.name,
              });
              console.error('[updatePostImages] Image upload failed:', imgFile.name, errorMsg);
              new Notice(errorMsg, ERROR_NOTICE_TIMEOUT);
            }
          }
        } else {
          // src is a url, skip uploading
        }
      }
      if (this.plugin.settings.replaceMediaLinks) {
        activeEditor.editor.setValue(postParams.content);
      }
    }
  }

  async publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult<WordPressPublishResult>> {
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(this.plugin.i18n.t('error_noEndpoint'));
      }
      // const { activeEditor } = this.plugin.app.workspace;
      const file = this.plugin.app.workspace.getActiveFile()
      if (file === null) {
        throw new Error(this.plugin.i18n.t('error_noActiveFile'));
      }

      // Step 1: Initialize/normalize frontmatter fields
      await this.frontmatterManager.initializeFrontmatter(file);

      // get auth info
      const auth = await this.getAuth();

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.plugin.app);

      // Step 2: Check for conflicts with remote data (if postId exists)
      if (matterData.postId) {
        const remoteData = await this.fetchRemotePostData(matterData.postId, auth);
        if (remoteData) {
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
      await this.checkExistingProfile(matterData);

      // now we're preparing the publishing data
      let postParams: WordPressPostParams;
      let result: WordPressClientResult<WordPressPublishResult> | undefined;
      if (defaultPostParams) {
        postParams = this.readFromFrontMatter(title, matterData, defaultPostParams);
        postParams.content = content;
        result = await this.tryToPublish({
          auth,
          postParams
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

        console.log('[publishPost] Raw frontmatter categories:', rawFmCats, 'Normalized:', fmCatArray);

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
              console.log(`[publishPost] Matched category "${name}" to ID ${existing.id}`);
            } else {
              // Category not found in remote - add it as a local-only category for the UI
              // It will be created on the remote only when user clicks publish
              newCategoryNames.push(name);
              console.log(`[publishPost] Category "${name}" not found in remote, will add as local-only`);
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
            console.log(`[publishPost] Added local-only category: ${name} (temp ID ${tempId})`);
          }

          // Only fall back to lastSelectedCategories if frontmatter was empty (not when match failed)
          // This preserves user's category selection from frontmatter
        } else if (fmCatArray.length > 0 && typeof fmCatArray[0] === 'number') {
          // Old format: numeric IDs - convert to names for consistency
          selectedCategories = fmCatArray as number[];
          console.log('[publishPost] Using numeric IDs from frontmatter:', selectedCategories);
        } else {
          // No categories in frontmatter, use last selected or default
          selectedCategories = this.profile.lastSelectedCategories ?? [1];
          console.log('[publishPost] No categories in frontmatter, using lastSelectedCategories:', selectedCategories);
        }
        const postTypes = await this.getPostTypes(auth);
        if (postTypes.length === 0) {
          postTypes.push(PostTypeConst.Post);
        }
        const selectedPostType = matterData.postType ?? PostTypeConst.Post;
        result = await new Promise(resolve => {
          console.log('[WpPublishModalV2] Creating modal instance...');
          const publishModal = new WpPublishModalV2(
            this.plugin,
            { items: categories, selected: selectedCategories },
            { items: postTypes, selected: selectedPostType },
            async (postParams: WordPressPostParams, updateMatterData: (matter: MatterData) => void, featuredImage) => {
              // Save user-selected values from modal before readFromFrontMatter overwrites them
              const userSelectedCategories = postParams.categories;
              const userSelectedTags = postParams.tags;
              const editedContent = postParams.content;
              const publishAsNew = postParams.publishAsNew; // Save publishAsNew flag
              
              postParams = this.readFromFrontMatter(title, matterData, postParams);
              
              // Handle "publish as new" option - remove postId to create new post instead of updating
              if (publishAsNew) {
                console.log('[WpPublishModalV2] Publish as new post requested, removing postId');
                delete postParams.postId;
              }
              
              // Restore user-selected values from modal (they take priority over frontmatter)
              if (userSelectedCategories && userSelectedCategories.length > 0) {
                postParams.categories = userSelectedCategories;
              }
              if (userSelectedTags && userSelectedTags.length > 0) {
                postParams.tags = userSelectedTags;
              }
              // Use edited content from modal if available, otherwise use original file content
              postParams.content = editedContent || content;

              // Store featured image info for frontmatter update
              let featuredImageUrl: string | undefined;
              let featuredImageId: number | undefined;

              try {
                // Handle featured image
                if (featuredImage) {
                  console.log('[WpPublishModalV2] Processing featured image:', featuredImage.fileName);
                  const uploadResult = await this.uploadMedia({
                    mimeType: featuredImage.mimeType,
                    fileName: featuredImage.fileName,
                    content: featuredImage.content
                  }, auth);

                  if (uploadResult.code === WordPressClientReturnCode.OK) {
                    // Get the media ID to use as featured image
                    postParams.featuredMedia = uploadResult.data.id;
                    featuredImageUrl = uploadResult.data.url;
                    featuredImageId = uploadResult.data.id;
                    console.log('[WpPublishModalV2] Featured image uploaded, media ID:', uploadResult.data.id);
                  } else {
                    // Show detailed error message from upload result
                    const errorMsg = uploadResult.error?.message || this.plugin.i18n.t('error_mediaUploadFailed', {
                      name: featuredImage.fileName,
                    });
                    console.error('[WpPublishModalV2] Featured image upload failed:', errorMsg);
                    new Notice(errorMsg, ERROR_NOTICE_TIMEOUT);
                  }
                }

                // Wrap updateMatterData to also save featured image info
                const wrappedUpdateMatterData = (fm: MatterData) => {
                  if (featuredImageUrl) {
                    fm.featurePicture = featuredImageUrl;
                  }
                  if (featuredImageId) {
                    fm.featuredImageId = featuredImageId;
                  }
                  if (isFunction(updateMatterData)) {
                    updateMatterData(fm);
                  }
                };

                const r = await this.tryToPublish({
                  auth,
                  postParams,
                  updateMatterData: wrappedUpdateMatterData
                });
                if (r.code === WordPressClientReturnCode.OK) {
                  // 发布成功，清理图片缓存
                  await publishModal.clearImageCache();
                  publishModal.close();
                  resolve(r);
                }
              } catch (error) {
                if (error instanceof Error) {
                  return showError(error);
                } else {
                  throw error;
                }
              }
            },
            matterData,
            content,
            title,
            file.path);  // 传递笔记路径用于缓存关联
          console.log('[WpPublishModalV2] Calling publishModal.open()...');
          publishModal.open();
          console.log('[WpPublishModalV2] publishModal.open() called');
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(this.plugin.i18n.t("message_publishFailed"));
      }
    } catch (error) {
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
  }

  private async getTags(tags: string[], certificate: WordPressAuthParams): Promise<Term[]> {
    const results = await Promise.allSettled(tags.map(name => this.getTag(name, certificate)));
    const terms: Term[] = [];
    results
      .forEach(result => {
        if (isPromiseFulfilledResult<Term>(result)) {
          terms.push(result.value);
        }
      });
    return terms;
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
        postParams.tags = matterData.tags as string[];
      } else if (params.tags && params.tags.length > 0) {
        // Preserve tags generated in modal if not in frontmatter
        postParams.tags = params.tags;
      }
    }
    // Read excerpt from frontmatter if not already set
    if (!postParams.excerpt && matterData.excerpt) {
      postParams.excerpt = matterData.excerpt;
    }
    // Read slug from frontmatter if not already set
    if (!postParams.slug && matterData.slug) {
      postParams.slug = matterData.slug;
    }
    // Read featured image ID from frontmatter if not already set
    // Also validate consistency between featuredImageId and featurePicture
    if (!postParams.featuredMedia && matterData.featuredImageId) {
      postParams.featuredMedia = matterData.featuredImageId;

      // Validate and sync featurePicture if inconsistent
      if (matterData.featuredImageId && !matterData.featurePicture) {
        console.warn('[readPostParamsFromFrontmatter] featuredImageId exists but featurePicture is empty. Will attempt to sync during publish.');
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

  // for ![Alt Text](image-url)
  let regex = /(!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]\((.*?)\))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[5],
      altText: match[2],
      width: match[3],
      height: match[4],
      original: match[1],
      startIndex: match.index,
      endIndex: match.index + match.length,
      srcIsUrl: isValidUrl(match[5]),
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
