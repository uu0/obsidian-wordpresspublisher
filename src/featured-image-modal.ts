import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { UnsplashService, UnsplashImage } from './unsplash-service';
import { AIService } from './ai-service';
import WordpressPlugin from './main';

export interface FeaturedImageResult {
  fileName: string;
  mimeType: string;
  content: ArrayBuffer;
  width?: number;
  height?: number;
}

export class FeaturedImageModal extends Modal {
  private result: FeaturedImageResult | null = null;
  private onSubmit: (result: FeaturedImageResult | null) => void;
  private unsplashService: UnsplashService | null = null;
  private aiService: AIService | null = null;

  private articleTitle: string;
  private articleContent: string;

  // 目标图片宽度和比例 (from settings)
  private get TARGET_WIDTH(): number {
    return this.plugin.settings.imageCropWidth || 1200;
  }

  private get ASPECT_RATIO(): number {
    const ratio = this.plugin.settings.imageCropRatio || '16:9';
    const parts = ratio.split(':').map(Number);
    return parts[1] / parts[0]; // height/width ratio
  }

  private initialSearchQuery: string;

  constructor(
    app: App,
    private plugin: WordpressPlugin,
    articleTitle: string,
    articleContent: string,
    onSubmit: (result: FeaturedImageResult | null) => void,
    initialSearchQuery: string = ''
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.articleTitle = articleTitle;
    this.articleContent = articleContent;
    this.initialSearchQuery = initialSearchQuery;

    // 初始化服务
    if (plugin.settings.unsplashAccessKey) {
      this.unsplashService = new UnsplashService(plugin.settings.unsplashAccessKey);
    }
    if (plugin.settings.aiConfig) {
      this.aiService = new AIService(plugin.settings.aiConfig);
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('featured-image-modal');

    contentEl.createEl('h2', { text: '选择特色图片' });

    // 创建按钮选择区域（不再使用tab）
    const buttonRow = contentEl.createDiv('featured-image-buttons-row');

    // 本地图片按钮
    const localBtn = buttonRow.createEl('button', {
      text: '📁 本地图片',
      cls: 'feature-btn'
    });
    localBtn.onclick = () => this.openLocalPicker();

    // Unsplash 按钮
    const unsplashBtn = buttonRow.createEl('button', {
      text: '🖼️ Unsplash',
      cls: 'feature-btn'
    });
    if (this.unsplashService) {
      unsplashBtn.onclick = () => this.openUnsplashPicker();
    } else {
      unsplashBtn.addClass('disabled');
      unsplashBtn.title = '请先在设置中配置 Unsplash API Key';
    }

    // AI 生成按钮
    const aiBtn = buttonRow.createEl('button', {
      text: '🎨 AI 生成',
      cls: 'feature-btn'
    });
    aiBtn.onclick = () => {
      if (!this.aiService) {
        new Notice('请先在设置中配置 AI 服务（图片生成 AI）');
      } else {
        this.openAIPicker();
      }
    };

    // 笔记库选择按钮
    const vaultBtn = buttonRow.createEl('button', {
      text: '📚 笔记库',
      cls: 'feature-btn'
    });
    vaultBtn.onclick = () => this.openVaultPicker();

    // 底部按钮
    const footerContainer = contentEl.createDiv('featured-image-footer');

    const cancelBtn = footerContainer.createEl('button', { text: '取消' });
    cancelBtn.onclick = () => {
      this.close();
      this.onSubmit(null);
    };

    const confirmBtn = footerContainer.createEl('button', {
      text: '确认选择',
      cls: 'mod-cta'
    });
    confirmBtn.onclick = () => {
      if (this.result) {
        this.close();
        this.onSubmit(this.result);
      } else {
        new Notice('请先选择一张图片');
      }
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  // 打开本地文件选择器
  private openLocalPicker(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          let arrayBuffer = await file.arrayBuffer();

          // 调整图片大小到1200px
          const processed = await this.resizeImage(arrayBuffer, file.type);
          if (!processed) {
            // 如果调整失败，使用原图
            new Notice('图片过大，将尝试调整大小');
          }

          this.result = {
            fileName: file.name,
            mimeType: file.type,
            content: processed || arrayBuffer,
            width: this.TARGET_WIDTH
          };

          const url = URL.createObjectURL(new Blob([this.result.content], { type: this.result.mimeType }));
          this.showPreview(url);
          new Notice('图片已选择');
        } catch (error) {
          new Notice(`选择图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    };
    fileInput.click();
  }

  // 打开 Unsplash 选择器
  private openUnsplashPicker(): void {
    const modal = new UnsplashPickerModal(
      this.app,
      this.plugin,
      this.unsplashService!,
      async (image, arrayBuffer) => {
        // 调整图片大小
        const processed = await this.resizeImage(arrayBuffer, 'image/jpeg');

        this.result = {
          fileName: `unsplash-${image.id}.jpg`,
          mimeType: 'image/jpeg',
          content: processed || arrayBuffer,
          width: this.TARGET_WIDTH
        };

        this.showPreview(image.urls.small);
      },
      this.initialSearchQuery  // Pass tags-based search query
    );
    modal.open();
  }

  // 打开 AI 生成选择器
  private openAIPicker(): void {
    const modal = new AIGenerateModal(
      this.app,
      this.plugin,
      this.articleTitle,
      this.articleContent,
      this.aiService!,
      async (imageUrl, arrayBuffer) => {
        // 调整图片大小
        const processed = await this.resizeImage(arrayBuffer, 'image/png');

        this.result = {
          fileName: `ai-generated-${Date.now()}.png`,
          mimeType: 'image/png',
          content: processed || arrayBuffer,
          width: this.TARGET_WIDTH
        };

        this.showPreview(imageUrl);
      }
    );
    modal.open();
  }

  // 打开笔记库选择器
  private openVaultPicker(): void {
    const modal = new VaultImagePickerModal(
      this.app,
      async (file, arrayBuffer, mimeType) => {
        // 调整图片大小
        const processed = await this.resizeImage(arrayBuffer, mimeType);

        this.result = {
          fileName: file.name,
          mimeType: mimeType,
          content: processed || arrayBuffer,
          width: this.TARGET_WIDTH
        };

        const blob = new Blob([this.result.content], { type: this.result.mimeType });
        this.showPreview(URL.createObjectURL(blob));
      }
    );
    modal.open();
  }

  // 显示预览
  private showPreview(imageUrl: string): void {
    const { contentEl } = this;

    // 移除旧的预览
    const oldPreview = contentEl.querySelector('.image-preview-section');
    if (oldPreview) {
      oldPreview.remove();
    }

    const previewSection = contentEl.createDiv('image-preview-section');

    const previewContainer = previewSection.createDiv('preview-container');
    previewContainer.createEl('h3', { text: '预览' });

    const img = previewContainer.createEl('img', {
      attr: { src: imageUrl }
    });
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    // 显示图片信息
    const info = previewSection.createDiv('preview-info');
    if (this.result) {
      info.createSpan({ text: `文件名: ${this.result.fileName}` });
      info.createEl('br');
      info.createSpan({ text: `宽度: ${this.TARGET_WIDTH}px (已统一设置)` });
    }
  }

  // 调整图片大小到目标宽度，并按设定比例裁剪
  private async resizeImage(arrayBuffer: ArrayBuffer, mimeType: string): Promise<ArrayBuffer | null> {
    try {
      const blob = new Blob([arrayBuffer], { type: mimeType });
      const bitmap = await createImageBitmap(blob);

      const targetWidth = this.TARGET_WIDTH;
      const targetHeight = Math.round(targetWidth * this.ASPECT_RATIO);

      // 如果图片已经小于目标宽度且比例接近，直接返回原图
      if (bitmap.width <= targetWidth) {
        bitmap.close();
        return null;
      }

      // 计算裁剪区域（居中裁剪）
      const srcAspect = bitmap.width / bitmap.height;
      const targetAspect = targetWidth / targetHeight;

      let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
      if (srcAspect > targetAspect) {
        // 源图更宽，裁掉左右
        sw = Math.round(bitmap.height * targetAspect);
        sx = Math.round((bitmap.width - sw) / 2);
      } else {
        // 源图更高，裁掉上下
        sh = Math.round(bitmap.width / targetAspect);
        sy = Math.round((bitmap.height - sh) / 2);
      }

      // 创建 canvas 并裁剪调整大小
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return null;
      }

      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      // 导出为指定格式
      const outputBlob = await canvas.convertToBlob({
        type: mimeType,
        quality: 0.92
      });

      const ratio = this.plugin.settings.imageCropRatio || '16:9';
      new Notice(`图片已裁剪为 ${targetWidth}x${targetHeight}px (${ratio})`);
      return await outputBlob.arrayBuffer();
    } catch (error) {
      console.error('Image resize failed:', error);
      return null;
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }
}

/**
 * Unsplash 图片选择器 - 瀑布流布局
 */
class UnsplashPickerModal extends Modal {
  private images: UnsplashImage[] = [];
  private hasMore = true;
  private page = 1;
  private currentQuery = '';
  private onSelect: (image: UnsplashImage, arrayBuffer: ArrayBuffer) => void;
  private unsplashService: UnsplashService;

  private initialSearchQuery: string;

  constructor(
    app: App,
    private plugin: WordpressPlugin,
    unsplashService: UnsplashService,
    onSelect: (image: UnsplashImage, arrayBuffer: ArrayBuffer) => void,
    initialSearchQuery: string = ''
  ) {
    super(app);
    this.unsplashService = unsplashService;
    this.onSelect = onSelect;
    this.initialSearchQuery = initialSearchQuery;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('unsplash-picker-modal');

    contentEl.createEl('h2', { text: '选择 Unsplash 图片' });

    // 搜索区域
    const searchContainer = contentEl.createDiv('unsplash-search-container');
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: '输入关键词搜索...'
    });
    searchInput.style.flex = '1';
    // Pre-fill search input with tags
    if (this.initialSearchQuery) {
      searchInput.value = this.initialSearchQuery;
    }

    const searchBtn = searchContainer.createEl('button', {
      text: '搜索',
      cls: 'mod-cta'
    });

    // 随机加载按钮
    const randomBtn = searchContainer.createEl('button', {
      text: '🎲 随机图片'
    });

    const resultsContainer = contentEl.createDiv('unsplash-results');

    // 加载随机图片
    const loadRandom = async () => {
      resultsContainer.empty();
      resultsContainer.createEl('p', { text: '加载中...' });

      try {
        this.images = await this.unsplashService.getRandomPhotos(30);
        this.hasMore = false;
        this.currentQuery = '';
        this.renderMasonry(resultsContainer);
      } catch (error) {
        resultsContainer.createEl('p', {
          text: `加载失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    };

    // 搜索功能
    const performSearch = async () => {
      const query = searchInput.value.trim();
      if (!query && !this.currentQuery) {
        new Notice('请输入搜索关键词');
        return;
      }

      this.currentQuery = query;
      this.page = 1;
      resultsContainer.empty();
      resultsContainer.createEl('p', { text: '搜索中...' });

      try {
        this.images = await this.unsplashService.searchPhotos(query);
        this.hasMore = false;
        this.renderMasonry(resultsContainer);
      } catch (error) {
        resultsContainer.createEl('p', {
          text: `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    };

    searchBtn.onclick = performSearch;
    searchInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    };
    randomBtn.onclick = loadRandom;

    // If we have an initial search query (from tags), search with it
    // Otherwise load random photos
    if (this.initialSearchQuery) {
      performSearch();
    } else {
      loadRandom();
    }
  }

  private renderMasonry(container: HTMLElement): void {
    container.empty();

    if (this.images.length === 0) {
      container.createEl('p', { text: '未找到相关图片' });
      return;
    }

    const grid = container.createDiv('unsplash-masonry');
    grid.style.columnCount = '3';
    grid.style.columnGap = '8px';

    this.images.forEach(image => {
      const item = grid.createDiv('unsplash-item');
      item.style.marginBottom = '8px';
      item.style.breakInside = 'avoid';

      const img = item.createEl('img', {
        attr: { src: image.urls.small }
      });
      img.style.width = '100%';
      img.style.display = 'block';
      img.style.borderRadius = '4px';
      img.style.cursor = 'pointer';

      item.onclick = async () => {
        container.createEl('p', { text: '下载中...' });
        try {
          const arrayBuffer = await this.unsplashService.downloadImage(image.urls.regular);
          this.close();
          this.onSelect(image, arrayBuffer);
        } catch (error) {
          container.createEl('p', {
            text: `下载失败: ${error instanceof Error ? error.message : '未知错误'}`
          });
        }
      };
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * AI 图片生成器 - 带预览和重新生成
 */
class AIGenerateModal extends Modal {
  private currentImageUrl: string | null = null;
  private currentArrayBuffer: ArrayBuffer | null = null;
  private articleTitle: string;
  private articleContent: string;
  private onSelect: (imageUrl: string, arrayBuffer: ArrayBuffer) => void;
  private aiService: AIService;

  constructor(
    app: App,
    private plugin: WordpressPlugin,
    articleTitle: string,
    articleContent: string,
    aiService: AIService,
    onSelect: (imageUrl: string, arrayBuffer: ArrayBuffer) => void
  ) {
    super(app);
    this.articleTitle = articleTitle;
    this.articleContent = articleContent;
    this.aiService = aiService;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('ai-generate-modal');

    contentEl.createEl('h2', { text: 'AI 生成图片' });

    // 提示词输入区域
    const promptContainer = contentEl.createDiv('ai-prompt-section');

    new Setting(promptContainer)
      .setName('图片描述')
      .setDesc('描述你想要生成的图片内容')
      .addTextArea(text => {
        text.setPlaceholder('例如：一个现代化的办公室场景...');
        text.inputEl.rows = 3;
        text.inputEl.style.width = '100%';
      });

    // 按钮区域
    const buttonRow = promptContainer.createDiv('ai-buttons-row');

    const autoBtn = buttonRow.createEl('button', {
      text: '📝 自动生成提示词'
    });

    const generateBtn = buttonRow.createEl('button', {
      text: '🎨 生成图片',
      cls: 'mod-cta'
    });

    // 预览区域
    const previewContainer = contentEl.createDiv('ai-preview-container');

    const resultContainer = previewContainer.createDiv('ai-result');

    // 自动生成提示词
    autoBtn.onclick = async () => {
      resultContainer.empty();
      resultContainer.createEl('p', { text: '生成提示词中...' });

      try {
        const prompt = await this.aiService.generateImagePrompt(
          this.articleTitle,
          this.articleContent
        );

        const textarea = promptContainer.querySelector('textarea');
        if (textarea) {
          textarea.value = prompt;
        }
        resultContainer.empty();
      } catch (error) {
        resultContainer.createEl('p', {
          text: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    };

    // 生成图片
    generateBtn.onclick = async () => {
      const textarea = promptContainer.querySelector('textarea');
      const prompt = textarea?.value.trim();

      if (!prompt) {
        new Notice('请输入或生成图片描述');
        return;
      }

      resultContainer.empty();
      resultContainer.createEl('p', { text: 'AI 正在生成图片，请稍候...' });
      generateBtn.setAttribute('disabled', 'true');

      try {
        const imageUrl = await this.aiService.generateImage(prompt);

        // 下载图片
        const response = await fetch(imageUrl);
        this.currentArrayBuffer = await response.arrayBuffer();
        this.currentImageUrl = imageUrl;

        // 显示预览
        resultContainer.empty();
        const img = resultContainer.createEl('img', {
          attr: { src: imageUrl }
        });
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.marginTop = '16px';

        // 添加操作按钮
        const actionRow = resultContainer.createDiv('ai-action-row');

        const regenerateBtn = actionRow.createEl('button', {
          text: '🔄 重新生成'
        });

        const saveBtn = actionRow.createEl('button', {
          text: '💾 保存并使用',
          cls: 'mod-cta'
        });

        const originalPrompt = prompt;
        regenerateBtn.onclick = async () => {
          resultContainer.empty();
          resultContainer.createEl('p', { text: '重新生成中...' });
          generateBtn.setAttribute('disabled', 'true');

          try {
            const newImageUrl = await this.aiService.generateImage(originalPrompt);
            const newResponse = await fetch(newImageUrl);
            this.currentArrayBuffer = await newResponse.arrayBuffer();
            this.currentImageUrl = newImageUrl;

            resultContainer.empty();
            const newImg = resultContainer.createEl('img', {
              attr: { src: newImageUrl }
            });
            newImg.style.maxWidth = '100%';
            newImg.style.borderRadius = '8px';
            newImg.style.marginTop = '16px';

            // 重新添加按钮
            const newActionRow = resultContainer.createDiv('ai-action-row');
            const newRegenerateBtn = newActionRow.createEl('button', { text: '🔄 重新生成' });
            const newSaveBtn = newActionRow.createEl('button', { text: '💾 保存并使用', cls: 'mod-cta' });

            newRegenerateBtn.onclick = () => regenerateBtn.click();
            newSaveBtn.onclick = () => {
              if (this.currentImageUrl && this.currentArrayBuffer) {
                this.close();
                this.onSelect(this.currentImageUrl, this.currentArrayBuffer);
              }
            };
          } catch (error) {
            resultContainer.createEl('p', {
              text: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`
            });
          } finally {
            generateBtn.removeAttribute('disabled');
          }
        };

        saveBtn.onclick = () => {
          if (this.currentImageUrl && this.currentArrayBuffer) {
            this.close();
            this.onSelect(this.currentImageUrl, this.currentArrayBuffer);
          }
        };

        generateBtn.removeAttribute('disabled');
      } catch (error) {
        resultContainer.createEl('p', {
          text: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
        generateBtn.removeAttribute('disabled');
      }
    };

    // 底部按钮
    const footer = contentEl.createDiv('ai-footer');
    const cancelBtn = footer.createEl('button', { text: '取消' });
    cancelBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * 笔记库图片选择器
 */
export class VaultImagePickerModal extends Modal {
  private onSelect: (file: TFile, arrayBuffer: ArrayBuffer, mimeType: string) => void;

  constructor(app: App, onSelect: (file: TFile, arrayBuffer: ArrayBuffer, mimeType: string) => void) {
    super(app);
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vault-picker-modal');

    contentEl.createEl('h2', { text: '从笔记库选择图片' });

    // 搜索框
    const searchContainer = contentEl.createDiv('vault-search');
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: '搜索图片文件...'
    });
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px';
    searchInput.style.marginBottom = '16px';

    const imageList = contentEl.createDiv('vault-image-list');
    imageList.style.display = 'grid';
    imageList.style.gridTemplateColumns = 'repeat(4, 1fr)';
    imageList.style.gap = '8px';
    imageList.style.maxHeight = '400px';
    imageList.style.overflowY = 'auto';

    const renderImages = (query: string) => {
      imageList.empty();

      const imageFiles = this.app.vault.getFiles().filter(file =>
        file.extension.match(/^(jpg|jpeg|png|gif|webp)$/i) &&
        (!query || file.path.toLowerCase().includes(query.toLowerCase()))
      );

      if (imageFiles.length === 0) {
        imageList.createEl('p', { text: '未找到图片文件' });
        return;
      }

      imageFiles.slice(0, 50).forEach(file => {
        const item = imageList.createDiv('vault-image-item');
        item.style.padding = '4px';
        item.style.border = '2px solid transparent';
        item.style.borderRadius = '8px';
        item.style.cursor = 'pointer';
        item.style.overflow = 'hidden';
        item.style.transition = 'all 0.2s';

        // 图片预览容器
        const imgContainer = item.createDiv();
        imgContainer.style.width = '100%';
        imgContainer.style.height = '120px';
        imgContainer.style.display = 'flex';
        imgContainer.style.alignItems = 'center';
        imgContainer.style.justifyContent = 'center';
        imgContainer.style.backgroundColor = 'var(--background-secondary)';
        imgContainer.style.borderRadius = '4px';
        imgContainer.style.overflow = 'hidden';
        imgContainer.style.marginBottom = '4px';

        const img = imgContainer.createEl('img');
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'cover';
        img.style.width = '100%';
        img.style.height = '100%';

        // 异步加载图片预览
        this.app.vault.readBinary(file).then(arrayBuffer => {
          const blob = new Blob([arrayBuffer]);
          const url = URL.createObjectURL(blob);
          img.src = url;
          img.onload = () => URL.revokeObjectURL(url);
        }).catch(() => {
          imgContainer.createEl('span', { text: '⚠️ 加载失败' });
        });

        // 文件名
        const nameDiv = item.createDiv();
        nameDiv.style.fontSize = '11px';
        nameDiv.style.textAlign = 'center';
        nameDiv.style.wordBreak = 'break-word';
        nameDiv.style.padding = '4px';
        nameDiv.textContent = file.name;

        // 悬停效果
        item.onmouseenter = () => {
          item.style.borderColor = 'var(--interactive-accent)';
          item.style.backgroundColor = 'var(--background-secondary)';
        };
        item.onmouseleave = () => {
          item.style.borderColor = 'transparent';
          item.style.backgroundColor = 'transparent';
        };

        item.onclick = async () => {
          try {
            const arrayBuffer = await this.app.vault.readBinary(file);
            const mimeType = this.getMimeType(file.extension);

            this.close();
            this.onSelect(file, arrayBuffer, mimeType);
          } catch (error) {
            new Notice(`读取图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        };
      });
    };

    searchInput.oninput = () => {
      renderImages(searchInput.value);
    };

    // 初始显示所有图片
    renderImages('');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }
}