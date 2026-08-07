// Featured-image section of the V3 publish modal: picker buttons, drag-drop,
// remote-load states, and preview rendering. Extracted from WpPublishModalV2.

import { Notice } from 'obsidian';
import type { WordPressPostParams } from '../wp-types';
import { formatFileSize, truncateMiddle } from '../modal-helpers';
import type { PublishModalContext } from './publish-modal-context';
import { createV3Section } from './v3-layout';

// Object URLs created for blob previews must be revoked, otherwise each
// re-render leaks a Blob that the browser keeps alive. Track them centrally so
// the host modal can free every pending URL on rebuild/close.
const trackedObjectUrls = new Set<string>();

function trackObjectUrl(url: string): void {
  trackedObjectUrls.add(url);
}

function untrackObjectUrl(url: string): void {
  trackedObjectUrls.delete(url);
}

/** Revoke every tracked featured-image object URL (call on modal rebuild/close). */
export function revokeAllFeaturedImageUrls(): void {
  for (const url of trackedObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore - already invalid */
    }
  }
  trackedObjectUrls.clear();
}

export class FeaturedImageSection {
  constructor(private readonly ctx: PublishModalContext) {}

  private rootCard: HTMLElement | null = null;
  private currentParams: WordPressPostParams | null = null;
  private currentObjectUrl: string | null = null;

  render(container: HTMLElement, params: WordPressPostParams): void {
    this.currentParams = params;
    const section = createV3Section(
      container,
      this.ctx.plugin.t('publishModal_previewFeaturedImage') || 'Featured Image',
      []
    );
    this.rootCard = section;
    this.wireDragAndDrop(section);
    this.renderContent(section, params);
  }

  /** Re-render only this section's card (used for local state changes). */
  private rebuild(): void {
    if (this.rootCard && this.currentParams) {
      this.renderContent(this.rootCard, this.currentParams);
    }
  }

  private renderContent(section: HTMLElement, params: WordPressPostParams): void {
    const ctx = this.ctx;

    // Free the object URL owned by this instance before we replace the DOM.
    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch {
        /* ignore */
      }
      untrackObjectUrl(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    const existingBody = section.querySelector('.wp-v3-section-body');
    if (existingBody) existingBody.remove();
    const body = section.createDiv('wp-v3-section-body');

    const imageToDisplay = ctx.featuredImage || ctx.autoFeaturedImage;
    const hasImage = !!imageToDisplay || !!ctx.matterData.featurePicture;

    const updateHeaderActions = (opts: {
      sourceLabel?: string;      // 来源标签文字，例如 '📂 Local' / '☁️ WordPress'
      sourceCls?: string;        // 来源标签附加 CSS class
      fileName?: string;         // 文件名（完整），显示时中间截断
      showDelete?: boolean;      // 显示 ❌ 删除按钮
    } = {}) => {
      const actionsEl = section.querySelector('.wp-v3-section-actions') as HTMLElement | null;
      if (!actionsEl) return;
      actionsEl.empty();

      if (opts.sourceLabel) {
        const tag = actionsEl.createSpan({ cls: `wp-v3-featured-source-tag ${opts.sourceCls ?? ''}` });
        tag.textContent = opts.sourceLabel;
      }

      if (opts.fileName) {
        const nameEl = actionsEl.createSpan({ cls: 'wp-v3-img-filename' });
        nameEl.textContent = truncateMiddle(opts.fileName);
        nameEl.title = opts.fileName;
      }

      if (opts.showDelete) {
        const delBtn = actionsEl.createEl('button', {
          text: '❌',
          cls: 'wp-v3-icon-btn wp-v3-icon-btn-delete',
          attr: { title: ctx.plugin.t('publishModal_removeImage') || 'Remove image' }
        });
        delBtn.onclick = () => {
          ctx.featuredImage = null;
          ctx.autoFeaturedImage = null;
          ctx.matterData.featurePicture = '';
          this.rebuild();
        };
      }
    };

    const renderPreview = () => {
      body.empty();
      const wrap = body.createDiv('wp-v3-featured-image-wrap');

      if (ctx.isLoadingRemoteImage) {
        const loading = wrap.createDiv('wp-v3-featured-status-wrap');
        loading.createEl('p', { text: ctx.plugin.t('publishModal_loadingRemoteImage') || '正在加载远程图片...' });
        updateHeaderActions();
      } else if (ctx.remoteImageLoadFailed) {
        const errDiv = wrap.createDiv('wp-v3-featured-status-wrap wp-v3-featured-status-error');
        errDiv.createEl('p', { text: '❌ ' + (ctx.remoteImageError || '') });
        const btnRow = errDiv.createDiv('wp-v3-featured-btn-row');
        const retryBtn = btnRow.createEl('button', {
          text: ctx.plugin.t('publishModal_retryLoadImage') || '重试',
          cls: 'wp-v3-feature-btn'
        });
        retryBtn.onclick = async () => {
          if (ctx.remoteImagePostId) {
            ctx.remoteImageLoadFailed = false;
            ctx.remoteImageError = null;
            await ctx.loadRemoteFeaturedImage(ctx.remoteImagePostId, params);
          }
        };
        const skipBtn = btnRow.createEl('button', {
          text: ctx.plugin.t('publishModal_skipRemoteImage') || '跳过',
          cls: 'wp-v3-feature-btn'
        });
        skipBtn.onclick = () => {
          ctx.remoteImageLoadFailed = false;
          ctx.remoteImageError = null;
          ctx.remoteImagePostId = null;
          this.rebuild();
        };
        updateHeaderActions();
      } else if (imageToDisplay) {
        // imageSource 为 'cached' 时，图片是从远程 WordPress 或缓存加载的（已上传过）
        // 其他值（local/unsplash/ai/vault/auto）表示本次尚未上传的本地图片
        const isLocalNew = ctx.imageSource !== 'cached';
        const imgContainer = wrap.createDiv('wp-v3-featured-img-container');
        const blob = new Blob([imageToDisplay.content], { type: imageToDisplay.mimeType });
        const url = URL.createObjectURL(blob);
        this.currentObjectUrl = url;
        trackObjectUrl(url);
        imgContainer.createEl('img', { cls: 'wp-v3-featured-img', attr: { src: url, alt: 'Featured Image' } });

        if (isLocalNew) {
          // ── 本次新选的本地图片，尚未上传 ──
          updateHeaderActions({
            sourceLabel: '📂 Local',
            sourceCls: 'wp-v3-source-local',
            fileName: `${imageToDisplay.fileName} (${formatFileSize(imageToDisplay.content.byteLength)})`,
            showDelete: true
          });
        } else {
          // ── 从远程/缓存加载的图片，已上传到 WordPress ──
          const urlStr = ctx.matterData.featurePicture ? String(ctx.matterData.featurePicture) : imageToDisplay.fileName;
          updateHeaderActions({
            sourceLabel: '☁️ WordPress',
            sourceCls: 'wp-v3-source-uploaded',
            fileName: urlStr,
            showDelete: true
          });
        }
      } else if (ctx.matterData.featurePicture) {
        // ── 已上传到 WordPress（URL）：大图 + header 信息 ──
        const imgContainer = wrap.createDiv('wp-v3-featured-img-container');
        imgContainer.createEl('img', {
          cls: 'wp-v3-featured-img',
          attr: { src: ctx.matterData.featurePicture as string, alt: 'Featured Image' }
        });
        const urlStr = String(ctx.matterData.featurePicture);
        updateHeaderActions({
          sourceLabel: '☁️ WordPress',
          sourceCls: 'wp-v3-source-uploaded',
          fileName: urlStr,
          showDelete: true
        });
      } else {
        renderSetup();
        return;
      }
    };

    const renderSetup = () => {
      body.empty();

      const setup = body.createDiv('wp-v3-featured-setup');
      // 无图时的占位提示
      setup.createDiv({ cls: 'wp-v3-featured-empty', text: ctx.plugin.t('publishModal_noImageSelected') || '暂无特色图片' });

      // ── 选图按钮区 ──
      const btnRow = setup.createDiv('wp-v3-featured-btn-row');

      const localBtn = btnRow.createEl('button', {
        text: '📂 ' + ctx.plugin.t('publishModal_selectFromLocal'),
        cls: 'wp-v3-feature-btn'
      });
      localBtn.onclick = () => ctx.selectLocalFile(params);

      const vaultBtn = btnRow.createEl('button', {
        text: '📁 ' + ctx.plugin.t('publishModal_selectFromVault'),
        cls: 'wp-v3-feature-btn'
      });
      vaultBtn.onclick = () => ctx.selectVaultImage(params);

      if (ctx.unsplashService) {
        const unsplashBtn = btnRow.createEl('button', {
          text: '🖼️ Unsplash',
          cls: 'wp-v3-feature-btn'
        });
        unsplashBtn.onclick = () => ctx.selectUnsplashImage(params);
      }

      if (ctx.aiService?.hasImageAIKey()) {
        const aiBtn = btnRow.createEl('button', {
          text: '🤖 ' + ctx.plugin.t('publishModal_aiGenerate'),
          cls: 'wp-v3-feature-btn'
        });
        aiBtn.onclick = () => ctx.generateFeaturedImage(params);
      } else {
        const aiBtn = btnRow.createEl('button', {
          text: '🤖 ' + ctx.plugin.t('publishModal_aiGenerate'),
          cls: 'wp-v3-feature-btn disabled'
        });
        aiBtn.onclick = () => new Notice(ctx.plugin.t('notice_imageAIApiKeyRequired'));
      }

      // 无图时清空 header actions
      updateHeaderActions();
    };

    if (hasImage) {
      renderPreview();
    } else {
      renderSetup();
    }
  }

  private wireDragAndDrop(section: HTMLElement): void {
    const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const SUPPORTED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

    const bodyEl = () => section.querySelector('.wp-v3-section-body') as HTMLElement | null;

    section.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const items = e.dataTransfer?.items;
      if (items && items.length > 0 && items[0].kind === 'file') {
        bodyEl()?.addClass('drag-over');
        section.querySelector('.wp-v3-featured-empty')?.addClass('drag-over');
        section.querySelector('.wp-v3-featured-img-container')?.addClass('drag-over');
      }
    });

    section.addEventListener('dragleave', (e: DragEvent) => {
      if (!section.contains(e.relatedTarget as Node)) {
        bodyEl()?.removeClass('drag-over');
        section.querySelector('.wp-v3-featured-empty')?.removeClass('drag-over');
        section.querySelector('.wp-v3-featured-img-container')?.removeClass('drag-over');
      }
    });

    section.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      bodyEl()?.removeClass('drag-over');
      section.querySelector('.wp-v3-featured-empty')?.removeClass('drag-over');
      section.querySelector('.wp-v3-featured-img-container')?.removeClass('drag-over');

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeOk = SUPPORTED_MIME.includes(file.type);
      const extOk = SUPPORTED_EXT.includes(ext);

      if (!mimeOk && !extOk) {
        // 格式不支持：显示错误提示，保持原状
        const errEl = bodyEl()?.createDiv('wp-v3-drop-error');
        if (errEl) {
          errEl.textContent = `❌ 不支持的图片格式: .${ext}`;
          setTimeout(() => errEl.remove(), 2500);
        }
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const mimeType = mimeOk ? file.type : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        this.ctx.featuredImage = {
          fileName: file.name,
          content: new Uint8Array(arrayBuffer),
          mimeType
        };
        // 局部刷新本卡片，而不是整模态重建
        this.rebuild();
      } catch (err) {
        new Notice(this.ctx.plugin.t('error_imageLoadFailed'));
      }
    });
  }
}
