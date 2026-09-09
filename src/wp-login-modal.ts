import { PublishCancelledError } from './publish-safety';
import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { WordPressAuthParams, WordPressClientResult, WordPressClientReturnCode } from './wp-types';
import { showError } from './utils';
import { AbstractModal } from './abstract-modal';
import { ApiType } from './plugin-settings';

export function openLoginModal(
  plugin: WordpressPlugin,
  profile: WpProfile,
  validateUser: (auth: WordPressAuthParams) => Promise<WordPressClientResult<boolean>>,
): Promise<{ auth: WordPressAuthParams, loginModal: Modal }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const modal = new WpLoginModal(plugin, profile, async (auth, loginModal) => {
      try {
        const result = await validateUser(auth);
        if (result.code === WordPressClientReturnCode.OK) {
          settled = true;
          resolve({ auth, loginModal });
          modal.close();
        } else {
          showError(result.error?.message ?? plugin.i18n.t('error_invalidUser'));
        }
      } catch (error) {
        showError(error);
      }
    });
    const close = modal.onClose.bind(modal);
    modal.onClose = () => {
      close();
      if (!settled) reject(new PublishCancelledError());
    };
    modal.open();
  });
}

/**
 * WordPress login modal with username and password inputs.
 */
export class WpLoginModal extends AbstractModal {

  private isValidating = false;

  constructor(
    readonly plugin: WordpressPlugin,
    private readonly profile: WpProfile,
    private readonly onSubmit: (auth: WordPressAuthParams, modal: Modal) => Promise<void>
  ) {
    super(plugin);
  }

  onOpen() {
    const { contentEl } = this;

    this.createHeader(this.t('loginModal_title'));

    let username = this.profile.username;
    let password = this.profile.password;
    new Setting(contentEl)
      .setName(this.t('loginModal_username'))
      .setDesc(this.t('loginModal_usernameDesc', { url: this.profile.endpoint }))
      .addText(text => {
        text
          .setValue(this.profile.username ?? '')
          .onChange(async (value) => {
            username = value;
            if (this.profile.saveUsername) {
              this.profile.username = value;
              await this.plugin.saveSettings();
            }
          });
        if (!this.profile.saveUsername) {
          setTimeout(() => {
            text.inputEl.focus();
          });
        }
      });
    new Setting(contentEl)
      .setName(this.profile.apiType === ApiType.RestApi_ApplicationPasswords
        ? this.t('loginModal_appPassword')
        : this.t('loginModal_password'))
      .setDesc(this.profile.apiType === ApiType.RestApi_ApplicationPasswords
        ? this.t('loginModal_appPasswordDesc', { url: this.profile.endpoint })
        : this.t('loginModal_passwordDesc', { url: this.profile.endpoint }))
      .addText(text => {
        text
          .then(text => { text.inputEl.type = 'password'; })
          .setValue(this.profile.password ?? '')
          .onChange(async (value) => {
            password = value;
            if (this.profile.savePassword) {
              this.profile.password = value;
              await this.plugin.saveSettings();
            }
          });
        if (this.profile.saveUsername) {
          setTimeout(() => {
            text.inputEl.focus();
          });
        }
      });
    // new Setting(contentEl)
    //   .setName(this.t('loginModal_rememberUsername'))
    //   .setDesc(this.t('loginModal_rememberUsernameDesc'))
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.profile.saveUsername)
    //       .onChange(async (value) => {
    //         this.profile.saveUsername = value;
    //         if (!this.profile.saveUsername) {
    //           delete this.profile.username;
    //         } else {
    //           this.profile.username = username;
    //         }
    //         await this.plugin.saveSettings();
    //       }),
    //   );
    // new Setting(contentEl)
    //   .setName(this.t('loginModal_rememberPassword'))
    //   .setDesc(this.t('loginModal_rememberPasswordDesc'))
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.profile.savePassword)
    //       .onChange(async (value) => {
    //         this.profile.savePassword = value;
    //         if (!this.profile.savePassword) {
    //           delete this.profile.password;
    //         } else {
    //           this.profile.password = password;
    //         }
    //         await this.plugin.saveSettings();
    //       }),
    //   );
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(this.t('loginModal_loginButtonText'))
        .setCta()
        .onClick(async () => {
          if (this.isValidating) return;
          if (!username) {
            showError(this.t('error_noUsername'));
          } else if (!password) {
            showError(this.t('error_noPassword'));
          }
          if (username && password) {
            this.isValidating = true;
            button.setDisabled(true).setButtonText(this.t('loginModal_loggingIn'));
            try {
              await this.onSubmit({ username: username.trim(), password }, this);
            } finally {
              this.isValidating = false;
              button.setDisabled(false).setButtonText(this.t('loginModal_loginButtonText'));
            }
          }
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
