import { PluginSettingTab, Setting, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { TranslateKey } from './i18n';
import { WpProfileManageModal } from './wp-profile-manage-modal';
import { CommentConvertMode, MathJaxOutputType, TagFormat } from './plugin-settings';
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

    // 语言设置
    new Setting(containerEl)
      .setName(t('settings_language'))
      .setDesc(t('settings_languageDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('auto', t('settings_languageAuto'))
          .addOption('en', t('settings_languageEn'))
          .addOption('zh_cn', t('settings_languageZhCn'))
          .setValue(this.plugin.settings.lang)
          .onChange(async (value) => {
            this.plugin.settings.lang = value as 'auto' | 'en' | 'zh_cn';
            await this.plugin.saveSettings();
            // 重新渲染设置界面以应用新语言
            this.display();
          });
      });

    // AI 配置部分
    containerEl.createEl('h2', { text: t('settings_aiConfig') });

    // Slug 生成设置
    containerEl.createEl('h3', { text: t('settings_slugGeneration') });

    new Setting(containerEl)
      .setName(t('settings_autoGenerateSlug'))
      .setDesc(t('settings_autoGenerateSlugDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoGenerateSlug)
          .onChange(async (value) => {
            this.plugin.settings.autoGenerateSlug = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_slugGenerationMode'))
      .setDesc(t('settings_slugGenerationModeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('pinyin', t('settings_slugGenerationModePinyin'))
          .addOption('ai-translate', t('settings_slugGenerationModeAI'))
          .setValue(this.plugin.settings.slugGenerationMode)
          .onChange(async (value) => {
            const newMode = value as 'pinyin' | 'ai-translate';

            // 如果选择 AI 翻译模式，检查是否配置了文字处理 AI
            if (newMode === 'ai-translate') {
              if (!this.plugin.settings.aiConfig?.textAI?.apiKey) {
                new Notice(t('notice_slugModeRequiresAI'));
                dropdown.setValue('pinyin');
                this.plugin.settings.slugGenerationMode = 'pinyin';
                await this.plugin.saveSettings();
                return;
              }
            }

            this.plugin.settings.slugGenerationMode = newMode;
            await this.plugin.saveSettings();
          });
      });

    // 标签格式设置
    containerEl.createEl('h3', { text: t('settings_tagFormat') });

    new Setting(containerEl)
      .setName(t('settings_tagFormat'))
      .setDesc(t('settings_tagFormatDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(TagFormat.Inline, t('settings_tagFormatInline'))
          .addOption(TagFormat.YAML, t('settings_tagFormatYAML'))
          .setValue(this.plugin.settings.tagFormat ?? TagFormat.Inline)
          .onChange(async (value) => {
            this.plugin.settings.tagFormat = value as TagFormat;
            await this.plugin.saveSettings();
          });
      });

    // 图片裁剪设置
    containerEl.createEl('h3', { text: t('settings_imageCropSettings') });

    new Setting(containerEl)
      .setName(t('settings_imageCropRatio'))
      .setDesc(t('settings_imageCropRatioDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('16:9', '16:9')
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
      .setName(t('settings_imageCropWidth'))
      .setDesc(t('settings_imageCropWidthDesc'))
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
    containerEl.createEl('h3', { text: t('settings_unsplashConfig') });

    new Setting(containerEl)
      .setName(t('settings_unsplashAccessKey'))
      .setDesc(t('settings_unsplashAccessKeyDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_unsplashAccessKeyPlaceholder'))
          .setValue(this.plugin.settings.unsplashAccessKey || '')
          .onChange(async (value) => {
            this.plugin.settings.unsplashAccessKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
      })
      .addButton(btn => {
        btn.setButtonText(t('settings_validateButton'))
          .onClick(async () => {
            if (!this.plugin.settings.unsplashAccessKey) {
              new Notice(t('notice_unsplashKeyRequired'));
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText(t('settings_validating'));

            try {
              const service = new UnsplashService(this.plugin.settings.unsplashAccessKey);
              const isValid = await service.validateApiKey();

              if (isValid) {
                new Notice(t('notice_unsplashKeyValid'));
              } else {
                new Notice(t('notice_unsplashKeyInvalid'));
              }
            } catch (error) {
              new Notice(t('notice_validationFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
            } finally {
              btn.setDisabled(false);
              btn.setButtonText(t('settings_validateButton'));
            }
          });
      });

    // 文字处理 AI 配置
    containerEl.createEl('h3', { text: t('settings_textAIConfig') });

    const textAIConfig = this.plugin.settings.aiConfig?.textAI || {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo'
    };

    new Setting(containerEl)
      .setName(t('settings_aiProvider'))
      .setDesc(t('settings_aiProviderDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('openai', t('settings_aiProviderOpenAI'))
          .addOption('claude', t('settings_aiProviderClaude'))
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
      .setName(t('settings_aiBaseURL'))
      .setDesc(t('settings_aiBaseURLDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiBaseURLPlaceholder'))
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
      .setName(t('settings_aiAPIKey'))
      .setDesc(t('settings_aiAPIKeyDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiAPIKeyPlaceholder'))
          .setValue(textAIConfig.apiKey ?? '')
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
      .setName(t('settings_aiModel'))
      .setDesc(t('settings_aiModelDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiModelPlaceholder'))
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
        btn.setButtonText(t('settings_validateConnection'))
          .onClick(async () => {
            if (!this.plugin.settings.aiConfig?.textAI) {
              new Notice(t('notice_aiConfigRequired'));
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText(t('settings_validating'));

            try {
              const service = new AIService(this.plugin.settings.aiConfig);
              const result = await service.validateConfig(this.plugin.settings.aiConfig.textAI);

              if (result.valid) {
                new Notice(t('notice_aiConfigValid'));
              } else {
                new Notice(t('notice_aiConfigInvalid', { error: result.error || 'Unknown error' }));
              }
            } catch (error) {
              new Notice(t('notice_validationFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
            } finally {
              btn.setDisabled(false);
              btn.setButtonText(t('settings_validateConnection'));
            }
          });
      });

    // 图片生成 AI 配置
    containerEl.createEl('h3', { text: t('settings_imageAIConfig') });

    const imageAIConfig = this.plugin.settings.aiConfig?.imageAI || {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'dall-e-3'
    };

    new Setting(containerEl)
      .setName(t('settings_aiProvider'))
      .setDesc(t('settings_imageAIProviderDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('openai', t('settings_aiProviderOpenAIImage'))
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
      .setName(t('settings_aiBaseURL'))
      .setDesc(t('settings_aiBaseURLDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiBaseURLPlaceholder'))
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
      .setName(t('settings_aiAPIKey'))
      .setDesc(t('settings_aiAPIKeyDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiAPIKeyPlaceholder'))
          .setValue(imageAIConfig.apiKey ?? '')
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
      .setName(t('settings_aiModel'))
      .setDesc(t('settings_aiModelDesc'))
      .addText(text => {
        text
          .setPlaceholder(t('settings_aiImageModelPlaceholder'))
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
        btn.setButtonText(t('settings_validateConnection'))
          .onClick(async () => {
            if (!this.plugin.settings.aiConfig?.imageAI) {
              new Notice(t('notice_imageAIConfigRequired'));
              return;
            }

            btn.setDisabled(true);
            btn.setButtonText(t('settings_validating'));

            try {
              const service = new AIService(this.plugin.settings.aiConfig);
              const result = await service.validateConfig(this.plugin.settings.aiConfig.imageAI, true);

              if (result.valid) {
                new Notice(t('notice_imageAIConfigValid'));
              } else {
                new Notice(t('notice_imageAIConfigInvalid', { error: result.error || 'Unknown error' }));
              }
            } catch (error) {
              new Notice(t('notice_validationFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
            } finally {
              btn.setDisabled(false);
              btn.setButtonText(t('settings_validateConnection'));
            }
          });
      });
	}

}
