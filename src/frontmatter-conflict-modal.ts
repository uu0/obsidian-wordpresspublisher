import { App, Modal, Setting } from 'obsidian';
import { FrontmatterConflict, ConflictResolution } from './frontmatter-manager';
import { SafeAny } from './utils';

/**
 * Modal for resolving frontmatter conflicts between local and remote data
 */
export class FrontmatterConflictModal extends Modal {
  private resolution: ConflictResolution = 'cancel';
  private conflicts: FrontmatterConflict[];
  private onResolve: (resolution: ConflictResolution) => void;

  constructor(
    app: App,
    conflicts: FrontmatterConflict[],
    onResolve: (resolution: ConflictResolution) => void
  ) {
    super(app);
    this.conflicts = conflicts;
    this.onResolve = onResolve;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('wp-conflict-modal');

    // Title
    contentEl.createEl('h2', { text: '⚠️ 检测到 Frontmatter 冲突' });

    // Description
    contentEl.createEl('p', {
      text: '本地文件的 frontmatter 数据与远程 WordPress 文章数据不一致。请选择如何处理：'
    });

    // Conflicts list
    const conflictsContainer = contentEl.createDiv('wp-conflicts-list');

    for (const conflict of this.conflicts) {
      const conflictItem = conflictsContainer.createDiv('wp-conflict-item');

      conflictItem.createEl('div', {
        cls: 'wp-conflict-field',
        text: `字段: ${this.getFieldLabel(conflict.field)}`
      });

      const valuesContainer = conflictItem.createDiv('wp-conflict-values');

      const localValue = valuesContainer.createDiv('wp-conflict-value');
      localValue.createEl('strong', { text: '本地值: ' });
      localValue.createEl('span', { text: this.formatValue(conflict.localValue) });

      const remoteValue = valuesContainer.createDiv('wp-conflict-value');
      remoteValue.createEl('strong', { text: '远程值: ' });
      remoteValue.createEl('span', { text: this.formatValue(conflict.remoteValue) });
    }

    // Resolution options
    const optionsContainer = contentEl.createDiv('wp-conflict-options');

    new Setting(optionsContainer)
      .setName('使用本地值')
      .setDesc('保留本地 frontmatter 的值，覆盖远程数据')
      .addButton(btn => btn
        .setButtonText('使用本地')
        .setCta()
        .onClick(() => {
          this.resolution = 'local';
          this.close();
        })
      );

    new Setting(optionsContainer)
      .setName('使用远程值')
      .setDesc('使用远程 WordPress 的值，更新本地 frontmatter')
      .addButton(btn => btn
        .setButtonText('使用远程')
        .onClick(() => {
          this.resolution = 'remote';
          this.close();
        })
      );

    new Setting(optionsContainer)
      .setName('取消发布')
      .setDesc('取消本次发布操作，手动解决冲突')
      .addButton(btn => btn
        .setButtonText('取消')
        .setWarning()
        .onClick(() => {
          this.resolution = 'cancel';
          this.close();
        })
      );
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.onResolve(this.resolution);
  }

  /**
   * Get human-readable field label
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      postId: '文章 ID',
      postType: '文章类型',
      categories: '分类',
      slug: 'URL 别名',
      tags: '标签'
    };
    return labels[field] || field;
  }

  /**
   * Format value for display
   */
  private formatValue(value: SafeAny): string {
    if (value === null || value === undefined || value === '') {
      return '(空)';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }
}

/**
 * Open conflict resolution modal and wait for user choice
 * @param app - Obsidian app instance
 * @param conflicts - Array of conflicts to resolve
 * @returns Promise resolving to user's choice
 */
export function openConflictModal(
  app: App,
  conflicts: FrontmatterConflict[]
): Promise<ConflictResolution> {
  return new Promise((resolve) => {
    new FrontmatterConflictModal(app, conflicts, resolve).open();
  });
}
