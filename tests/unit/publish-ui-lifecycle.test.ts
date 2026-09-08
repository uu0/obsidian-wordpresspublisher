/** @jest-environment jsdom */
jest.mock('../../src/app-state', () => ({ AppState: { markdownParser: { render: (value: string) => value } } }));
jest.mock('../../src/markdown-it-mathjax3-plugin', () => ({ MarkdownItMathJax3PluginInstance: {} }));
import { WpPublishModalV2 } from '../../src/wp-publish-modal-v2';
import type { WordPressPostParams } from '../../src/wp-types';

function ui(onSubmit: () => Promise<unknown>) {
  return {
    isPublishing: false, lastPublishParams: null, modalEl: document.createElement('div'), matterData: {}, featuredImage: null,
    showPublishProgress: () => ({ remove: jest.fn() }), onSubmit,
    showConfetti: jest.fn(), showSuccessNotice: jest.fn(), showErrorCard: jest.fn(), close: jest.fn(),
  };
}
it('does not announce success while the publish is pending', async () => {
  let complete!: () => void;
  const host = ui(() => new Promise<void>(resolve => { complete = resolve; }));
  WpPublishModalV2.prototype.doPublish.call(host as unknown as WpPublishModalV2, {} as WordPressPostParams);
  await Promise.resolve();
  expect(host.showSuccessNotice).not.toHaveBeenCalled();
  complete(); await Promise.resolve(); await Promise.resolve();
  expect(host.showSuccessNotice).toHaveBeenCalledTimes(1);
});
it('shows asynchronous failures without success/confetti and restores the dialog', async () => {
  const host = ui(async () => { throw new Error('upload failed'); });
  WpPublishModalV2.prototype.doPublish.call(host as unknown as WpPublishModalV2, {} as WordPressPostParams);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(host.showErrorCard).toHaveBeenCalledWith('upload failed');
  expect(host.showSuccessNotice).not.toHaveBeenCalled();
  expect(host.isPublishing).toBe(false);
  expect(host.modalEl.style.display).toBe('');
});
