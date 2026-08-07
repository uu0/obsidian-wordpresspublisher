/**
 * @jest-environment jsdom
 */
// Mock the const-enum module: under ts-jest + isolatedModules the `const enum`
// produces no runtime value, so we supply real runtime objects the component
// (and this test) can reference.
jest.mock('../../src/wp-api', () => ({
  PostStatus: { Draft: 'draft', Publish: 'publish', Private: 'private', Future: 'future' },
  CommentStatus: { Open: 'open', Closed: 'closed' },
}));

import { installObsidianDomPolyfill } from '../helpers/obsidian-dom';
import { createMockContext } from '../helpers/mock-context';
import { SettingsSidebar } from '../../src/sections/settings-sidebar';
import { SlugGenerator } from '../../src/slug-generator';
import { PostStatus, CommentStatus } from '../../src/wp-api';
import type { WordPressPostParams } from '../../src/wp-types';
import type { Term } from '../../src/wp-api';

installObsidianDomPolyfill();

function baseParams(overrides: Partial<WordPressPostParams> = {}): WordPressPostParams {
  return {
    status: PostStatus.Draft,
    commentStatus: CommentStatus.Open,
    categories: [],
    tags: [],
    title: 'My Post',
    slug: 'my-post',
    ...overrides,
  } as WordPressPostParams;
}

describe('SettingsSidebar', () => {
  it('renders the settings card and a collapsed history card', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, baseParams());

    expect(container.querySelector('.wp-v3-settings-card')).toBeTruthy();

    const history = container.querySelector('.wp-v3-collapsible-card');
    expect(history).toBeTruthy();
    expect(history!.classList.contains('is-collapsed')).toBe(true);
    const body = history!.querySelector('.wp-v3-collapsible-body') as HTMLElement;
    expect(body.style.display).toBe('none');
  });

  it('expands the history card on title click', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, baseParams());

    const titleRow = container.querySelector('.wp-v3-card-title-clickable') as HTMLElement;
    titleRow.dispatchEvent(new Event('click'));

    const card = container.querySelector('.wp-v3-collapsible-card')!;
    expect(card.classList.contains('is-collapsed')).toBe(false);
    const body = card.querySelector('.wp-v3-collapsible-body') as HTMLElement;
    expect(body.style.display).toBe('');
  });

  it('binds the title input and triggers slug generation on blur when enabled', () => {
    const ctx = createMockContext();
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const titleInput = container.querySelector('input.wp-v3-input') as HTMLInputElement;
    titleInput.value = 'New Title';
    titleInput.dispatchEvent(new Event('input'));
    expect(params.title).toBe('New Title');

    ctx.plugin.settings.autoGenerateSlug = true;
    titleInput.dispatchEvent(new Event('blur'));
    expect(ctx.generateDefaultSlug).toHaveBeenCalledWith('New Title', params);
  });

  it('sanitizes the slug input through SlugGenerator', () => {
    const ctx = createMockContext();
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const slugInput = container.querySelectorAll('input.wp-v3-input')[1] as HTMLInputElement;
    slugInput.value = 'Hello World!';
    slugInput.dispatchEvent(new Event('input'));

    expect(params.slug).toBe(SlugGenerator.sanitizeSlug('Hello World!'));
  });

  it('changing the status to Future re-displays and wires the date mask', () => {
    const ctx = createMockContext();
    const params = baseParams({ status: PostStatus.Future });
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const statusSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
    statusSelect.value = PostStatus.Future;
    statusSelect.dispatchEvent(new Event('change'));

    expect(ctx.display).toHaveBeenCalledWith(params);
    expect(ctx.setupDateMask).toHaveBeenCalled();

    const datetimeInput = container.querySelectorAll('input.wp-v3-input')[2] as HTMLInputElement;
    expect(datetimeInput).toBeTruthy();
    expect(datetimeInput.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('updates comment status from the comment select', () => {
    const ctx = createMockContext();
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const commentSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    commentSelect.value = CommentStatus.Closed;
    commentSelect.dispatchEvent(new Event('change'));
    expect(params.commentStatus).toBe(CommentStatus.Closed);
  });

  it('updates the post format from the format select', () => {
    const ctx = createMockContext();
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const formatSelect = container.querySelectorAll('select')[2] as HTMLSelectElement;
    formatSelect.value = 'markdown';
    formatSelect.dispatchEvent(new Event('change'));
    expect((params as any).contentFormat).toBe('markdown');
  });

  it('auto-selects Uncategorized and lets the user remove it', () => {
    const uncat: Term = {
      id: '1',
      name: 'Uncategorized',
      slug: 'uncategorized',
      taxonomy: 'category',
      description: '',
      count: 0,
    };
    const ctx = createMockContext({ categories: { items: [uncat], selected: [] } });
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    expect(params.categories).toContain(1);

    const removeBtn = container.querySelector('.wp-v3-tag-delete-btn') as HTMLButtonElement;
    removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(params.categories).not.toContain(1);
  });

  it('shows the publish-as-new toggle only when the note has an associated post', () => {
    const ctx = createMockContext({ matterData: { featurePicture: '', postId: 42 } });
    const params = baseParams();
    const container = document.createElement('div');
    new SettingsSidebar(ctx).render(container, params);

    const checkbox = container.querySelector('.wp-v3-toggle input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(params.publishAsNew).toBe(true);
  });
});
