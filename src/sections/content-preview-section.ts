// Content preview section of the V3 publish modal: rendered Markdown preview,
// inline excerpt editor, tag editor (add / remove / drag-reorder). This is the
// ContentPreview + TagEditor responsibility extracted from WpPublishModalV2.

import type { WordPressPostParams } from '../wp-types';
import { getTagColor } from '../modal-helpers';
import { AppState } from '../app-state';
import { sanitizeHtml } from '../html-sanitizer';
import type { PublishModalContext } from './publish-modal-context';
import { createV3Section } from './v3-layout';

export class ContentPreviewSection {
  constructor(private readonly ctx: PublishModalContext) {}

  render(container: HTMLElement, params: WordPressPostParams): void {
    const ctx = this.ctx;
    let isContentEditing = false;
    let originalContent = '';

    const section = createV3Section(
      container,
      ctx.plugin.t('publishModal_previewContent') || 'Content Preview',
      []
    );
    section.dataset.contentSection = 'true';
    const body = section.createDiv('wp-v3-section-body');

    // ── 渲染文章内容主区域 ──
    const renderHtmlPreview = () => {
      body.empty();
      section.removeClass('is-editing');

      // 摘要行（上方）
      renderExcerptRow(body, params);
      // 标签行（摘要下方，内容上方）
      renderTagsRow(body, params);

      const previewDiv = body.createDiv('wp-v3-content-preview');
      const html = AppState.markdownParser.render(ctx.editableContent);
      previewDiv.innerHTML = sanitizeHtml(html);
    };

    // ── 文章内容编辑模式 ──
    const enterContentEdit = () => {
      if (isContentEditing) return;
      isContentEditing = true;
      originalContent = ctx.editableContent;
      section.addClass('is-editing');
      body.empty();

      const textarea = body.createEl('textarea', { cls: 'wp-v3-content-edit-area' });
      textarea.value = ctx.editableContent;
      textarea.placeholder = ctx.plugin.t('publishModal_previewEditPlaceholder') || 'Edit Markdown content...';

      const actions = body.createDiv('wp-v3-edit-actions');
      const cancelBtn = actions.createEl('button', { text: ctx.plugin.t('publishModal_cancel') || 'Cancel', cls: 'wp-v3-cancel-btn' });
      const saveBtn = actions.createEl('button', { text: ctx.plugin.t('publishModal_save') || 'Save', cls: 'wp-v3-save-btn' });

      saveBtn.onclick = () => {
        ctx.editableContent = textarea.value;
        isContentEditing = false;
        renderHtmlPreview();
      };
      cancelBtn.onclick = () => {
        ctx.editableContent = originalContent;
        isContentEditing = false;
        renderHtmlPreview();
      };
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); ctx.editableContent = originalContent; isContentEditing = false; renderHtmlPreview(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveBtn.click(); }
      });
      textarea.focus();
    };

    // 将 enterContentEdit 挂载到 section 元素，供 footer 按钮直接调用
    (section as unknown as { __enterContentEdit?: () => void }).__enterContentEdit = enterContentEdit;

    // ── 摘要嵌入行 ──
    const renderExcerptRow = (parent: HTMLElement, p: WordPressPostParams) => {
      const excerptWrap = parent.createDiv('wp-v3-excerpt-row');

      if (p.excerpt) {
        // 有摘要：左侧文本 + 右下角 ✏️
        const textEl = excerptWrap.createDiv('wp-v3-excerpt-inline-text');
        textEl.textContent = p.excerpt;

        const editBtn = excerptWrap.createEl('button', {
          text: '✏️',
          cls: 'wp-v3-inline-edit-btn',
          attr: { title: ctx.plugin.t('publishModal_editButton') || 'Edit excerpt' }
        });
        editBtn.onclick = () => openExcerptModal(p);
      } else {
        // 无摘要：占位框 + 两个按钮
        const placeholder = excerptWrap.createDiv('wp-v3-excerpt-placeholder');
        const btnRow = placeholder.createDiv('wp-v3-placeholder-btn-row');

        const aiBtn = btnRow.createEl('button', {
          text: ctx.plugin.t('publishModal_aiGenerateSummary'),
          cls: 'wp-v3-placeholder-btn'
        });
        aiBtn.onclick = () => ctx.generateSummary(p);

        const manualBtn = btnRow.createEl('button', {
          text: ctx.plugin.t('publishModal_manualInput'),
          cls: 'wp-v3-placeholder-btn'
        });
        manualBtn.onclick = () => openExcerptModal(p);
      }
    };

    // ── 摘要弹出编辑框 ──
    const openExcerptModal = (p: WordPressPostParams) => {
      // 在 body 内动态创建覆盖式编辑层
      const overlay = body.createDiv('wp-v3-excerpt-edit-overlay');
      const originalVal = p.excerpt || '';

      const textarea = overlay.createEl('textarea', {
        cls: 'wp-v3-textarea',
        attr: { placeholder: ctx.plugin.t('publishModal_excerptPlaceholder') || 'Enter excerpt...' }
      });
      textarea.value = originalVal;
      textarea.rows = 4;

      const actions = overlay.createDiv('wp-v3-edit-actions');
      const cancelBtn = actions.createEl('button', { text: ctx.plugin.t('publishModal_cancel') || 'Cancel', cls: 'wp-v3-cancel-btn' });
      const saveBtn = actions.createEl('button', { text: ctx.plugin.t('publishModal_save') || 'Save', cls: 'wp-v3-save-btn' });

      saveBtn.onclick = () => { p.excerpt = textarea.value; overlay.remove(); renderHtmlPreview(); };
      cancelBtn.onclick = () => { p.excerpt = originalVal; overlay.remove(); renderHtmlPreview(); };
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { p.excerpt = originalVal; overlay.remove(); renderHtmlPreview(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveBtn.click(); }
      });
      textarea.focus();
    };

    // ── 标签嵌入行 ──
    const renderTagsRow = (parent: HTMLElement, p: WordPressPostParams) => {
      // 同步 editableTags
      if ((p.tags || []).length > 0 && JSON.stringify(p.tags) !== JSON.stringify(ctx.editableTags)) {
        ctx.editableTags = p.tags ? [...p.tags] : [];
      }

      const tagsWrap = parent.createDiv('wp-v3-tags-row');
      let isTagEditing = false;

      const renderTagsContent = () => {
        tagsWrap.empty();

        if (ctx.editableTags.length > 0) {
          // 标签容器（flex-wrap，铅笔跟随最后一个标签）
          const tagsContainer = tagsWrap.createDiv('wp-v3-tags-container');

          if (isTagEditing) {
            // 编辑模式：标签可拖拽排序，显示×删除和抖动动画
            ctx.editableTags.forEach((tag, index) => {
              const tagEl = tagsContainer.createEl('span', { cls: 'wp-v3-tag-item is-shaking is-draggable' });
              tagEl.style.backgroundColor = getTagColor(tag);
              tagEl.dataset.tagIndex = String(index);
              tagEl.createSpan({ text: tag });

              const xBtn = tagEl.createEl('button', { cls: 'wp-v3-tag-delete-btn', text: '×' });
              xBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ctx.editableTags = ctx.editableTags.filter(t => t !== tag);
                p.tags = [...ctx.editableTags];
                renderTagsContent();
              });
            });

            // 编辑模式：+ 按钮直接放在 tagsContainer 内（跟标签并列）
            const addBtn = tagsContainer.createEl('button', { cls: 'wp-v3-tag-action-btn', text: '+', attr: { title: ctx.plugin.t('publishModal_addTag') } });
            addBtn.onclick = () => showInlineTagInput(tagsContainer, addBtn, p, renderTagsContent);

            // 启用拖拽排序
            this.enableTagDragSort(tagsContainer, p, renderTagsContent);

            // 完成按钮独立一行
            const actionsRow = tagsWrap.createDiv('wp-v3-tags-editing-actions');
            const doneBtn = actionsRow.createEl('button', {
              text: ctx.plugin.t('publishModal_save') || 'Done',
              cls: 'wp-v3-tag-action-btn wp-v3-tag-done-btn'
            });
            doneBtn.onclick = () => { isTagEditing = false; renderTagsContent(); };
          } else {
            // 普通模式：标签 + 铅笔按钮（跟随最后一个标签）
            ctx.editableTags.forEach(tag => {
              const tagEl = tagsContainer.createEl('span', { cls: 'wp-v3-tag-item' });
              tagEl.style.backgroundColor = getTagColor(tag);
              tagEl.createSpan({ text: tag });
            });

            // ✏️ 按钮直接放在 tagsContainer 内，跟随最后一个标签
            const editBtn = tagsContainer.createEl('button', {
              text: '✏️',
              cls: 'wp-v3-inline-edit-btn',
              attr: { title: ctx.plugin.t('publishModal_editButton') || 'Edit tags' }
            });
            editBtn.onclick = () => { isTagEditing = true; renderTagsContent(); };
          }
        } else {
          // 无标签：占位一行，左 + 按钮，右 AI 按钮
          const emptyRow = tagsWrap.createDiv('wp-v3-tags-empty-row');

          const addBtn = emptyRow.createEl('button', {
            text: ctx.plugin.t('publishModal_addTag'),
            cls: 'wp-v3-placeholder-btn'
          });
          addBtn.onclick = () => {
            isTagEditing = true;
            // 添加临时输入
            tagsWrap.empty();
            const tagsContainer = tagsWrap.createDiv('wp-v3-tags-container');
            const btnArea = tagsWrap.createDiv('wp-v3-tags-btn-area');
            const plusBtn = btnArea.createEl('button', { cls: 'wp-v3-tag-action-btn', text: '+', attr: { title: ctx.plugin.t('publishModal_addTag') } });
            plusBtn.onclick = () => showInlineTagInput(tagsContainer, plusBtn, p, renderTagsContent);
            showInlineTagInput(tagsContainer, plusBtn, p, renderTagsContent);
          };

          const aiBtn = emptyRow.createEl('button', {
            text: ctx.plugin.t('publishModal_aiGenerateTags'),
            cls: 'wp-v3-placeholder-btn'
          });
          aiBtn.onclick = () => ctx.generateTags(p);
        }
      };

      renderTagsContent();
    };

    // ── 内联标签输入 ──
    const showInlineTagInput = (
      parent: HTMLElement,
      triggerBtn: HTMLElement,
      p: WordPressPostParams,
      onDone: () => void
    ) => {
      triggerBtn.style.display = 'none';
      const input = parent.createEl('input', { cls: 'wp-v3-tag-input', type: 'text' });
      input.placeholder = ctx.plugin.t('publishModal_tagInputPlaceholder') || '输入标签...';
      input.focus();

      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const val = input.value.trim();
        if (val && !ctx.editableTags.includes(val)) {
          ctx.editableTags.push(val);
          p.tags = [...ctx.editableTags];
        }
        input.remove();
        triggerBtn.style.display = '';
        onDone();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { committed = true; input.remove(); triggerBtn.style.display = ''; }
      });
      input.addEventListener('blur', () => setTimeout(commit, 200));
    };

    renderHtmlPreview();
  }

  // ==================== 标签拖拽排序（桌面 + 移动端） ====================

  private enableTagDragSort(
    container: HTMLElement,
    p: WordPressPostParams,
    onReorder: () => void
  ): void {
    const ctx = this.ctx;
    let draggingEl: HTMLElement | null = null;
    let ghost: HTMLElement | null = null;
    let placeholder: HTMLElement | null = null;
    let originIndex = -1;

    const getTagEls = () => Array.from(container.querySelectorAll<HTMLElement>('.wp-v3-tag-item.is-draggable'));

    const getIndexOf = (el: HTMLElement) => getTagEls().indexOf(el);

    const createGhost = (source: HTMLElement, clientX: number, clientY: number) => {
      ghost = source.cloneNode(true) as HTMLElement;
      ghost.className = 'wp-v3-tag-item wp-v3-drag-ghost';
      ghost.style.backgroundColor = source.style.backgroundColor;
      ghost.style.left = `${clientX - source.offsetWidth / 2}px`;
      ghost.style.top = `${clientY - source.offsetHeight / 2}px`;
      document.body.appendChild(ghost);
    };

    const moveGhost = (clientX: number, clientY: number) => {
      if (!ghost || !draggingEl) return;
      ghost.style.left = `${clientX - draggingEl.offsetWidth / 2}px`;
      ghost.style.top = `${clientY - draggingEl.offsetHeight / 2}px`;
    };

    const getTargetEl = (clientX: number, clientY: number): HTMLElement | null => {
      const els = getTagEls().filter(el => el !== draggingEl);
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          return el;
        }
      }
      return null;
    };

    const applyReorder = (targetEl: HTMLElement) => {
      const fromIdx = getIndexOf(draggingEl!);
      const toIdx = getIndexOf(targetEl);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      const arr = [...ctx.editableTags];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      ctx.editableTags = arr;
      p.tags = [...arr];
    };

    const endDrag = (clientX: number, clientY: number) => {
      if (!draggingEl) return;
      const target = getTargetEl(clientX, clientY);
      if (target) applyReorder(target);
      draggingEl.classList.remove('is-dragging');
      if (ghost) { ghost.remove(); ghost = null; }
      if (placeholder) { placeholder.remove(); placeholder = null; }
      draggingEl = null;
      onReorder();
    };

    // ── 指针事件（统一处理鼠标和触摸） ──
    getTagEls().forEach(tagEl => {
      tagEl.addEventListener('pointerdown', (e: PointerEvent) => {
        if ((e.target as HTMLElement).classList.contains('wp-v3-tag-delete-btn')) return;
        e.preventDefault();
        draggingEl = tagEl;
        originIndex = getIndexOf(tagEl);
        tagEl.classList.add('is-dragging');
        tagEl.setPointerCapture(e.pointerId);
        createGhost(tagEl, e.clientX, e.clientY);
      });

      tagEl.addEventListener('pointermove', (e: PointerEvent) => {
        if (!draggingEl || draggingEl !== tagEl) return;
        e.preventDefault();
        moveGhost(e.clientX, e.clientY);
      });

      tagEl.addEventListener('pointerup', (e: PointerEvent) => {
        if (!draggingEl || draggingEl !== tagEl) return;
        endDrag(e.clientX, e.clientY);
      });

      tagEl.addEventListener('pointercancel', () => {
        if (draggingEl) {
          draggingEl.classList.remove('is-dragging');
          if (ghost) { ghost.remove(); ghost = null; }
          draggingEl = null;
          onReorder();
        }
      });
    });
  }
}
