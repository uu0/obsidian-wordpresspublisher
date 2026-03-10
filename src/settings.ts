import { PluginSettingTab, Setting, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { TranslateKey } from './i18n';
import { WpProfileManageModal } from './wp-profile-manage-modal';
import { CommentConvertMode, MathJaxOutputType } from './plugin-settings';
import { WpProfile } from './wp-profile';
import { setupMarkdownParser } from './utils';
import { AppState } from './app-state';
import { AIService, AIConfig } from './ai-service';
import { UnsplashService } from './unsplash-service';


export class WordpressSettingTab extends PluginSettingTab {

	constructor(
    private readonly plugin: WordpressPlugin
  ) {
		super(plugin.app, plugin);
	}

	display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const getMathJaxOutputTypeDesc = (type: MathJaxOutputType): string => {
      switch (type) {
        case MathJaxOutputType.TeX:
          return t('settings_MathJaxOutputTypeTeXDesc');
        case MathJaxOutputType.SVG:
          return t('settings_MathJaxOutputTypeSVGDesc');
        default:
          return '';
      }
    }

    const getCommentConvertModeDesc = (type: CommentConvertMode): string => {
      switch (type) {
        case CommentConvertMode.Ignore:
          return t('settings_commentConvertModeIgnoreDesc');
        case CommentConvertMode.HTML:
          return t('settings_commentConvertModeHTMLDesc');
        default:
          return '';
      }
    }

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);
    let commentConvertModeDesc = getCommentConvertModeDesc(this.plugin.settings.commentConvertMode);

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton(button => button
        .setButtonText(t('settings_profilesModal'))
        .onClick(() => {
          new WpProfileManageModal(this.plugin).open();
        }));

    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();

            this.plugin.updateRibbonIcon();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(PostStatus.Publish, t('settings_defaultPostStatusPublish'))
          .addOption(PostStatus.Private, t('settings_defaultPostStatusPrivate'))
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultPostStatus = value as PostStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_defaultPostComment'))
      .setDesc(t('settings_defaultPostCommentDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, t('settings_defaultPostCommentOpen'))
          .addOption(CommentStatus.Closed, t('settings_defaultPostCommentClosed'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultCommentStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultCommentStatus = value as CommentStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_rememberLastSelectedCategories'))
      .setDesc(t('settings_rememberLastSelectedCategoriesDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rememberLastSelectedCategories)
          .onChange(async (value) => {
            this.plugin.settings.rememberLastSelectedCategories = value;
            if (!value) {
              this.plugin.settings.profiles.forEach((profile: WpProfile) => {
                if (!profile.lastSelectedCategories || profile.lastSelectedCategories.length === 0) {
                  profile.lastSelectedCategories = [ 1 ];
                }
              });
            }
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_showWordPressEditPageModal'))
      .setDesc(t('settings_showWordPressEditPageModalDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showWordPressEditConfirm)
          .onChange(async (value) => {
            this.plugin.settings.showWordPressEditConfirm = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_mathJaxOutputType'))
      .setDesc(t('settings_mathJaxOutputTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(MathJaxOutputType.TeX, t('settings_mathJaxOutputTypeTeX'))
          .addOption(MathJaxOutputType.SVG, t('settings_mathJaxOutputTypeSVG'))
          .setValue(this.plugin.settings.mathJaxOutputType)
          .onChange(async (value) => {
            this.plugin.settings.mathJaxOutputType = value as MathJaxOutputType;
            mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);
            await this.plugin.saveSettings();
            this.display();

            setupMarkdownParser(this.plugin.settings);
          });
      });
    containerEl.createEl('p', {
      text: mathJaxOutputTypeDesc,
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName(t('settings_commentConvertMode'))
      .setDesc(t('settings_commentConvertModeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentConvertMode.Ignore, t('settings_commentConvertModeIgnore'))
          .addOption(CommentConvertMode.HTML, t('settings_commentConvertModeHTML'))
          .setValue(this.plugin.settings.commentConvertMode)
          .onChange(async (value) => {
            this.plugin.settings.commentConvertMode = value as CommentConvertMode;
            commentConvertModeDesc = getCommentConvertModeDesc(this.plugin.settings.commentConvertMode);
            await this.plugin.saveSettings();
            this.display();

            setupMarkdownParser(this.plugin.settings);
          });
      });
    containerEl.createEl('p', {
      text: commentConvertModeDesc,
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName(t('settings_enableHtml'))
      .setDesc(t('settings_enableHtmlDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableHtml)
          .onChange(async (value) => {
            this.plugin.settings.enableHtml = value;
            await this.plugin.saveSettings();

            AppState.markdownParser.set({
              html: this.plugin.settings.enableHtml
            });
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_replaceMediaLinks'))
      .setDesc(t('settings_replaceMediaLinksDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.replaceMediaLinks)
          .onChange(async (value) => {
            this.plugin.settings.replaceMediaLinks = value;
            await this.plugin.saveSettings();
          }),
      );

    // AI 配置部分
    containerEl.createEl('h2', { text: 'AI 配置' });

    // Slug 生成设置
    new Setting(containerEl)
      .setName('自动生成 Slug')
      .setDesc('发布时自动从标题生成 URL 别名')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoGenerateSlug)
          .onChange(async (value) => {
            this.plugin.settings.autoGenerateSlug = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Slug 生成模式')
      .setDesc('选择如何生成 Slug：拼音转换或 AI 翻译')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('pinyin', '拼音转换（中文→拼音）')
          .addOption('ai-translate', 'AI 翻译（中文→英文）')
          .setValue(this.plugin.settings.slugGenerationMode)
          .onChange(async (value) => {
            this.plugin.settings.slugGenerationMode = value as 'pinyin' | 'ai-translate';
            await this.plugin.saveSettings();
          });
      });

    // 图片裁剪设置
    containerEl.createEl('h3', { text: '图片裁剪设置' });

    new Setting(containerEl)
      .setName('裁剪比例')
      .setDesc('特色图片的裁剪比例')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('16:9', '16:9（推荐）')
          .addOption('4:3', '4:3')
          .addOption('1:1', '1:1')
          .addOption('3:2', '3:2')
          .addOption('21:9', '21:9')
          .setValue(this.plugin.settings.imageCropRatio || '16:9')
          .onChange(async (value) => {
            this.plugin.settings.imageCropRatio = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('图片宽度')
      .setDesc('特色图片和 AI 生图的宽度（像素）')
      .addText(text => {
        text
          .setPlaceholder('1200')
          .setValue(String(this.plugin.settings.imageCropWidth || 1200))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.imageCropWidth = num;
              await this.plugin.saveSettings();
            }
          });
      });

    // Unsplash 配置
    containerEl.createEl('h3', { text: 'Unsplash 配置' });

    new Setting(containerEl)
      .setName('Unsplash Access Key')
      .setDesc('用于搜索和下载 Unsplash 图片')
      .addText(text => {
        text
          .setPlaceholder('输入 Unsplash Access Key')
          .setValue(this.plugin.settings.unsplashAccessKey || '')
          .onChange(async (value) => {
            this.plugin.settings.unsplashAccessKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      })
      .addButton(btn => {
        btn.setButtonText('验证')
          .onClick(async () => {
            if (!this.plugin.settings.unsplashAccessKey) {
              new Notice('请先输入 Access Key');
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText('验证中...');

            try {
              const service = new UnsplashService(this.plugin.settings.unsplashAccessKey);
              const isValid = await service.validateApiKey();

              if (isValid) {
                new Notice('✓ Unsplash API Key 验证成功');
              } else {
                new Notice('✗ Unsplash API Key 验证失败');
              }
            } catch (error) {
              new Notice(`验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
              btn.setDisabled(false);
              btn.setButtonText('验证');
            }
          });
      });

    // 文字处理 AI 配置
    containerEl.createEl('h3', { text: '文字处理 AI' });

    const textAIConfig = this.plugin.settings.aiConfig?.textAI || {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo'
    };

    new Setting(containerEl)
      .setName('AI 提供商')
      .setDesc('选择 AI 服务提供商')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('openai', 'OpenAI')
          .addOption('claude', 'Claude (Anthropic)')
          .setValue(textAIConfig.provider)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: textAIConfig
              };
            }
            this.plugin.settings.aiConfig.textAI.provider = value as 'openai' | 'claude';
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName('Base URL')
      .setDesc('API 基础地址')
      .addText(text => {
        text
          .setPlaceholder('https://api.openai.com/v1')
          .setValue(textAIConfig.baseURL)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: textAIConfig
              };
            }
            this.plugin.settings.aiConfig.textAI.baseURL = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
      });

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('AI 服务的 API 密钥')
      .addText(text => {
        text
          .setPlaceholder('sk-...')
          .setValue(textAIConfig.apiKey)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: textAIConfig
              };
            }
            this.plugin.settings.aiConfig.textAI.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.style.width = '100%';
      });

    new Setting(containerEl)
      .setName('模型名称')
      .setDesc('使用的模型名称')
      .addText(text => {
        text
          .setPlaceholder('gpt-3.5-turbo')
          .setValue(textAIConfig.model)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: textAIConfig
              };
            }
            this.plugin.settings.aiConfig.textAI.model = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton(btn => {
        btn.setButtonText('验证连接')
          .onClick(async () => {
            if (!this.plugin.settings.aiConfig?.textAI) {
              new Notice('请先配置 AI 服务');
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText('验证中...');

            try {
              const service = new AIService(this.plugin.settings.aiConfig);
              const result = await service.validateConfig(this.plugin.settings.aiConfig.textAI);

              if (result.valid) {
                new Notice('✓ AI 配置验证成功');
              } else {
                new Notice(`✗ AI 配置验证失败: ${result.error}`);
              }
            } catch (error) {
              new Notice(`验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
              btn.setDisabled(false);
              btn.setButtonText('验证连接');
            }
          });
      });

    // 图片生成 AI 配置
    containerEl.createEl('h3', { text: '图片生成 AI' });

    const imageAIConfig = this.plugin.settings.aiConfig?.imageAI || {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'dall-e-3'
    };

    new Setting(containerEl)
      .setName('AI 提供商')
      .setDesc('选择图片生成 AI 服务提供商')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('openai', 'OpenAI (DALL-E)')
          .setValue(imageAIConfig.provider)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: imageAIConfig
              };
            }
            this.plugin.settings.aiConfig.imageAI.provider = value as 'openai' | 'claude';
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName('Base URL')
      .setDesc('API 基础地址')
      .addText(text => {
        text
          .setPlaceholder('https://api.openai.com/v1')
          .setValue(imageAIConfig.baseURL)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: imageAIConfig
              };
            }
            this.plugin.settings.aiConfig.imageAI.baseURL = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
      });

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('图片生成 AI 的 API 密钥')
      .addText(text => {
        text
          .setPlaceholder('sk-...')
          .setValue(imageAIConfig.apiKey)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: imageAIConfig
              };
            }
            this.plugin.settings.aiConfig.imageAI.apiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.style.width = '100%';
      });

    new Setting(containerEl)
      .setName('模型名称')
      .setDesc('使用的图片生成模型')
      .addText(text => {
        text
          .setPlaceholder('dall-e-3')
          .setValue(imageAIConfig.model)
          .onChange(async (value) => {
            if (!this.plugin.settings.aiConfig) {
              this.plugin.settings.aiConfig = {
                textAI: textAIConfig,
                imageAI: imageAIConfig
              };
            }
            this.plugin.settings.aiConfig.imageAI.model = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton(btn => {
        btn.setButtonText('验证连接')
          .onClick(async () => {
            if (!this.plugin.settings.aiConfig?.imageAI) {
              new Notice('请先配置图片生成 AI');
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText('验证中...');

            try {
              const service = new AIService(this.plugin.settings.aiConfig);
              const result = await service.validateConfig(this.plugin.settings.aiConfig.imageAI, true);

              if (result.valid) {
                new Notice('✓ 图片生成 AI 配置验证成功');
              } else {
                new Notice(`✗ 图片生成 AI 配置验证失败: ${result.error}`);
              }
            } catch (error) {
              new Notice(`验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
            } finally {
              btn.setDisabled(false);
              btn.setButtonText('验证连接');
            }
          });
      });
	}

}
