jest.mock('../../src/markdown-it-mathjax3-plugin', () => ({ MarkdownItMathJax3PluginInstance: {} }));
/** @jest-environment jsdom */
import { TFile } from 'obsidian';
import { applyPublishedNote, publishKey } from '../../src/publish-safety';
import { processFile } from '../../src/utils';
import type { App } from 'obsidian';

it('preserves custom YAML and body when recording a remote ID', () => {
  const raw = '---\ntitle: "a---b"\ncustom: keep\n---\n# Body\n';
  const result = applyPublishedNote(raw, raw, { postId: '42' });
  expect(result).toContain('custom: keep');
  expect(result).toContain('a---b');
  expect(result.endsWith('# Body\n')).toBe(true);
});
it('replaces only the body after publishing, without removing YAML', () => {
  const raw = '---\ncustom: keep\n---\n![alt](a.jpg)';
  expect(applyPublishedNote(raw, raw, { postId: '42' }, '![alt](https://site/a.jpg)')).toContain('custom: keep');
});
it('rejects concurrent edits rather than replacing them', () => {
  expect(() => applyPublishedNote('new body', 'old body', {})).toThrow('changed');
});
it('isolates site and source identities', () => {
  expect(publishKey('https://one', 'a.md')).not.toEqual(publishKey('https://two', 'a.md'));
});
it('reads YAML and content from one snapshot and handles embedded delimiters', async () => {
  const read = jest.fn().mockResolvedValue('---\ntitle: "a---b"\n---\nBody\n');
  const result = await processFile(new TFile(), { vault: { read } } as unknown as App);
  expect(result).toMatchObject({ matter: { title: 'a---b' }, content: 'Body\n' });
  expect(read).toHaveBeenCalledTimes(1);
});
it('does not treat a later horizontal rule as frontmatter', async () => {
  const raw = 'intro\n---\nother\n---\n';
  expect((await processFile(new TFile(), { vault: { read: async () => raw } } as unknown as App)).content).toBe(raw);
});
