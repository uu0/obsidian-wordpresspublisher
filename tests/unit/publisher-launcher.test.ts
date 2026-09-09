import { doClientPublish } from '../../src/publisher-launcher';
import { getWordPressClient } from '../../src/wp-clients';
import { showError } from '../../src/utils';
import type WordpressPlugin from '../../src/main';
import type { WpProfile } from '../../src/wp-profile';

jest.mock('../../src/wp-clients', () => ({ getWordPressClient: jest.fn() }));
jest.mock('../../src/utils', () => ({ showError: jest.fn() }));

const profile = { name: 'site', endpoint: 'https://example.com' } as WpProfile;

function plugin(activeFile: unknown): WordpressPlugin {
  return {
    app: { workspace: { getActiveFile: () => activeFile } },
    i18n: { t: (key: string) => key },
    settings: { profiles: [profile] }
  } as unknown as WordpressPlugin;
}

afterEach(() => jest.clearAllMocks());

it('reports a missing source note before attempting to connect', () => {
  doClientPublish(plugin(null), profile);
  expect(showError).toHaveBeenCalledWith('error_noActiveFile');
  expect(getWordPressClient).not.toHaveBeenCalled();
});

it('starts publishing when a source note is active', async () => {
  const publishPost = jest.fn().mockResolvedValue(undefined);
  (getWordPressClient as jest.Mock).mockReturnValue({ publishPost });
  const instance = plugin({ path: 'post.md' });
  doClientPublish(instance, profile);
  await Promise.resolve();
  expect(getWordPressClient).toHaveBeenCalledWith(instance, profile);
  expect(publishPost).toHaveBeenCalledTimes(1);
});

it('surfaces client setup errors from a ribbon launch', () => {
  (getWordPressClient as jest.Mock).mockImplementation(() => { throw new Error('bad endpoint'); });
  doClientPublish(plugin({ path: 'post.md' }), profile);
  expect(showError).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad endpoint' }));
});
