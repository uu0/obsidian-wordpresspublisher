import { App, Modal } from 'obsidian';
import { ApiType } from './plugin-settings';
import { getApiCapabilities, getApiLimitations, getApiRecommendation } from './api-capability';
import { I18n } from './i18n';
import WordpressPlugin from './main';

/**
 * Read-only modal describing the capabilities, limitations and
 * recommendation for the selected WordPress API type.
 *
 * Built with Obsidian's Modal base class (proper backdrop + ESC-to-close,
 * no leaked DOM) and styled via CSS classes in styles.css rather than inline
 * styles. All chrome strings come from i18n.
 */
class ApiInfoModal extends Modal {
  constructor(
    app: App,
    private readonly apiType: ApiType,
    private readonly i18n: I18n
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('wp-api-info-modal');

    // Header with title + close button.
    const header = contentEl.createDiv('wp-api-info-modal-header');
    header.createEl('h3', { text: this.i18n.t('apiInfo_title') });
    const closeButton = header.createEl('button', {
      cls: 'wp-api-info-modal-close',
      text: '×'
    });
    closeButton.addEventListener('click', () => this.close());

    // Body.
    const body = contentEl.createDiv('wp-api-info-modal-body');
    this.renderCapabilities(body);
    this.renderSection(body, 'Limitations', this.renderLimitations);
    this.renderRecommendation(body);
    this.renderSecurityNote(body);

    // Footer.
    const footer = contentEl.createDiv('wp-api-info-footer');
    const close = footer.createEl('button', {
      cls: 'mod-cta',
      text: this.i18n.t('apiInfo_close')
    });
    close.addEventListener('click', () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderCapabilities(container: HTMLElement): void {
    const capabilities = getApiCapabilities(this.apiType);
    container.createEl('h4', { text: 'Supported Features' });
    const list = container.createEl('ul', { cls: 'wp-api-info-features' });
    const rows: Array<[boolean, string]> = [
      [capabilities.supportsCategoryCreation, 'Category Creation'],
      [capabilities.supportsTagCreation, 'Tag Creation'],
      [capabilities.supportsRichCategoryProperties, 'Rich Category Properties'],
      [capabilities.supportsBatchOperations, 'Batch Operations'],
      [capabilities.supportsCustomPostTypes, 'Custom Post Types']
    ];
    for (const [supported, label] of rows) {
      list.createEl('li', { text: `${supported ? '✅' : '❌'} ${label}` });
    }
  }

  private renderSection(
    container: HTMLElement,
    title: string,
    render: (container: HTMLElement) => void
  ): void {
    container.createEl('h4', { text: title });
    render(container);
  }

  private renderLimitations(container: HTMLElement): void {
    const limitations = getApiLimitations(this.apiType);
    if (limitations.length === 0) {
      container.createEl('p', { text: '—' });
      return;
    }
    const list = container.createEl('ul', { cls: 'wp-api-info-limitations' });
    for (const limitation of limitations) {
      list.createEl('li', { text: limitation });
    }
  }

  private renderRecommendation(container: HTMLElement): void {
    const recommendation = getApiRecommendation(this.apiType);
    container.createEl('h4', { text: 'Recommendation' });
    container.createEl('p', { text: recommendation });
  }

  private renderSecurityNote(container: HTMLElement): void {
    container.createEl('h4', { text: 'Security Note' });
    container.createEl('p', {
      text:
        'XML-RPC uses basic authentication which may be less secure than REST ' +
        'API with Application Passwords. Consider migrating to REST API for ' +
        'better security and feature support.'
    });
  }
}

export function showApiInfoModal(plugin: WordpressPlugin, apiType: ApiType): void {
  new ApiInfoModal(plugin.app, apiType, plugin.i18n).open();
}
