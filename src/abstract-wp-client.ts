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

export abstract class AbstractWordPressClient implements WordPressClient {

  /**
   * Client name.
   */
  name = 'AbstractWordPressClient';

  private categoriesList: Term[] = [];

  protected constructor(
    protected readonly plugin: WordpressPlugin,
    protected readonly profile: WpProfile
  ) { }

  abstract publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>>;

  abstract getCategories(
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

  protected needLogin(): boolean {
    return true;
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
    const tagTerms = await this.getTags(postParams.tags, auth);
    postParams.tags = tagTerms.map(term => term.id);
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
      new Notice(this.plugin.i18n.t('message_publishSuccessfully'));
      // post id will be returned if creating, true if editing
      const postId = result.data.postId;
      if (postId) {
        // const modified = matter.stringify(postParams.content, matterData, matterOptions);
        // this.updateFrontMatter(modified);
        const file = this.plugin.app.workspace.getActiveFile();
        if (file) {
          await this.plugin.app.fileManager.processFrontMatter(file, fm => {
            // Check for duplicate keys before modification
            const knownKeys = ['blogName', 'postId', 'postType', 'categories', 'slug', 'featurePicture', 'featuredImageId', 'tag'];
            const existingKeys = Object.keys(fm);
            const duplicates = existingKeys.filter((key, index) => existingKeys.indexOf(key) !== index);
            if (duplicates.length > 0) {
              new Notice(`⚠️ Frontmatter 中存在重复字段: ${duplicates.join(', ')}，请手动检查`);
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
            // 4. categories
            if (postParams.postType === PostTypeConst.Post) {
              // Write category names instead of IDs
              const categoryNames = postParams.categories.map(catId => {
                const term = this.categoriesList.find(t => String(t.id) === String(catId));
                return term ? term.name : String(catId);
              });
              fm.categories = categoryNames;
            }
            // 5. slug
            fm.slug = postParams.slug || '';
            // 6. featurePicture (set by updateMatterData callback)
            if (!fm.featurePicture) fm.featurePicture = '';
            // 7. featuredImageId (set by updateMatterData callback)
            if (!fm.featuredImageId) fm.featuredImageId = '';
            // 8. tag (use 'tag' as field name per requirement)
            if (postParams.tags && postParams.tags.length > 0) {
              fm.tag = postParams.tags;
            } else if (!fm.tag) {
              fm.tag = '';
            }

            // Add excerpt below tag
            if (postParams.excerpt) {
              fm.excerpt = postParams.excerpt;
            }

            // Clean up content field from frontmatter (should not be stored there)
            delete fm.content;

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
              if (result.error.code === WordPressClientReturnCode.ServerInternalError) {
                new Notice(result.error.message, ERROR_NOTICE_TIMEOUT);
              } else {
                new Notice(this.plugin.i18n.t('error_mediaUploadFailed', {
                  name: imgFile.name,
                }), ERROR_NOTICE_TIMEOUT);
              }
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

      // get auth info
      const auth = await this.getAuth();

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.plugin.app);
      
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
        const rawFmCats = matterData.categories as (string | number)[] | undefined;
        if (rawFmCats && rawFmCats.length > 0 && typeof rawFmCats[0] === 'string') {
          // New format: category names
          const newCategoryNames: string[] = [];
          selectedCategories = [];
          for (const name of rawFmCats as string[]) {
            const existing = categories.find(c => c.name === name);
            if (existing) {
              selectedCategories.push(Number(existing.id));
            } else {
              // Category not found in WordPress - mark for auto-creation
              newCategoryNames.push(name);
            }
          }

          // Auto-create new categories
          for (const name of newCategoryNames) {
            try {
              const newTerm = await this.createCategory(name, auth);
              categories.push(newTerm);
              this.categoriesList = categories;
              selectedCategories.push(Number(newTerm.id));
              console.log(`[publishPost] Auto-created category: ${name} -> ID ${newTerm.id}`);
            } catch (e) {
              console.error(`[publishPost] Failed to create category: ${name}`, e);
              new Notice(`无法自动创建分类 "${name}": ${e instanceof Error ? e.message : '未知错误'}`);
            }
          }

          if (selectedCategories.length === 0) {
            selectedCategories = this.profile.lastSelectedCategories ?? [1];
          }
        } else {
          selectedCategories = (rawFmCats as number[] | undefined)
            ?? this.profile.lastSelectedCategories
            ?? [1];
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
              // Save edited content from modal before readFromFrontMatter overwrites it
              const editedContent = postParams.content;
              postParams = this.readFromFrontMatter(title, matterData, postParams);
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
                    new Notice(this.plugin.i18n.t('error_mediaUploadFailed', {
                      name: featuredImage.fileName,
                    }), ERROR_NOTICE_TIMEOUT);
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
            title);
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
        const rawCats = matterData.categories as (string | number)[];
        if (rawCats && rawCats.length > 0) {
          if (typeof rawCats[0] === 'string') {
            // Convert category names to IDs
            const catIds = rawCats.map(name => {
              const term = this.categoriesList.find(t => t.name === String(name));
              return term ? Number(term.id) : -1;
            }).filter(id => id !== -1);
            postParams.categories = catIds.length > 0 ? catIds : (this.profile.lastSelectedCategories ?? [1]);
          } else {
            postParams.categories = rawCats as number[];
          }
        } else {
          postParams.categories = this.profile.lastSelectedCategories ?? [1];
        }
      }
      if (matterData.tags) {
        postParams.tags = matterData.tags as string[];
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
    if (!postParams.featuredMedia && matterData.featuredImageId) {
      postParams.featuredMedia = matterData.featuredImageId;
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
