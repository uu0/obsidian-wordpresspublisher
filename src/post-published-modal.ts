import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';


export function openPostPublishedModal(
  plugin: WordpressPlugin,
): Promise<boolean> {
  return new Promise((resolve, _reject) => {
    const modal = new PostPublishedModal(plugin, (modal) => {
      resolve(true);
      modal.close();
    });
    const close = modal.onClose.bind(modal);
    modal.onClose = () => { close(); resolve(false); };
    modal.open();
  });
}

/**
 * WordPress post published modal.
 */
class PostPublishedModal extends Modal {

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly onOpenClicked: (modal: Modal) => void
  ) {
    super(plugin.app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('publishedModal_title') });

    new Setting(contentEl)
      .setName(t('publishedModal_confirmEditInWP'));
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('publishedModal_cancel'))
        .onClick(() => {
          this.close();
        })
      )
      .addButton(button => button
        .setButtonText(t('publishedModal_open'))
        .setCta()
        .onClick(() => {
          this.onOpenClicked(this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
