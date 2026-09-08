import { App, Modal, Notice, Setting } from 'obsidian';

/** Explicit reconciliation: never infer that a timed-out POST failed. */
export function resolveUncertainUpload(app: App, label: string, resolveId: (id: string | null) => Promise<void>): Promise<void> {
  return new Promise(resolve => {
    class RecoveryModal extends Modal {
      private remoteId = '';
      onOpen() {
        this.contentEl.createEl('h2', { text: 'Resolve uncertain publish / 核对发布结果' });
        this.contentEl.createEl('p', { text: label });
        this.contentEl.createEl('p', { text: 'Check WordPress first. Enter the existing post/media ID, or confirm the request did not succeed. / 请先核对 WordPress，填写已生成的文章或媒体 ID，或确认该请求未成功。' });
        new Setting(this.contentEl).setName('Existing ID / 已存在的 ID').addText(input => input.onChange(value => { this.remoteId = value.trim(); }));
        const act = async (id: string | null) => {
          try { await resolveId(id); this.close(); } catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
        };
        new Setting(this.contentEl)
          .addButton(button => button.setButtonText('Use ID / 使用 ID').onClick(() => {
            if (!/^[1-9]\d*$/.test(this.remoteId)) { new Notice('Enter a valid numeric ID.'); return; }
            void act(this.remoteId);
          }))
          .addButton(button => button.setButtonText('Confirmed absent / 已确认未生成').onClick(() => { void act(null); }));
      }
      onClose() { this.contentEl.empty(); resolve(); }
    }
    new RecoveryModal(app).open();
  });
}
