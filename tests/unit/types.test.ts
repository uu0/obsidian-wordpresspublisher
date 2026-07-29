jest.mock('lodash-es', () => ({
  isArray: Array.isArray,
  isString: (value: unknown): value is string => typeof value === 'string',
}));

import { FormItems } from '../../src/types';

describe('FormItems', () => {
  it('serializes WordPress media metadata fields with the file upload', async () => {
    const body = await new FormItems()
      .append('file', {
        fileName: 'hero.jpg',
        mimeType: 'image/jpeg',
        content: new TextEncoder().encode('fake image').buffer,
      })
      .append('alt_text', 'Hero image alt text')
      .append('caption', 'Hero image caption')
      .toArrayBuffer({ boundary: 'test-boundary' });

    const text = new TextDecoder().decode(body);

    expect(text).toContain('name="file"; filename="hero.jpg"');
    expect(text).toContain('Content-Type: image/jpeg');
    expect(text).toContain('name="alt_text"');
    expect(text).toContain('Hero image alt text');
    expect(text).toContain('name="caption"');
    expect(text).toContain('Hero image caption');
  });
});
