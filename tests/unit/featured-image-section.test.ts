/**
 * @jest-environment jsdom
 */
import { installObsidianDomPolyfill } from '../helpers/obsidian-dom';
import { createMockContext } from '../helpers/mock-context';
import { FeaturedImageSection } from '../../src/sections/featured-image-section';
import type { FeaturedImageResult } from '../../src/featured-image-modal';
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

function findButton(container: HTMLElement, predicate: (b: HTMLButtonElement) => unknown): HTMLButtonElement {
  const btn = Array.from(container.querySelectorAll('button')).find(predicate);
  if (!btn) throw new Error('button not found');
  return btn as HTMLButtonElement;
}

describe('FeaturedImageSection', () => {
  it('renders the empty setup with select buttons when no image is present', () => {
    const ctx = createMockContext();
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, baseParams());

    expect(container.querySelector('.wp-v3-featured-setup')).toBeTruthy();
    expect(container.querySelector('.wp-v3-featured-img')).toBeFalsy();
    expect(container.textContent).toContain('📂'); // local
    expect(container.textContent).toContain('📁'); // vault
    expect(container.textContent).toContain('🤖'); // AI
  });

  it('shows the Unsplash button only when an unsplashService is wired', () => {
    const ctx = createMockContext({ unsplashService: {} as any });
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, baseParams());
    expect(container.textContent).toContain('Unsplash');
  });

  it('wires the local / vault buttons to the matching context actions', () => {
    const ctx = createMockContext();
    const params = baseParams();
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, params);

    findButton(container, (b) => b.textContent?.includes('📂')).dispatchEvent(new Event('click'));
    expect(ctx.selectLocalFile).toHaveBeenCalledWith(params);

    findButton(container, (b) => b.textContent?.includes('📁')).dispatchEvent(new Event('click'));
    expect(ctx.selectVaultImage).toHaveBeenCalledWith(params);
  });

  it('clicking the AI button generates an image when a key is available, otherwise only notifies', () => {
    const enabledCtx = createMockContext({ aiService: { hasImageAIKey: () => true } as any });
    const p1 = baseParams();
    const c1 = document.createElement('div');
    new FeaturedImageSection(enabledCtx).render(c1, p1);
    findButton(c1, (b) => b.textContent?.includes('🤖')).dispatchEvent(new Event('click'));
    expect(enabledCtx.generateFeaturedImage).toHaveBeenCalledWith(p1);

    const disabledCtx = createMockContext({ aiService: { hasImageAIKey: () => false } as any });
    const c2 = document.createElement('div');
    new FeaturedImageSection(disabledCtx).render(c2, baseParams());
    findButton(c2, (b) => b.textContent?.includes('🤖')).dispatchEvent(new Event('click'));
    expect(disabledCtx.generateFeaturedImage).not.toHaveBeenCalled();
  });

  it('renders a preview for a freshly selected local image and supports removal', () => {
    const img: FeaturedImageResult = {
      fileName: 'pic.png',
      content: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
    };
    const ctx = createMockContext({ featuredImage: img, imageSource: 'local' });
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, baseParams());

    const imgEl = container.querySelector('.wp-v3-featured-img') as HTMLImageElement;
    expect(imgEl).toBeTruthy();
    expect(imgEl.getAttribute('src')).toBe('blob:mock');

    findButton(container, (b) => b.textContent === '❌').dispatchEvent(new Event('click'));
    expect(ctx.featuredImage).toBeNull();
    expect(ctx.autoFeaturedImage).toBeNull();
    expect(ctx.matterData.featurePicture).toBe('');
  });

  it('renders an already-uploaded image via matterData.featurePicture', () => {
    const ctx = createMockContext({ matterData: { featurePicture: 'https://wp.example/x.jpg', postId: 5 } });
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, baseParams());

    const imgEl = container.querySelector('.wp-v3-featured-img') as HTMLImageElement;
    expect(imgEl).toBeTruthy();
    expect(imgEl.getAttribute('src')).toBe('https://wp.example/x.jpg');
  });

  it('shows a loading state while the remote image is loading', () => {
    const img: FeaturedImageResult = { fileName: 'x.png', content: new Uint8Array([1]), mimeType: 'image/png' };
    const ctx = createMockContext({ featuredImage: img, isLoadingRemoteImage: true });
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, baseParams());

    const status = container.querySelector('.wp-v3-featured-status-wrap');
    expect(status).toBeTruthy();
    expect(status!.textContent).toContain('正在加载');
  });

  it('retry re-loads the remote image and skip clears the remote id and re-displays', () => {
    const img: FeaturedImageResult = { fileName: 'x.png', content: new Uint8Array([1]), mimeType: 'image/png' };
    const ctx = createMockContext({
      featuredImage: img,
      remoteImageLoadFailed: true,
      remoteImageError: 'boom',
      remoteImagePostId: 7,
    });
    const params = baseParams();
    const container = document.createElement('div');
    new FeaturedImageSection(ctx).render(container, params);

    expect(container.querySelector('.wp-v3-featured-status-error')!.textContent).toContain('boom');

    findButton(container, (b) => b.textContent === '重试').dispatchEvent(new Event('click'));
    expect(ctx.loadRemoteFeaturedImage).toHaveBeenCalledWith(7, params);

    findButton(container, (b) => b.textContent === '跳过').dispatchEvent(new Event('click'));
    expect(ctx.remoteImagePostId).toBeNull();
    // 修复 P0：跳过应局部刷新本卡片，而非整模态重建
    expect(ctx.display).not.toHaveBeenCalled();
    // 错误态已被清除，回到无图 setup
    expect(container.querySelector('.wp-v3-featured-status-error')).toBeNull();
  });

  it('revokes the previous object URL on rebuild to avoid leaks (P0)', () => {
    const revokes: string[] = [];
    const originalCreate = (URL as any).createObjectURL;
    const originalRevoke = (URL as any).revokeObjectURL;
    (URL as any).createObjectURL = () => 'blob:leak-test';
    (URL as any).revokeObjectURL = (u: string) => revokes.push(u);

    const img: FeaturedImageResult = { fileName: 'x.png', content: new Uint8Array([1]), mimeType: 'image/png' };
    const ctx = createMockContext({ featuredImage: img, imageSource: 'local' });
    const container = document.createElement('div');
    const section = new FeaturedImageSection(ctx);
    section.render(container, baseParams());

    expect(revokes).not.toContain('blob:leak-test'); // 初次渲染只创建、未释放

    (section as any).rebuild(); // 触发局部刷新
    expect(revokes).toContain('blob:leak-test'); // 刷新前释放旧 URL

    // 恢复 polyfill，避免影响其它测试
    (URL as any).createObjectURL = originalCreate;
    (URL as any).revokeObjectURL = originalRevoke;
  });
});
