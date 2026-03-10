import { Setting, Notice, TFile } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { CommentStatus, PostStatus, PostType, PostTypeConst, Term } from './wp-api';
import { toNumber } from 'lodash-es';
import { MatterData } from './types';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import { AbstractModal } from './abstract-modal';
import IMask, { DynamicMaskType, InputMask } from 'imask';
import { SafeAny } from './utils';
import { format, parse } from 'date-fns';
import { SlugGenerator } from './slug-generator';
import { FeaturedImageModal, FeaturedImageResult } from './featured-image-modal';
import { AIService } from './ai-service';
import { AppState } from './app-state';

/**
 * WordPress publish modal V2 - New version with improved UI
 * Tabs: settings/preview/advanced
 */
export class WpPublishModalV2 extends AbstractModal {

  private dateInputMask: InputMask<DynamicMaskType> | null = null;
  private featuredImage: FeaturedImageResult | null = null;
  private aiService: AIService | null = null;
  private slugInput: HTMLInputElement | null = null;
  private titleInput: HTMLInputElement | null = null;
  private currentTab: 'settings' | 'preview' | 'advanced' = 'settings';
  private editableContent: string = '';
  private isEditingPreview: boolean = false;
  private autoFeaturedImage: FeaturedImageResult | null = null;

  // Prompt templates from settings
  private get imageGenerationPrompt(): string {
    return this.plugin.settings.imageGenerationPrompt || '根据以下内容生成一个适合作为封面图片的英文描述：{title} - {content}';
  }

  private get summaryPrompt(): string {
    return this.plugin.settings.summaryPrompt || '请为以下文章生成一个简洁的摘要，不超过200字：{content}';
  }

  private get tagsPrompt(): string {
    return this.plugin.settings.tagsPrompt || '请为以下文章生成3-5个标签，用逗号分隔：{content}';
  }

  constructor(
    readonly plugin: WordpressPlugin,
    private readonly categories: {
      items: Term[],
      selected: number[]
    },
    private readonly postTypes: {
      items: PostType[],
      selected: PostType
    },
    private readonly onSubmit: (
      params: WordPressPostParams,
      updateMatterData: (matter: MatterData) => void,
      featuredImage?: FeaturedImageResult
    ) => void,
    private readonly matterData: MatterData,
    private readonly articleContent: string = '',
    private readonly noteTitle: string = ''
  ) {
    super(plugin);
    console.log('[WpPublishModalV2] Constructor called');

    if (plugin.settings.aiConfig) {
      this.aiService = new AIService(plugin.settings.aiConfig);
    }

    // 自动检测文章第一张图片作为特色图片
    this.detectFirstImage();
  }

  // 检测文章第一张图片
  private async detectFirstImage(): Promise<void> {
    try {
      const content = this.articleContent || '';
      const imageRegex = /!\[.*?\]\((.*?)\)|!\[\[(.*?)(?:\|.*?)?\]\]/g;
      const match = imageRegex.exec(content);

      if (match) {
        const imagePath = match[1] || match[2];
        if (imagePath && !imagePath.startsWith('http')) {
          // 本地图片，尝试获取
          const file = this.app.metadataCache.getFirstLinkpathDest(imagePath, this.noteTitle);
          if (file instanceof TFile) {
            const binaryContent = await this.app.vault.readBinary(file);
            const ext = file.extension.toLowerCase();
            const mimeType = this.getMimeType(ext);

            this.autoFeaturedImage = {
              fileName: file.name,
              mimeType: mimeType,
              content: binaryContent,
              width: 1200
            };
            console.log('[WpPublishModalV2] Auto-detected first image:', file.name);
          }
        } else if (imagePath.startsWith('http')) {
          // 在线图片，需要下载
          try {
            const response = await fetch(imagePath);
            const arrayBuffer = await response.arrayBuffer();
            this.autoFeaturedImage = {
              fileName: 'featured-' + Date.now() + '.jpg',
              mimeType: 'image/jpeg',
              content: arrayBuffer,
              width: 1200
            };
          } catch (e) {
            console.log('[WpPublishModalV2] Failed to download online image:', e);
          }
        }
      }
    } catch (e) {
      console.log('[WpPublishModalV2] Error detecting first image:', e);
    }

    // 如果没有检测到图片，使用empty.png作为默认
    if (!this.autoFeaturedImage) {
      this.loadEmptyImage();
    }
  }

  private async loadEmptyImage(): Promise<void> {
    try {
      const emptyFile = this.app.vault.getAbstractFileByPath('empty.png');
      if (emptyFile instanceof TFile) {
        const content = await this.app.vault.readBinary(emptyFile);
        this.autoFeaturedImage = {
          fileName: 'empty.png',
          mimeType: 'image/png',
          content: content,
          width: 1200
        };
      }
    } catch (e) {
      console.log('[WpPublishModalV2] Could not load empty.png:', e);
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

  onOpen() {
    console.log('[WpPublishModalV2] onOpen called');
    const params: WordPressPostParams = {
      status: this.plugin.settings.defaultPostStatus,
      commentStatus: this.plugin.settings.defaultCommentStatus,
      postType: this.postTypes.selected,
      categories: this.categories.selected,
      tags: [],
      title: this.noteTitle || '',
      content: '',
      slug: ''
    };

    this.editableContent = this.articleContent;
    this.currentTab = 'settings';

    // 设置默认特色图片为自动检测的图片
    if (!this.featuredImage && this.autoFeaturedImage) {
      this.featuredImage = this.autoFeaturedImage;
    }

    // 自动生成 slug
    if (this.plugin.settings.autoGenerateSlug && params.title) {
      this.generateDefaultSlug(params.title);
    }

    this.display(params);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    if (this.dateInputMask) {
      this.dateInputMask.destroy();
    }
  }

  private display(params: WordPressPostParams): void {
    const { contentEl } = this;

    contentEl.empty();
    contentEl.addClass('wp-publish-modal-v2');

    this.createHeader(this.t('publishModal_title'));

    // 自适应窗口宽度
    this.updateModalWidth();

    // 创建标签切换
    this.renderTabBar(contentEl, params);

    const mainContainer = contentEl.createDiv('wp-publish-container');

    if (this.currentTab === 'settings') {
      this.renderSettingsTab(mainContainer, params);
    } else if (this.currentTab === 'preview') {
      this.renderPreviewTab(mainContainer, params);
    } else if (this.currentTab === 'advanced') {
      this.renderAdvancedTab(mainContainer, params);
    }

    // 底部操作栏（仅在设置和预览标签显示）
    if (this.currentTab !== 'advanced') {
      this.renderBottomBar(contentEl, params);
    }
  }

  private updateModalWidth(): void {
    const modalEl = this.modalEl;
    if (modalEl) {
      // 自适应窗口，最大800px，最小600px
      const viewportWidth = window.innerWidth;
      const targetWidth = Math.min(800, Math.max(600, viewportWidth * 0.8));
      modalEl.style.width = `${targetWidth}px`;
      modalEl.style.maxWidth = '90vw';
    }
  }

  private renderTabBar(container: HTMLElement, params: WordPressPostParams): void {
    const tabContainer = container.createDiv('wp-publish-tabs');

    const tabs = [
      { id: 'settings', label: '⚙️ 设置' },
      { id: 'preview', label: '👁️ 预览' },
      { id: 'advanced', label: '🔧 高级设置' }
    ];

    tabs.forEach(tab => {
      const tabEl = tabContainer.createDiv({
        cls: `wp-publish-tab-item ${this.currentTab === tab.id ? 'active' : ''}`
      });
      tabEl.createSpan({ text: tab.label });
      tabEl.onclick = () => {
        this.currentTab = tab.id as 'settings' | 'preview' | 'advanced';
        this.display(params);
      };
    });
  }

  // ==================== 设置标签 ====================
  private renderSettingsTab(container: HTMLElement, params: WordPressPostParams): void {
    // 上半部分：特色图片
    const topSection = container.createDiv('wp-settings-top');
    this.renderFeaturedImageSettings(topSection, params);

    // 下半部分：基本设置
    const bottomSection = container.createDiv('wp-settings-bottom');
    this.renderBasicSettings(bottomSection, params);
  }

  private renderFeaturedImageSettings(container: HTMLElement, params: WordPressPostParams): void {
    const card = container.createDiv('wp-settings-card');
    card.createEl('h3', { text: '特色图片', cls: 'wp-settings-section-title' });

    const previewContainer = card.createDiv('featured-image-preview-large');

    if (this.featuredImage) {
      const blob = new Blob([this.featuredImage.content], { type: this.featuredImage.mimeType });
      const url = URL.createObjectURL(blob);

      const img = previewContainer.createEl('img', {
        attr: { src: url },
        cls: 'featured-image-full'
      });
      img.style.maxWidth = '100%';
      img.style.maxHeight = '200px';
      img.style.objectFit = 'contain';

      const info = previewContainer.createDiv('featured-image-info');
      info.createSpan({ text: this.featuredImage.fileName });

      const removeBtn = previewContainer.createEl('button', {
        text: '移除',
        cls: 'featured-image-remove-btn'
      });
      removeBtn.onclick = () => {
        this.featuredImage = this.autoFeaturedImage;
        this.display(params);
      };
    } else {
      previewContainer.createEl('p', {
        text: '未选择特色图片',
        cls: 'featured-image-placeholder-text'
      });
    }

    // 四个按钮
    const btnRow = card.createDiv('featured-image-btn-row');

    // 本地按钮
    const localBtn = btnRow.createEl('button', { text: '📁 本地', cls: 'feature-btn' });
    localBtn.onclick = () => this.selectLocalImage(params);

    // 在线按钮 (Unsplash)
    const onlineBtn = btnRow.createEl('button', { text: '🌐 在线', cls: 'feature-btn' });
    if (!this.plugin.settings.unsplashAccessKey) {
      onlineBtn.addClass('disabled');
      onlineBtn.title = '请先在插件设置中配置 Unsplash API Key';
    } else {
      onlineBtn.onclick = () => this.selectUnsplashImage(params);
    }

    // AI生成按钮
    const aiBtn = btnRow.createEl('button', { text: '🎨 AI生成', cls: 'feature-btn' });
    if (!this.plugin.settings.aiConfig) {
      aiBtn.addClass('disabled');
      aiBtn.title = '请先在插件设置中配置 AI 服务';
    } else {
      aiBtn.onclick = () => this.generateAImage(params);
    }

    // 图库按钮
    const galleryBtn = btnRow.createEl('button', { text: '📚 图库', cls: 'feature-btn' });
    galleryBtn.onclick = () => this.selectVaultImage(params);
  }

  private selectLocalImage(params: WordPressPostParams): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          let arrayBuffer = await file.arrayBuffer();
          this.featuredImage = {
            fileName: file.name,
            mimeType: file.type,
            content: arrayBuffer,
            width: 1200
          };
          this.display(params);
          new Notice('图片已选择');
        } catch (error) {
          new Notice(`选择图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    };
    fileInput.click();
  }

  private selectUnsplashImage(params: WordPressPostParams): void {
    new Notice('请在插件设置中配置 Unsplash API Key');
  }

  private generateAImage(params: WordPressPostParams): void {
    if (!this.plugin.settings.aiConfig) {
      new Notice('请先在插件设置中配置 AI 服务');
      return;
    }
    new Notice('AI 生成功能需要从特色图片选择器中使用');
  }

  private selectVaultImage(params: WordPressPostParams): void {
    const imageFiles = this.app.vault.getFiles().filter(file =>
      file.extension.match(/^(jpg|jpeg|png|gif|webp)$/i)
    );

    if (imageFiles.length === 0) {
      new Notice('笔记库中没有图片文件');
      return;
    }

    // 简单处理：使用第一张图片
    const file = imageFiles[0];
    this.app.vault.readBinary(file).then(content => {
      this.featuredImage = {
        fileName: file.name,
        mimeType: this.getMimeType(file.extension),
        content: content,
        width: 1200
      };
      this.display(params);
      new Notice('已从图库选择: ' + file.name);
    }).catch(error => {
      new Notice(`读取图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    });
  }

  private renderBasicSettings(container: HTMLElement, params: WordPressPostParams): void {
    const card = container.createDiv('wp-settings-card');
    card.createEl('h3', { text: '基本设置', cls: 'wp-settings-section-title' });

    // 标题
    new Setting(card)
      .setName('标题')
      .setDesc('文章或页面的标题')
      .addText(text => {
        this.titleInput = text.inputEl;
        text.setPlaceholder('输入标题...')
          .setValue(params.title || '')
          .onChange(value => {
            params.title = value;
            if (this.plugin.settings.autoGenerateSlug && this.slugInput && !this.slugInput.value) {
              this.generateDefaultSlug(value);
            }
          });
        text.inputEl.style.width = '100%';
      });

    // Slug
    const slugSetting = new Setting(card)
      .setName('Slug（别名）')
      .setDesc('URL 中使用的别名');

    slugSetting.addText(text => {
      this.slugInput = text.inputEl;
      text.setPlaceholder('自动生成或手动输入...')
        .setValue(params.slug || '')
        .onChange(value => {
          params.slug = SlugGenerator.sanitizeSlug(value);
        });
      text.inputEl.style.width = '100%';
    });

    // AI翻译按钮 - 带API key检查
    if (this.plugin.settings.slugGenerationMode === 'ai-translate') {
      if (!this.plugin.settings.aiConfig) {
        slugSetting.addButton(btn => {
          btn.setButtonText('⚠️需配置AI')
            .setTooltip('请先在插件设置中配置 AI 服务')
            .setDisabled(true);
        });
      } else {
        slugSetting.addButton(btn => {
          btn.setButtonText('AI翻译')
            .setTooltip('使用 AI 将标题翻译成英文 Slug')
            .onClick(async () => {
              if (!params.title) {
                new Notice('请先输入标题');
                return;
              }

              btn.setDisabled(true);
              btn.setButtonText('翻译中...');

              try {
                const slug = await this.aiService!.translateToSlug(params.title);
                if (this.slugInput) {
                  this.slugInput.value = slug;
                  params.slug = slug;
                }
                new Notice('Slug已生成');
              } catch (error) {
                new Notice(`翻译失败: ${error instanceof Error ? error.message : '未知错误'}`);
              } finally {
                btn.setDisabled(false);
                btn.setButtonText('AI翻译');
              }
            });
        });
      }
    }

    // 分类（仅Post类型）
    if (params.postType === PostTypeConst.Post && this.categories.items.length > 0) {
      new Setting(card)
        .setName('分类')
        .setDesc('选择文章分类')
        .addDropdown((dropdown) => {
          this.categories.items.forEach(it => {
            dropdown.addOption(String(it.id), it.name);
          });
          dropdown
            .setValue(String(params.categories[0]))
            .onChange((value) => {
              params.categories = [toNumber(value)];
            });
        });
    }

    // 发布状态
    new Setting(card)
      .setName('状态')
      .setDesc('选择发布状态')
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, '草稿')
          .addOption(PostStatus.Publish, '发布')
          .addOption(PostStatus.Private, '私密')
          .addOption(PostStatus.Future, '定时发布')
          .setValue(params.status)
          .onChange((value) => {
            params.status = value as PostStatus;
            this.display(params);
          });
      });

    // 定时发布日期
    if (params.status === PostStatus.Future) {
      new Setting(card)
        .setName('发布时间')
        .setDesc('格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss')
        .addText(text => {
          text.setValue(format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
          this.setupDateMask(text.inputEl, params);
        });
    } else {
      delete params.datetime;
    }

    // 评论状态
    new Setting(card)
      .setName('评论')
      .setDesc('是否允许评论')
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, '开启')
          .addOption(CommentStatus.Closed, '关闭')
          .setValue(params.commentStatus)
          .onChange((value) => {
            params.commentStatus = value as CommentStatus;
          });
      });

    // 发布为Markdown选项
    new Setting(card)
      .setName('发布格式')
      .setDesc('选择发布内容格式')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('html', 'HTML (渲染后)')
          .addOption('markdown', 'Markdown (原始)')
          .setValue('html')
          .onChange((value) => {
            (params as SafeAny).contentFormat = value;
          });
      });
  }

  private setupDateMask(inputEl: HTMLInputElement, params: WordPressPostParams): void {
    const dateFormat = 'yyyy-MM-dd';
    const dateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
    const dateBlocks = {
      yyyy: { mask: IMask.MaskedRange, from: 1970, to: 9999 },
      MM: { mask: IMask.MaskedRange, from: 1, to: 12 },
      dd: { mask: IMask.MaskedRange, from: 1, to: 31 },
    };

    if (this.dateInputMask) {
      this.dateInputMask.destroy();
    }

    this.dateInputMask = IMask(inputEl, [
      {
        mask: Date,
        lazy: false,
        overwrite: true,
        pattern: dateTimeFormat,
        blocks: {
          ...dateBlocks,
          HH: { mask: IMask.MaskedRange, from: 0, to: 23 },
          mm: { mask: IMask.MaskedRange, from: 0, to: 59 },
          ss: { mask: IMask.MaskedRange, from: 0, to: 59 },
        },
        format: (date: SafeAny) => format(date, dateTimeFormat),
        parse: (str: string) => parse(str, dateTimeFormat, new Date())
      }
    ]);

    this.dateInputMask.on('accept', () => {
      if (this.dateInputMask && this.dateInputMask.masked.isComplete) {
        params.datetime = this.dateInputMask.typedValue;
      }
    });
  }

  // ==================== 预览标签 ====================
  private renderPreviewTab(container: HTMLElement, params: WordPressPostParams): void {
    const card = container.createDiv('wp-preview-card');
    card.createEl('h3', { text: '文章预览', cls: 'wp-preview-card-title' });

    if (this.isEditingPreview) {
      // 编辑模式
      const editorArea = card.createDiv('wp-preview-editor-area');
      const textarea = editorArea.createEl('textarea', {
        cls: 'wp-preview-textarea',
        attr: { placeholder: '在此编辑 Markdown 内容...' }
      });
      textarea.value = this.editableContent;
      textarea.style.width = '100%';
      textarea.style.minHeight = '300px';
      textarea.style.fontFamily = 'var(--font-mono)';
      textarea.oninput = () => {
        this.editableContent = textarea.value;
      };

      // 保存按钮
      const saveBtnContainer = card.createDiv('wp-preview-save-container');
      const saveBtn = saveBtnContainer.createEl('button', {
        text: '💾 保存',
        cls: 'mod-cta'
      });
      saveBtn.onclick = () => {
        this.isEditingPreview = false;
        this.display(params);
        new Notice('内容已保存');
      };
    } else {
      // 预览模式
      const previewContent = card.createDiv('wp-preview-rendered');
      const html = AppState.markdownParser.render(this.editableContent);
      previewContent.innerHTML = html;

      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .wp-preview-rendered h1, .wp-preview-rendered h2, .wp-preview-rendered h3 {
          margin-top: 1em; margin-bottom: 0.5em; font-weight: 600;
        }
        .wp-preview-rendered p { margin-bottom: 1em; line-height: 1.6; }
        .wp-preview-rendered img { max-width: 100%; height: auto; }
        .wp-preview-rendered code {
          background: var(--background-secondary); padding: 2px 4px; border-radius: 3px;
        }
        .wp-preview-rendered pre {
          background: var(--background-secondary); padding: 12px; border-radius: 5px; overflow-x: auto;
        }
        .wp-preview-rendered blockquote {
          border-left: 3px solid var(--text-accent); padding-left: 12px; color: var(--text-muted);
        }
      `;
      previewContent.appendChild(style);
    }
  }

  // ==================== 高级设置标签 ====================
  private renderAdvancedTab(container: HTMLElement, params: WordPressPostParams): void {
    const card = container.createDiv('wp-advanced-card');
    card.createEl('h3', { text: 'AI 提示词设置', cls: 'wp-advanced-card-title' });

    // 生图提示词
    new Setting(card)
      .setName('生图提示词')
      .setDesc('AI 生成特色图片时使用的提示词模板，使用 {title} 和 {content} 作为占位符')
      .addTextArea(text => {
        text.setPlaceholder(this.imageGenerationPrompt)
          .setValue(this.plugin.settings.imageGenerationPrompt || '')
          .onChange(value => {
            (this.plugin.settings as SafeAny).imageGenerationPrompt = value;
          });
        text.inputEl.rows = 3;
        text.inputEl.style.width = '100%';
      });

    // 摘要提示词
    new Setting(card)
      .setName('摘要提示词')
      .setDesc('AI 生成摘要时使用的提示词模板，使用 {content} 作为占位符')
      .addTextArea(text => {
        text.setPlaceholder(this.summaryPrompt)
          .setValue(this.plugin.settings.summaryPrompt || '')
          .onChange(value => {
            (this.plugin.settings as SafeAny).summaryPrompt = value;
          });
        text.inputEl.rows = 3;
        text.inputEl.style.width = '100%';
      });

    // 标签提示词
    new Setting(card)
      .setName('标签提示词')
      .setDesc('AI 生成标签时使用的提示词模板，使用 {content} 作为占位符')
      .addTextArea(text => {
        text.setPlaceholder(this.tagsPrompt)
          .setValue(this.plugin.settings.tagsPrompt || '')
          .onChange(value => {
            (this.plugin.settings as SafeAny).tagsPrompt = value;
          });
        text.inputEl.rows = 3;
        text.inputEl.style.width = '100%';
      });

    // 保存设置按钮
    new Setting(card)
      .addButton(btn => {
        btn.setButtonText('保存高级设置')
          .onClick(async () => {
            await this.plugin.saveSettings();
            new Notice('设置已保存');
          });
      });

    // 帮助信息
    const helpText = card.createDiv('wp-advanced-help');
    helpText.createEl('p', {
      text: '提示词模板中的占位符：',
      cls: 'help-title'
    });
    helpText.createEl('code', { text: '{title}' });
    helpText.createSpan({ text: ' - 文章标题' });
    helpText.createEl('br');
    helpText.createEl('code', { text: '{content}' });
    helpText.createSpan({ text: ' - 文章内容（摘要取前2000字）' });
  }

  // ==================== 底部操作栏 ====================
  private renderBottomBar(container: HTMLElement, params: WordPressPostParams): void {
    const bottomContainer = container.createDiv('wp-publish-bottom-bar');

    if (this.currentTab === 'preview') {
      // 预览页面底部按钮
      const editBtn = bottomContainer.createEl('button', {
        text: this.isEditingPreview ? '💾 保存' : '✏️ 编辑',
        cls: 'mod-cta'
      });
      editBtn.onclick = () => {
        if (this.isEditingPreview) {
          this.isEditingPreview = false;
          new Notice('内容已保存');
        } else {
          this.isEditingPreview = true;
        }
        this.display(params);
      };

      // 生成摘要按钮
      if (this.aiService) {
        const summaryBtn = bottomContainer.createEl('button', {
          text: '📝 生成摘要'
        });
        summaryBtn.onclick = () => this.generateSummary(params);
      }

      // 生成标签按钮
      if (this.aiService) {
        const tagsBtn = bottomContainer.createEl('button', {
          text: '🏷️ 生成标签'
        });
        tagsBtn.onclick = () => this.generateTags(params);
      }

      // 发布按钮
      const publishBtn = bottomContainer.createEl('button', {
        text: '🚀 发布',
        cls: 'mod-cta publish-btn'
      });
      publishBtn.onclick = () => this.doPublish(params);
    } else {
      // 设置页面 - 直接显示发布按钮
      const publishBtn = bottomContainer.createEl('button', {
        text: '🚀 发布',
        cls: 'mod-cta publish-btn-full'
      });
      publishBtn.onclick = () => this.doPublish(params);
    }
  }

  private async generateSummary(params: WordPressPostParams): Promise<void> {
    if (!this.aiService) {
      new Notice('请先在插件设置中配置 AI 服务');
      return;
    }

    if (!this.articleContent) {
      new Notice('文章内容为空');
      return;
    }

    try {
      const prompt = this.summaryPrompt.replace('{content}', this.articleContent.substring(0, 2000));
      const summary = await this.aiService.generateText(prompt);
      params.excerpt = summary;
      new Notice('摘要已生成');
      this.display(params);
    } catch (error) {
      new Notice(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async generateTags(params: WordPressPostParams): Promise<void> {
    if (!this.aiService) {
      new Notice('请先在插件设置中配置 AI 服务');
      return;
    }

    if (!this.articleContent) {
      new Notice('文章内容为空');
      return;
    }

    try {
      const prompt = this.tagsPrompt.replace('{content}', this.articleContent.substring(0, 2000));
      const tags = await this.aiService.generateText(prompt);
      params.tags = tags.split(',').map(t => t.trim()).filter(t => t).slice(0, 5);
      new Notice('标签已生成');
      this.display(params);
    } catch (error) {
      new Notice(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private doPublish(params: WordPressPostParams): void {
    const finalContent = this.editableContent;

    if (this.matterData.postType
      && this.matterData.postType !== PostTypeConst.Post
      && (this.matterData.tags || this.matterData.categories)
    ) {
      openConfirmModal({
        message: this.t('publishModal_wrongMatterDataForPage')
      }, this.plugin)
        .then(result => {
          if (result.code === ConfirmCode.Confirm) {
            this.onSubmit(params, fm => {
              delete fm.categories;
              delete fm.tags;
              fm.content = finalContent;
            }, this.featuredImage || undefined);
          }
        });
    } else {
      this.onSubmit(params, fm => {
        fm.content = finalContent;
      }, this.featuredImage || undefined);
    }
  }

  private generateDefaultSlug(title: string): void {
    if (!title || !this.slugInput) return;

    try {
      let slug: string;

      if (this.plugin.settings.slugGenerationMode === 'ai-translate' && this.aiService) {
        // AI模式需要API key
        this.aiService.translateToSlug(title).then(slug => {
          if (this.slugInput) {
            this.slugInput.value = slug;
          }
        }).catch(() => {
          // 失败时回退到拼音
          const fallbackSlug = SlugGenerator.autoGenerateSlug(title);
          if (this.slugInput) {
            this.slugInput.value = fallbackSlug;
          }
        });
      } else {
        // 拼音模式
        slug = SlugGenerator.autoGenerateSlug(title);
        if (this.slugInput) {
          this.slugInput.value = slug;
        }
      }
    } catch (error) {
      console.error('Slug generation failed:', error);
    }
  }
}