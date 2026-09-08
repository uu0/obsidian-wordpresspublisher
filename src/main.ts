import { Plugin } from 'obsidian';
import { WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { createModuleLogger } from './utils/logger';

const log = createModuleLogger('WordpressPlugin');
import { WordPressPostParams } from './wp-types';
import { I18n, TranslateKey } from './i18n';
import { EventType, WP_OAUTH2_REDIRECT_URI, WP_OAUTH2_URL_ACTION } from './consts';
import { OAuth2Client } from './oauth2-client';
import { CommentStatus, PostStatus, PostTypeConst } from './wp-api';
import { openProfileChooserModal } from './wp-profile-chooser-modal';
import { AppState } from './app-state';
import { DEFAULT_SETTINGS, SettingsVersion, upgradeSettings, WordpressPluginSettings } from './plugin-settings';
import { PassCrypto } from './pass-crypto';
import { setupMarkdownParser, showError } from './utils';
import { doClientPublish } from './publisher-launcher';
import { cloneDeep } from 'lodash-es';
import { ImageCacheManager } from './image-cache-manager';
import { getWordPressClient } from './wp-clients';
import { processFile } from './utils';
import { settingsForStorage } from './credential-settings';
import { SerializedStore } from './serialized-store';
import { FeaturePictureCacheManager } from './feature-picture-cache-manager';

/**
 * Main plugin class for WordPress Publisher
 * Handles publishing Obsidian notes to WordPress sites
 */
export default class WordpressPlugin extends Plugin {

  private readonly storedData = new SerializedStore(() => this.loadData(), data => this.saveData(data));

  updateStoredData(change: (data: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    return this.storedData.update(change);
  }

  /** Plugin settings storage */
  private _settings: WordpressPluginSettings | undefined;

  /** Getter for plugin settings - guaranteed to be initialized after onload */
  get settings(): WordpressPluginSettings {
    if (!this._settings) {
      throw new Error('Settings not initialized');
    }
    return this._settings;
  }

  /** Internationalization instance */
  private _i18n: I18n | undefined;

  /** Getter for i18n instance - guaranteed to be initialized after onload */
  get i18n(): I18n {
    if (!this._i18n) {
      throw new Error('I18n not initialized');
    }
    return this._i18n;
  }

  /** Convenience method for translation - delegates to i18n.t() */
  t(key: TranslateKey, vars?: Record<string, string>): string {
    return this.i18n.t(key, vars);
  }

  /** Ribbon icon element reference */
  private ribbonWpIcon: HTMLElement | null = null;

  /** Feature picture cache manager */
  private _featurePictureCacheManager: FeaturePictureCacheManager | undefined;

  /** Getter for feature picture cache manager */
  get featurePictureCacheManager(): FeaturePictureCacheManager {
    if (!this._featurePictureCacheManager) {
      throw new Error('FeaturePictureCacheManager not initialized');
    }
    return this._featurePictureCacheManager;
  }

  /**
   * Plugin initialization - called when plugin is loaded
   */
  async onload(): Promise<void> {
    // Load settings first
    await this.loadSettings();

    // Initialize i18n after settings are loaded
    this._i18n = new I18n(this._settings?.lang);

    // Setup markdown parser with current settings
    setupMarkdownParser(this.settings);

    // Register custom icons
    addIcons();

    // Register OAuth2 protocol handler for WordPress.com authentication
    this.registerProtocolHandler();

    // Add ribbon icon if enabled in settings
    this.updateRibbonIcon();

    this.addCommand({
      id: 'resolve-uncertain-publish',
      name: 'Resolve uncertain publish / 核对发布结果',
      callback: async () => {
        try {
          const file = this.app.workspace.getActiveFile();
          if (!file) throw new Error('Open the source note first.');
          const { matter } = await processFile(file, this.app);
          const name = matter.blogName ?? matter.profileName;
          const profile = this.settings.profiles.find(item => name ? item.name === name : item.isDefault);
          if (!profile) throw new Error('Choose the source site using blogName in frontmatter.');
          const client = getWordPressClient(this, profile);
          if (client) await client.resolveUncertainPublish();
        } catch (error) { showError(error); }
      }
    });

    // Register command: Publish with default profile
    this.addCommand({
      id: 'defaultPublish',
      name: this._i18n.t('command_publishWithDefault'),
      editorCallback: () => {
        const defaultProfile = this._settings?.profiles.find(it => it.isDefault);
        if (defaultProfile) {
          const params: WordPressPostParams = {
            status: this._settings?.defaultPostStatus ?? PostStatus.Draft,
            commentStatus: this._settings?.defaultCommentStatus ?? CommentStatus.Open,
            categories: defaultProfile.lastSelectedCategories ?? [ 1 ],
            postType: PostTypeConst.Post,
            tags: [],
            title: '',
            content: ''
          };
          doClientPublish(this, defaultProfile, params);
        } else {
          showError(this._i18n?.t('error_noDefaultProfile') ?? 'No default profile found.');
        }
      }
    });

    // Register command: Choose profile and publish
    this.addCommand({
      id: 'publish',
      name: this._i18n.t('command_publish'),
      editorCallback: () => {
        this.openProfileChooser();
      }
    });

    // Add settings tab
    this.addSettingTab(new WordpressSettingTab(this));

    // Initialize feature picture cache manager
    this._featurePictureCacheManager = new FeaturePictureCacheManager(this);

    // Clean up orphan image caches (notes that no longer exist)
    this.cleanupOrphanCaches();

    // Clean up expired feature picture caches
    this.cleanupExpiredFeaturePictureCaches();
  }

  /**
   * Clean up orphan image caches in background
   */
  private async cleanupOrphanCaches(): Promise<void> {
    try {
      const cacheManager = new ImageCacheManager(this.app);
      const cleanedCount = await cacheManager.cleanupOrphanCaches();
      if (cleanedCount > 0) {
        log.info(`Cleaned up ${cleanedCount} orphan image caches`);
      }
    } catch (error) {
      log.error('Failed to cleanup orphan caches', error);
    }
  }

  /**
   * Clean up expired feature picture caches in background
   */
  private async cleanupExpiredFeaturePictureCaches(): Promise<void> {
    try {
      await this.featurePictureCacheManager.cleanExpired();
    } catch (error) {
      log.error('Failed to cleanup expired feature picture caches', error);
    }
  }

  /**
   * Plugin cleanup - called when plugin is unloaded
   */
  onunload(): void {
    // Cleanup ribbon icon if exists
    if (this.ribbonWpIcon) {
      this.ribbonWpIcon.remove();
      this.ribbonWpIcon = null;
    }
  }

  /**
   * Load plugin settings from disk and decrypt passwords
   */
  async loadSettings(): Promise<void> {
    // Load settings with defaults
    this._settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Upgrade settings if needed
    const { needUpgrade, settings } = await upgradeSettings(this._settings, SettingsVersion.V2);
    this._settings = settings;
    if (needUpgrade) {
      await this.saveSettings();
    }

    // Decrypt stored passwords for all profiles
    const crypto = new PassCrypto();
    const profileCount = this._settings?.profiles.length ?? 0;
    for (let i = 0; i < profileCount; i++) {
      const profile = this._settings?.profiles[i];
      const encryptedPassword = profile.encryptedPassword;
      if (encryptedPassword && profile.savePassword) {
        profile.password = await crypto.decrypt(
          encryptedPassword.encrypted,
          encryptedPassword.key,
          encryptedPassword.vector,
          encryptedPassword.salt
        ).catch(() => { log.warn('Could not decrypt saved password; sign in again.'); return undefined; });
      }
      if (!profile.savePassword) { delete profile.password; delete profile.encryptedPassword; }
      if (profile.encryptedWpComOAuth2Token) {
        const payload = profile.encryptedWpComOAuth2Token;
        try {
          const value = JSON.parse(await crypto.decrypt(payload.encrypted, payload.key, payload.vector, payload.salt));
          if (typeof value.accessToken !== 'string' || !value.blogId) throw new Error('Invalid OAuth token');
          profile.wpComOAuth2Token = value;
        } catch { delete profile.wpComOAuth2Token; log.warn('Could not decrypt OAuth token; reconnect this site.'); }
      }
    }

    // Decrypt AI API keys
    const aiConfig = this._settings?.aiConfig;
    if (aiConfig) {
      if (aiConfig.textAI?.encryptedApiKey) {
        aiConfig.textAI.apiKey = await crypto.decrypt(
          aiConfig.textAI.encryptedApiKey.encrypted,
          aiConfig.textAI.encryptedApiKey.key,
          aiConfig.textAI.encryptedApiKey.vector,
          aiConfig.textAI.encryptedApiKey.salt
        ).catch(() => undefined);
      }
      if (aiConfig.imageAI?.encryptedApiKey) {
        aiConfig.imageAI.apiKey = await crypto.decrypt(
          aiConfig.imageAI.encryptedApiKey.encrypted,
          aiConfig.imageAI.encryptedApiKey.key,
          aiConfig.imageAI.encryptedApiKey.vector,
          aiConfig.imageAI.encryptedApiKey.salt
        ).catch(() => undefined);
      }
    }

    // Decrypt Unsplash API key
    const encryptedUnsplash = this._settings?.encryptedUnsplashAccessKey;
    if (encryptedUnsplash) {
      this._settings!.unsplashAccessKey = await crypto.decrypt(
        encryptedUnsplash.encrypted,
        encryptedUnsplash.key,
        encryptedUnsplash.vector,
        encryptedUnsplash.salt
      ).catch(() => "");
    }

    // Migrate legacy plaintext token fields and apply remember-password removal on disk.
    await this.saveSettings();

    // Update markdown parser settings
    AppState.markdownParser.set({
      html: this._settings?.enableHtml ?? false
    });
  }

  /**
   * Save plugin settings to disk with encrypted passwords
   */
  private settingsSaveQueue: Promise<void> = Promise.resolve();

  saveSettings(): Promise<void> {
    const snapshot = cloneDeep(this.settings);
    const task = this.settingsSaveQueue.then(() => this.persistSettings(snapshot));
    this.settingsSaveQueue = task.catch(() => {});
    return task;
  }

  private async persistSettings(settings: WordpressPluginSettings): Promise<void> {
    const clean = await settingsForStorage(settings);
    await this.updateStoredData(data => {
      delete data.unsplashAccessKey;
      if (!('encryptedUnsplashAccessKey' in clean)) delete data.encryptedUnsplashAccessKey;
      Object.assign(data, clean);
    });
  }

  /**
   * Update ribbon icon visibility based on settings
   */
  updateRibbonIcon(): void {
    const ribbonIconTitle = this._i18n?.t('ribbon_iconTitle') ?? 'WordPress';

    if (this._settings?.showRibbonIcon) {
      // Add ribbon icon if not already present
      if (!this.ribbonWpIcon) {
        this.ribbonWpIcon = this.addRibbonIcon('wp-logo', ribbonIconTitle, () => {
          this.openProfileChooser();
        });
      }
    } else {
      // Remove ribbon icon if present
      if (this.ribbonWpIcon) {
        this.ribbonWpIcon.remove();
        this.ribbonWpIcon = null;
      }
    }
  }

  /**
   * Open profile chooser modal or directly publish if only one profile exists
   */
  private async openProfileChooser(): Promise<void> {
    const profileCount = this.settings.profiles.length;

    if (profileCount === 1) {
      // Directly use the only profile
      doClientPublish(this, this.settings.profiles[0]);
    } else if (profileCount > 1) {
      // Show profile chooser modal
      const profile = await openProfileChooserModal(this);
      doClientPublish(this, profile);
    } else {
      // No profiles configured
      showError(this.i18n.t('error_noProfile'));
    }
  }

  /**
   * Register Obsidian protocol handler for WordPress.com OAuth2 callback
   */
  private registerProtocolHandler(): void {
    this.registerObsidianProtocolHandler(WP_OAUTH2_URL_ACTION, async (params) => {
      if (params.action !== WP_OAUTH2_URL_ACTION || !params.state) {
        return;
      }

      // Handle OAuth2 error response
      if (params.error) {
        showError(this.i18n.t('error_wpComAuthFailed', {
          error: params.error,
          desc: params.error_description.replace(/\+/g, ' ')
        }));
        AppState.events.trigger(EventType.OAUTH2_TOKEN_GOT, undefined);
        return;
      }

      // Handle OAuth2 success response
      if (params.code) {
        try {
          const token = await OAuth2Client.getWpOAuth2Client(this).getToken({
            code: params.code,
            redirectUri: WP_OAUTH2_REDIRECT_URI,
            codeVerifier: AppState.codeVerifier
          });
          AppState.events.trigger(EventType.OAUTH2_TOKEN_GOT, token);
        } catch (error) {
          showError(error);
          AppState.events.trigger(EventType.OAUTH2_TOKEN_GOT, undefined);
        }
      }
    });
  }

}
