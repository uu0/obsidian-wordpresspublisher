/**
 * @jest-environment jsdom
 */
// app-state pulls in markdown-it + mathjax + juice/cheerio (ESM that ts-jest
// can't transform). We don't need a real Markdown renderer here, so mock it
// with a minimal passthrough.
jest.mock('../../src/app-state', () => ({
  AppState: {
    markdownParser: { render: (md: string) => `<p>${md}</p>` },
  },
}));

import { installObsidianDomPolyfill } from '../helpers/obsidian-dom';
import { createMockContext } from '../helpers/mock-context';
import { ContentPreviewSection } from '../../src/sections/content-preview-section';
import type { WordPressPostParams } from '../../src/wp-types';

installObsidianDomPolyfill();

function baseParams(overrides: Partial<WordPressPostParams> = {}): WordPressPostParams {
  return {
    status: 'draft' as any,
    commentStatus: 'open' as any,
    categories: [],
    tags: [],
    title: 'Test Post',
    ...overrides,
  } as WordPressPostParams;
}

describe('ContentPreviewSection', () => {
  it('renders the Markdown content preview (sanitized) for editableContent', () => {
    const ctx = createMockContext({ editableContent: '# Hello\n\nsome **bold**' });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, baseParams());

    const preview = container.querySelector('.wp-v3-content-preview');
    expect(preview).toBeTruthy();
    expect(preview!.innerHTML).toContain('Hello');
    expect(preview!.innerHTML).toContain('bold');
  });

  it('shows excerpt placeholder buttons when no excerpt, and AI generate is wired', () => {
    const ctx = createMockContext();
    const params = baseParams({ excerpt: undefined });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, params);

    const placeholderBtns = Array.from(container.querySelectorAll('.wp-v3-placeholder-btn'));
    expect(placeholderBtns.length).toBeGreaterThanOrEqual(2); // AI + manual
    placeholderBtns[0].dispatchEvent(new Event('click'));
    expect(ctx.generateSummary).toHaveBeenCalledWith(params);
  });

  it('shows the excerpt text and an edit affordance when an excerpt exists', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, baseParams({ excerpt: 'My short excerpt' }));

    const textEl = container.querySelector('.wp-v3-excerpt-inline-text');
    expect(textEl).toBeTruthy();
    expect(textEl!.textContent).toBe('My short excerpt');
    expect(container.querySelector('.wp-v3-inline-edit-btn')).toBeTruthy();
  });

  it('renders tag items from params.tags and colors them via getTagColor', () => {
    const ctx = createMockContext({ editableTags: ['alpha', 'beta'] });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, baseParams({ tags: ['alpha', 'beta'] }));

    const tagItems = Array.from(container.querySelectorAll('.wp-v3-tag-item')) as HTMLElement[];
    expect(tagItems.length).toBe(2);
    expect(tagItems[0].textContent).toBe('alpha');
    expect(tagItems[0].style.backgroundColor).toBeTruthy();
  });

  it('adds a tag through the inline input and syncs params.tags', () => {
    const ctx = createMockContext();
    const params = baseParams({ tags: [] });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, params);

    // empty-tags row: first placeholder button opens the inline input
    const tagsRow = container.querySelector('.wp-v3-tags-empty-row')!;
    const addBtn = tagsRow.querySelectorAll('.wp-v3-placeholder-btn')[0] as HTMLButtonElement;
    addBtn.dispatchEvent(new Event('click'));

    const input = container.querySelector('.wp-v3-tag-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'newtag';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ctx.editableTags).toContain('newtag');
    expect(params.tags).toContain('newtag');
  });

  it('removes a tag via the delete button in edit mode', () => {
    const ctx = createMockContext({ editableTags: ['alpha', 'beta'] });
    const params = baseParams({ tags: ['alpha', 'beta'] });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, params);

    // enter tag-editing mode
    const editBtn = Array.from(container.querySelectorAll('.wp-v3-inline-edit-btn')).find((b) =>
      b.textContent?.includes('✏️')
    ) as HTMLButtonElement;
    editBtn.dispatchEvent(new Event('click'));

    const deleteBtn = container.querySelector('.wp-v3-tag-delete-btn') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.editableTags).not.toContain('alpha');
    expect(params.tags).not.toContain('alpha');
  });

  it('wires the AI generate-tags button', () => {
    const ctx = createMockContext();
    const params = baseParams({ tags: [] });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, params);

    // the tags empty row's second placeholder button is the AI generate-tags one
    const tagsRow = container.querySelector('.wp-v3-tags-empty-row')!;
    const aiBtn = tagsRow.querySelectorAll('.wp-v3-placeholder-btn')[1] as HTMLButtonElement;
    aiBtn.dispatchEvent(new Event('click'));
    expect(ctx.generateTags).toHaveBeenCalledWith(params);
  });

  it('toggles content edit mode and saves the edited content back to ctx.editableContent', () => {
    const ctx = createMockContext({ editableContent: '# Original' });
    const container = document.createElement('div');
    new ContentPreviewSection(ctx).render(container, baseParams());

    const sectionEl = container.querySelector('[data-content-section="true"]') as any;
    expect(typeof sectionEl.__enterContentEdit).toBe('function');
    sectionEl.__enterContentEdit();

    const textarea = container.querySelector('.wp-v3-content-edit-area') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    textarea.value = 'edited markdown';

    const saveBtn = container.querySelector('.wp-v3-save-btn') as HTMLButtonElement;
    saveBtn.dispatchEvent(new Event('click'));

    expect(ctx.editableContent).toBe('edited markdown');
  });
});
