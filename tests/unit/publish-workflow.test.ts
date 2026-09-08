/** @jest-environment jsdom */
jest.mock('../../src/app-state', () => ({ AppState: { markdownParser: new (jest.requireActual('markdown-it'))({ html: true }) } }));
jest.mock('../../src/markdown-it-mathjax3-plugin', () => ({ MarkdownItMathJax3PluginInstance: {} }));
import { TFile, parseYaml } from 'obsidian';
import { WpRestClient, WpRestClientAppPasswordContext } from '../../src/wp-rest-client';
import type WordpressPlugin from '../../src/main';
import type { WpProfile } from '../../src/wp-profile';
import { WordPressClientReturnCode, WordPressPostParams, WordPressClientResult, WordPressPublishResult } from '../../src/wp-types';
import { CommentStatus, PostStatus } from '../../src/wp-api';
import { SerializedStore } from '../../src/serialized-store';
import { publishKey } from '../../src/publish-safety';
import { HttpError } from '../../src/rest-client';

type Attempt = { postParams: WordPressPostParams; auth: { username: string; password: string }; file: TFile; sourceSnapshot: string };
function fixture() {
  const source = Object.assign(new TFile(), { path: 'A.md', basename: 'A' });
  const other = Object.assign(new TFile(), { path: 'B.md', basename: 'B' });
  const notes: Record<string, string> = { 'A.md': '---\ncustom: keep\n---\nOriginal', 'B.md': 'Leave me alone' };
  let data: Record<string, unknown> = {};
  const store = new SerializedStore(async () => structuredClone(data), async value => { data = structuredClone(value); });
  const plugin = {
    app: {
      workspace: { getActiveFile: () => other },
      vault: { read: async (file: TFile) => notes[file.path], process: jest.fn(async (file: TFile, update: (raw: string) => string) => { notes[file.path] = update(notes[file.path]); }) },
      fileManager: { processFrontMatter: jest.fn(async (file: TFile, update: (fm: Record<string, unknown>) => void) => {
        const fm: Record<string, unknown> = {}; update(fm); notes[file.path] += `\nRECOVERED:${fm.postId}`;
      }) },
    },
    settings: { replaceMediaLinks: false, tagFormat: 'array' },
    i18n: { t: (key: string) => key },
    loadData: async () => structuredClone(data),
    updateStoredData: (change: (value: Record<string, unknown>) => void) => store.update(change),
  };
  const client = new WpRestClient(plugin as unknown as WordpressPlugin, { endpoint: 'https://example.com', name: 'site' } as WpProfile, new WpRestClientAppPasswordContext());
  const publish = jest.spyOn(client, 'publish').mockResolvedValue({ code: WordPressClientReturnCode.OK, data: { postId: '42', categories: [] } });
  const internal = client as unknown as { tryToPublish(args: Attempt): Promise<WordPressClientResult<WordPressPublishResult>> };
  const attempt: Attempt = { file: source, sourceSnapshot: notes['A.md'], auth: { username: 'u', password: 'p' }, postParams: { postType: 'post', title: 'A', content: 'Original', tags: [], categories: [], status: PostStatus.Draft, commentStatus: CommentStatus.Open } };
  return { client, internal, attempt, notes, plugin, publish, getData: () => data };
}
// The jsdom realm does not supply structuredClone in all supported Jest versions.
beforeAll(() => { global.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)); });
afterEach(() => jest.restoreAllMocks());
it('writes only the bound source file even when another note is active', async () => {
  const f = fixture();
  await f.internal.tryToPublish(f.attempt);
  expect(f.notes['B.md']).toBe('Leave me alone');
  expect(parseYaml(f.notes['A.md'].split('---')[1])).toMatchObject({ postId: '42', custom: 'keep' });
  expect(f.notes['A.md']).toContain('Original');
});
it('sanitizes the actual outgoing HTML rather than just its preview', async () => {
  const f = fixture(); f.attempt.postParams.content = '<script>alert(1)</script><p>safe</p><img onerror="bad()" src="https://site/x">';
  await f.internal.tryToPublish(f.attempt);
  expect(f.publish.mock.calls[0][1]).not.toMatch(/script|onerror/);
  expect(f.publish.mock.calls[0][1]).toContain('safe');
});
it('stops before publishing if the source was edited while the dialog was open', async () => {
  const f = fixture(); f.notes['A.md'] = 'New edit';
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('changed');
  expect(f.publish).not.toHaveBeenCalled();
});
it('recovers a confirmed remote result after local write failure without another POST', async () => {
  const f = fixture();
  f.plugin.app.vault.process.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('disk full');
  expect(f.getData()).toHaveProperty('publishCheckpoints');
  await f.internal.tryToPublish(f.attempt);
  expect(f.publish).toHaveBeenCalledTimes(1);
  expect(f.notes['A.md']).toContain('RECOVERED:42');
});
it('keeps concurrent edits and recovers the successful remote ID on explicit retry', async () => {
  const f = fixture();
  f.publish.mockImplementation(async () => { f.notes['A.md'] = 'Concurrent edit'; return { code: WordPressClientReturnCode.OK, data: { postId: '42', categories: [] } }; });
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('changed');
  await f.internal.tryToPublish(f.attempt);
  expect(f.notes['A.md']).toBe('Concurrent edit\nRECOVERED:42');
  expect(f.publish).toHaveBeenCalledTimes(1);
});
it('blocks a second POST when the first result is unknown', async () => {
  const f = fixture(); f.publish.mockRejectedValue(new Error('connection lost'));
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('connection lost');
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('unknown');
  expect(f.publish).toHaveBeenCalledTimes(1);
});
it('allows corrected input after a definitive HTTP rejection', async () => {
  const f = fixture(); f.publish.mockRejectedValueOnce(new HttpError(400, { message: 'Invalid' }));
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('Invalid');
  await f.internal.tryToPublish(f.attempt);
  expect(f.publish).toHaveBeenCalledTimes(2);
});
it('does not silently drop failed tags', async () => {
  const f = fixture(); f.attempt.postParams.tags = ['a'];
  jest.spyOn(f.client, 'getTag').mockRejectedValue(new Error('tag denied'));
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('tag denied');
  expect(f.publish).not.toHaveBeenCalled();
  expect(f.attempt.postParams.tags).toEqual(['a']);
});
it('does not publish a missing local image', async () => {
  const f = fixture(); f.attempt.postParams.content = '![photo](missing.jpg)';
  Object.assign(f.plugin.app, { metadataCache: { getFirstLinkpathDest: () => null } });
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('Image not found');
  expect(f.publish).not.toHaveBeenCalled();
  expect((f.getData().publishCheckpoints ?? {})).not.toHaveProperty(publishKey('https://example.com', 'A.md'));
});

function imageFixture() {
  const f = fixture();
  const image = Object.assign(new TFile(), { path: 'Photos/a.png', name: 'a.png' });
  const resolve = jest.fn().mockReturnValue(image);
  Object.assign(f.plugin.app, { metadataCache: { getFirstLinkpathDest: resolve } });
  Object.assign(f.plugin.app.vault, { readBinary: async () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer });
  Object.defineProperty(global.crypto, 'subtle', { configurable: true, value: { digest: async () => new Uint8Array([1, 2, 3]).buffer } });
  return { ...f, resolve };
}
it('stops on upload failure and never changes the local note', async () => {
  const f = imageFixture(); f.attempt.postParams.content = '![alt](a.png)';
  jest.spyOn(f.client, 'uploadMedia').mockResolvedValue({ code: WordPressClientReturnCode.Error, error: { code: 'offline', message: 'upload failed' } });
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('upload failed');
  expect(f.publish).not.toHaveBeenCalled();
  expect(f.notes['A.md']).toBe(f.attempt.sourceSnapshot);
  expect(f.resolve).toHaveBeenCalledWith('a.png', 'A.md');
});
it('reuses uploaded bytes on retry and does not replace an image example inside code', async () => {
  const f = imageFixture();
  f.attempt.postParams.content = '```md\n![alt](a.png)\n```\n![alt](a.png)';
  const upload = jest.spyOn(f.client, 'uploadMedia').mockResolvedValue({ code: WordPressClientReturnCode.OK, data: { id: 7, url: 'https://site/a.png' } });
  f.publish.mockRejectedValueOnce(new HttpError(400, { message: 'invalid post' }));
  await expect(f.internal.tryToPublish(f.attempt)).rejects.toThrow('invalid post');
  await f.internal.tryToPublish(f.attempt);
  expect(upload).toHaveBeenCalledTimes(1);
  expect(f.publish.mock.calls[1][1]).toContain('![alt](a.png)');
  expect(f.publish.mock.calls[1][1]).toContain('src="https://site/a.png"');
  expect(f.publish.mock.calls[1][1]).toContain('alt="alt"');
});
