import MarkdownIt from 'markdown-it';
import { MarkdownItImagePluginInstance } from '../../src/markdown-it-image-plugin';
it('preserves alt text and dimensions after URL replacement', () => {
  const md = new MarkdownIt().use(MarkdownItImagePluginInstance.plugin);
  const html = md.render('![A photo|640x480](<https://example.com/photo.jpg>)');
  expect(html).toContain('alt="A photo"');
  expect(html).toContain('width="640"');
  expect(html).toContain('height="480"');
});
it('escapes injected wiki-image attributes', () => {
  const md = new MarkdownIt().use(MarkdownItImagePluginInstance.plugin);
  expect(md.render('![[https://example.com/a" onerror="bad]]')).not.toContain('" onerror="');
});
