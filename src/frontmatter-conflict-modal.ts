import { App, Modal, Setting } from 'obsidian';
import { FrontmatterConflict, ConflictResolution } from './frontmatter-manager';
import { SafeAny } from './utils';
import type WordpressPlugin from './main';

/**
 * Modal for resolving frontmatter conflicts between local and remote data
 */
export class FrontmatterConflictModal extends Modal {
  private resolution: ConflictResolution = 'cancel';
  private conflicts: FrontmatterConflict[];
  private onResolve: (resolution: ConflictResolution) => void;
  private plugin: WordpressPlugin;

  constructor(
    app: App,
    plugin: WordpressPlugin,
    conflicts: FrontmatterConflict[],
    onResolve: (resolution: ConflictResolution) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.conflicts = conflicts;
    this.onResolve = onResolve;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('wp-conflict-modal');

    // Title
    contentEl.createEl('h2', { text: this.plugin.t('conflictModal_title') });

    // Description
    contentEl.createEl('p', {
      text: this.plugin.t('conflictModal_description')
    });

    // Conflicts list
    const conflictsContainer = contentEl.createDiv('wp-conflicts-list');

    for (const conflict of this.conflicts) {
      const conflictItem = conflictsContainer.createDiv('wp-conflict-item');

      conflictItem.createEl('div', {
        cls: 'wp-conflict-field',
        text: this.plugin.t('conflictModal_field', { field: this.getFieldLabel(conflict.field) })
      });

      const valuesContainer = conflictItem.createDiv('wp-conflict-values');

      const localValue = valuesContainer.createDiv('wp-conflict-value');
      localValue.createEl('strong', { text: this.plugin.t('conflictModal_localValue') });
      localValue.createEl('span', { text: this.formatValue(conflict.localValue) });

      const remoteValue = valuesContainer.createDiv('wp-conflict-value');
      remoteValue.createEl('strong', { text: this.plugin.t('conflictModal_remoteValue') });
      remoteValue.createEl('span', { text: this.formatValue(conflict.remoteValue) });
    }

    // Resolution options
    const optionsContainer = contentEl.createDiv('wp-conflict-options');

    new Setting(optionsContainer)
      .setName(this.plugin.t('conflictModal_useLocalName'))
      .setDesc(this.plugin.t('conflictModal_useLocalDesc'))
      .addButton(btn => btn
        .setButtonText(this.plugin.t('conflictModal_useLocalButton'))
        .setCta()
        .onClick(() => {
          this.resolution = 'local';
          this.close();
        })
      );

    new Setting(optionsContainer)
      .setName(this.plugin.t('conflictModal_useRemoteName'))
      .setDesc(this.plugin.t('conflictModal_useRemoteDesc'))
      .addButton(btn => btn
        .setButtonText(this.plugin.t('conflictModal_useRemoteButton'))
        .onClick(() => {
          this.resolution = 'remote';
          this.close();
        })
      );

    new Setting(optionsContainer)
      .setName(this.plugin.t('conflictModal_cancelName'))
      .setDesc(this.plugin.t('conflictModal_cancelDesc'))
      .addButton(btn => btn
        .setButtonText(this.plugin.t('conflictModal_cancelButton'))
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
      postId: this.plugin.t('conflictModal_fieldPostId'),
      postType: this.plugin.t('conflictModal_fieldPostType'),
      categories: this.plugin.t('conflictModal_fieldCategories'),
      slug: this.plugin.t('conflictModal_fieldSlug'),
      tags: this.plugin.t('conflictModal_fieldTags'),
      featuredImageId: this.plugin.t('conflictModal_fieldFeaturedImageId')
    };
    return labels[field] || field;
  }

  /**
   * Format value for display
   */
  private formatValue(value: SafeAny): string {
    if (value === null || value === undefined || value === '') {
      return this.plugin.t('conflictModal_emptyValue');
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
 * @param plugin - Plugin instance for i18n
 * @param conflicts - Array of conflicts to resolve
 * @returns Promise resolving to user's choice
 */
export function openConflictModal(
  app: App,
  plugin: WordpressPlugin,
  conflicts: FrontmatterConflict[]
): Promise<ConflictResolution> {
  return new Promise((resolve) => {
    new FrontmatterConflictModal(app, plugin, conflicts, resolve).open();
  });
}
