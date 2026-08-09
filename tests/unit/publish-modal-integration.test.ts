/**
 * @jest-environment jsdom
 */
// app-state pulls in markdown-it + mathjax + juice/cheerio (ESM that ts-jest
// can't transform). We don't need a real Markdown renderer here, so mock it.
jest.mock('../../src/app-state', () => ({
  AppState: {
    markdownParser: { render: (md: string) => `<p>${md}</p>` },
  },
}));

// Mock the const-enum module: under ts-jest + isolatedModules the `const enum`
// produces no runtime value, so we supply real runtime objects the component
// (and this test) can reference.
jest.mock('../../src/wp-api', () => ({
  PostStatus: { Draft: 'draft', Publish: 'publish', Private: 'private', Future: 'future' },
  CommentStatus: { Open: 'open', Closed: 'closed' },
}));

import { installObsidianDomPolyfill } from '../helpers/obsidian-dom';
import { createMockContext } from '../helpers/mock-context';
import { FeaturedImageSection } from '../../src/sections/featured-image-section';
import { ContentPreviewSection } from '../../src/sections/content-preview-section';
import { SettingsSidebar } from '../../src/sections/settings-sidebar';
import { PostStatus } from '../../src/wp-api';
import type { WordPressPostParams } from '../../src/wp-types';

installObsidianDomPolyfill();

function baseParams(overrides: Partial<WordPressPostParams> = {}): WordPressPostParams {
  return {
    content: '# Test content',
    status: PostStatus.Draft,
    commentStatus: 'open' as any,
    categories: [],
    tags: ['alpha', 'beta'],
    title: 'Test Post',
    ...overrides,
  } as WordPressPostParams;
}

describe('Publish-modal sections integration', () => {
  it('renders all three extracted sections and exposes their DOM structure', () => {
    const ctx = createMockContext();
    const featured = document.createElement('div');
    const content = document.createElement('div');
    const sidebar = document.createElement('div');
    const params = baseParams();

    new FeaturedImageSection(ctx).render(featured, params);
    new ContentPreviewSection(ctx).render(content, params);
    new SettingsSidebar(ctx).render(sidebar, params);

    expect(featured.querySelector('.wp-v3-section')).toBeTruthy();
    expect(content.querySelector('.wp-v3-content-preview')).toBeTruthy();
    expect(sidebar.querySelector('.wp-v3-settings-card')).toBeTruthy();
    expect(sidebar.querySelector('select.wp-v3-select')).toBeTruthy();
  });

  it('delegates AI tag generation to the context from the content section', () => {
    const ctx = createMockContext();
    const content = document.createElement('div');
    const params = baseParams({ tags: [] });
    new ContentPreviewSection(ctx).render(content, params);

    // Two buttons share .wp-v3-placeholder-btn inside the empty row (add + AI).
    // The AI button is the second one.
    const aiBtn = content.querySelectorAll('.wp-v3-tags-empty-row .wp-v3-placeholder-btn')[1] as HTMLButtonElement;
    expect(aiBtn).toBeTruthy();
    aiBtn.click();

    expect(ctx.generateTags).toHaveBeenCalledWith(params);
  });

  it('wires the IMask date mask (setupDateMask) when status is Future', () => {
    const ctx = createMockContext();
    const sidebar = document.createElement('div');
    const params = baseParams({ status: PostStatus.Future });
    new SettingsSidebar(ctx).render(sidebar, params);

    expect(ctx.setupDateMask).toHaveBeenCalledTimes(1);
    expect(ctx.setupDateMask).toHaveBeenCalledWith(expect.anything(), params);
  });

  it('rebuilds locally on a status change instead of a full modal display', () => {
    const ctx = createMockContext();
    const sidebar = document.createElement('div');
    const params = baseParams({ status: PostStatus.Draft });
    new SettingsSidebar(ctx).render(sidebar, params);

    const select = sidebar.querySelector('select.wp-v3-select') as HTMLSelectElement;
    select.value = PostStatus.Publish;
    select.dispatchEvent(new Event('change'));

    // P0 fix: status change must NOT trigger a whole-modal rebuild.
    expect(ctx.display).not.toHaveBeenCalled();
    expect(params.status).toBe(PostStatus.Publish);
    // The sidebar should still be fully re-rendered after the local refresh.
    expect(sidebar.querySelector('select.wp-v3-select')).toBeTruthy();
  });
});
