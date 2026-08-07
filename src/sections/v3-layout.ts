// Shared rendering helpers for the V3 publish-modal layout.
// Extracted from WpPublishModalV2 so the section components can reuse them
// without depending on the modal class internals.

import type { TranslateKey } from '../i18n';
import type { PublishModalContext } from './publish-modal-context';

export interface V3SectionAction {
  emoji: string;
  label: string;
  onClick: () => void;
}

/** Create a titled section container with an (optionally dynamic) actions slot. */
export function createV3Section(
  container: HTMLElement,
  title: string,
  actions?: V3SectionAction[]
): HTMLElement {
  const section = container.createDiv('wp-v3-section');

  const header = section.createDiv('wp-v3-section-header');
  header.createSpan({ text: title, cls: 'wp-v3-section-title' });

  // 始终创建 actions 容器，以便后续 updateHeaderActions 动态写入按钮
  const actionsEl = header.createDiv('wp-v3-section-actions');
  if (actions && actions.length > 0) {
    actions.forEach(action => {
      const btn = actionsEl.createEl('button', {
        text: action.emoji,
        cls: 'wp-v3-icon-btn',
        attr: { 'aria-label': action.label, title: action.label }
      });
      btn.addEventListener('click', action.onClick);
    });
  }

  return section;
}

/** Render a single settings field: label + optional hint + caller-supplied control. */
export function renderV3Field(
  ctx: PublishModalContext,
  container: HTMLElement,
  label: string,
  hintKey: TranslateKey | string,
  renderControl: (fieldEl: HTMLElement) => void
): void {
  const field = container.createDiv('wp-v3-field');
  const labelRow = field.createDiv('wp-v3-field-label-row');
  labelRow.createSpan({ text: label, cls: 'wp-v3-field-label' });
  if (hintKey) {
    addV3HintBtn(labelRow, ctx.plugin.t(hintKey as TranslateKey) || hintKey);
  }
  renderControl(field);
}

/** Add a ⓘ hover tooltip icon (display only, not a button). */
export function addV3HintBtn(container: HTMLElement, hintText: string): void {
  const icon = container.createEl('span', { cls: 'wp-v3-hint-icon', text: 'ⓘ' });
  const tooltip = icon.createDiv('wp-v3-tooltip');
  tooltip.textContent = hintText;
}
