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

// jsdom doesn't implement the Pointer Capture APIs the drag handler relies on.
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () { /* no-op */ };
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = function () { /* no-op */ };
}

function baseParams(overrides: Partial<WordPressPostParams> = {}): WordPressPostParams {
  return {
    status: 'draft' as any,
    commentStatus: 'open' as any,
    categories: [],
    tags: ['alpha', 'beta', 'gamma'],
    title: 'Test Post',
    ...overrides,
  } as WordPressPostParams;
}

// jsdom MouseEvent carries clientX/clientY; the drag handler only needs those
// plus the event type. PointerEvent isn't implemented in jsdom, so we reuse
// MouseEvent and set the type to the pointer event names.
function pointerEvent(type: string, x: number, y: number): MouseEvent {
  return new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
}

// Give each draggable tag a distinct, non-overlapping bounding rect so the
// handler's hit-test (getTargetEl) can resolve which tag is under the pointer.
function stubRects(els: HTMLElement[], rects: Array<{ left: number; right: number; top: number; bottom: number }>): void {
  els.forEach((el, i) => {
    const r = rects[i];
    el.getBoundingClientRect = () =>
      ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.right - r.left, height: r.bottom - r.top, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect);
  });
}

describe('ContentPreviewSection tag drag-sort', () => {
  it('reorders params.tags when a tag is dragged onto another tag', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    const params = baseParams();
    new ContentPreviewSection(ctx).render(container, params);

    // Enter edit mode so tags become draggable (.is-draggable).
    const editBtn = container.querySelector('.wp-v3-inline-edit-btn') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();
    editBtn.dispatchEvent(new Event('click'));

    const tagEls = Array.from(container.querySelectorAll<HTMLElement>('.wp-v3-tag-item.is-draggable'));
    expect(tagEls.length).toBe(3);

    stubRects(tagEls, [
      { left: 0, right: 50, top: 0, bottom: 20 },
      { left: 100, right: 150, top: 0, bottom: 20 },
      { left: 200, right: 250, top: 0, bottom: 20 },
    ]);

    // Drag tag[0] (alpha) onto tag[1] (beta): down on tag0, move/up at tag1's center.
    tagEls[0].dispatchEvent(pointerEvent('pointerdown', 10, 10));
    tagEls[0].dispatchEvent(pointerEvent('pointermove', 125, 10));
    tagEls[0].dispatchEvent(pointerEvent('pointerup', 125, 10));

    expect(params.tags).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('does not reorder when dropped back onto the same tag', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    const params = baseParams();
    new ContentPreviewSection(ctx).render(container, params);

    const editBtn = container.querySelector('.wp-v3-inline-edit-btn') as HTMLButtonElement;
    editBtn.dispatchEvent(new Event('click'));

    const tagEls = Array.from(container.querySelectorAll<HTMLElement>('.wp-v3-tag-item.is-draggable'));
    stubRects(tagEls, [
      { left: 0, right: 50, top: 0, bottom: 20 },
      { left: 100, right: 150, top: 0, bottom: 20 },
      { left: 200, right: 250, top: 0, bottom: 20 },
    ]);

    // Drop on itself (coordinates stay within tag0's own rect).
    tagEls[0].dispatchEvent(pointerEvent('pointerdown', 10, 10));
    tagEls[0].dispatchEvent(pointerEvent('pointermove', 25, 10));
    tagEls[0].dispatchEvent(pointerEvent('pointerup', 25, 10));

    expect(params.tags).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('removes a tag through the delete button and syncs params.tags', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    const params = baseParams();
    new ContentPreviewSection(ctx).render(container, params);

    const editBtn = container.querySelector('.wp-v3-inline-edit-btn') as HTMLButtonElement;
    editBtn.dispatchEvent(new Event('click'));

    const deleteBtn = container.querySelector('.wp-v3-tag-delete-btn') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.dispatchEvent(new Event('click'));

    expect(params.tags).toEqual(['beta', 'gamma']);
  });
});
