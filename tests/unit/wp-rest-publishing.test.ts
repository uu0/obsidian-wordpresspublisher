import { WpRestClient, WpRestClientAppPasswordContext, WpRestClientMiniOrangeContext } from '../../src/wp-rest-client';
import { RestClient } from '../../src/rest-client';
import { HttpError } from '../../src/rest-client';
import type WordpressPlugin from '../../src/main';
import type { WpProfile } from '../../src/wp-profile';
import { CommentStatus, PostStatus } from '../../src/wp-api';
import type { WordPressPostParams } from '../../src/wp-types';

const auth = { username: 'u', password: 'p' };
const client = () => new WpRestClient({ app: {}, i18n: { t: (key: string) => key } } as unknown as WordpressPlugin, { endpoint: 'https://example.com' } as WpProfile, new WpRestClientAppPasswordContext());
const params = (type: string): WordPressPostParams => ({ title: 'Title', content: '', postType: type, categories: [1], tags: ['2'], status: PostStatus.Draft, commentStatus: CommentStatus.Open, excerpt: '', slug: '' });
afterEach(() => jest.restoreAllMocks());
it('encodes Unicode credentials and removes display spaces from application passwords', () => {
  const header = new WpRestClientAppPasswordContext().getHeaders({
    username: '摄影师',
    password: 'abcd efgh ijkl'
  }).authorization;
  expect(Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8')).toBe('摄影师:abcdefghijkl');
});
it('preserves spaces for password-based REST extensions', () => {
  const header = new WpRestClientMiniOrangeContext().getHeaders({ username: 'user', password: 'two words' }).authorization;
  expect(Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8')).toBe('user:two words');
});
it('preserves the WordPress authentication error instead of reporting every failure as bad credentials', async () => {
  jest.spyOn(RestClient.prototype, 'httpGet').mockRejectedValue(new HttpError(403, {
    code: 'rest_forbidden',
    message: 'Application passwords are disabled.'
  }));
  const result = await client().validateUser(auth);
  expect(result).toMatchObject({ error: { message: 'Application passwords are disabled.' } });
});
it('creates pages at the pages route without post taxonomies and includes explicit empty excerpt', async () => {
  const post = jest.spyOn(RestClient.prototype, 'httpPost').mockResolvedValue({ id: 42 });
  await client().publish('Page', '<p>body</p>', params('page'), auth);
  expect(post.mock.calls[0][0]).toBe('wp-json/wp/v2/pages');
  expect(post.mock.calls[0][1]).toMatchObject({ excerpt: '', slug: '' });
  expect(post.mock.calls[0][1]).not.toHaveProperty('categories');
});
it('updates and reads pages through the same resource', async () => {
  const post = jest.spyOn(RestClient.prototype, 'httpPost').mockResolvedValue({ id: 42 });
  const get = jest.spyOn(RestClient.prototype, 'httpGet').mockResolvedValue({ id: 42 });
  const api = client();
  await api.publish('Page', '', { ...params('page'), postId: '42' }, auth);
  await api.getPost('42', auth, 'page');
  expect(post.mock.calls[0][0]).toBe('wp-json/wp/v2/pages/42');
  expect(get.mock.calls[0][0]).toContain('wp-json/wp/v2/pages/42');
});
it('rejects unsupported types instead of silently creating posts', async () => {
  const post = jest.spyOn(RestClient.prototype, 'httpPost');
  await expect(client().publish('Album', '', params('photography'), auth)).rejects.toThrow('Unsupported');
  expect(post).not.toHaveBeenCalled();
});
it('encodes tag searches and requires an exact match with authentication', async () => {
  const get = jest.spyOn(RestClient.prototype, 'httpGet').mockResolvedValue([{ id: 1, name: 'Other A&B' }]);
  const post = jest.spyOn(RestClient.prototype, 'httpPost').mockResolvedValue({ id: 2, name: 'A&B' });
  expect((await client().getTag('A&B', auth)).id).toBe(2);
  expect(get.mock.calls[0][0]).toContain('A%26B');
  expect(get.mock.calls[0][1]?.headers).toHaveProperty('authorization');
  expect(post).toHaveBeenCalledTimes(1);
});
