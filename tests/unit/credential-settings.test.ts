import { settingsForStorage } from '../../src/credential-settings';
import { PassCrypto } from '../../src/pass-crypto';
import { DEFAULT_SETTINGS } from '../../src/plugin-settings';
import type { WordpressPluginSettings } from '../../src/plugin-settings';
import { SerializedStore } from '../../src/serialized-store';

it('removes saved passwords when remember is off without changing session state', async () => {
  const input = { ...DEFAULT_SETTINGS, profiles: [{ name: 'site', username: 'u', password: 'secret', encryptedPassword: { encrypted: 'old' }, saveUsername: false, savePassword: false }] } as WordpressPluginSettings;
  const data = await settingsForStorage(input);
  expect(JSON.stringify(data)).not.toContain('secret');
  expect(JSON.stringify(data)).not.toContain('old');
  expect(input.profiles[0].password).toBe('secret');
});
it('encrypts OAuth tokens and does not persist cache/journal snapshots as settings', async () => {
  const crypto = new PassCrypto();
  jest.spyOn(crypto, 'encrypt').mockResolvedValue({ encrypted: 'cipher', salt: 'salt', vector: 'iv' });
  const input = { ...DEFAULT_SETTINGS, profiles: [{ wpComOAuth2Token: { accessToken: 'sensitive', blogId: '1' }, savePassword: false }], publishCheckpoints: { stale: true } } as unknown as WordpressPluginSettings;
  const data = await settingsForStorage(input, crypto);
  expect(JSON.stringify(data)).not.toContain('sensitive');
  expect(data).not.toHaveProperty('publishCheckpoints');
  expect((data.profiles as Array<Record<string, unknown>>)[0]).toHaveProperty('encryptedWpComOAuth2Token');
});
it('serializes settings and cache writes without lost updates, including after failures', async () => {
  let disk: Record<string, unknown> = {};
  const store = new SerializedStore(async () => ({ ...disk }), async data => { disk = { ...data }; });
  await Promise.all([store.update(async data => { await Promise.resolve(); data.settings = true; }), store.update(data => { data.cache = true; })]);
  expect(disk).toEqual({ settings: true, cache: true });
  await expect(store.update(() => { throw new Error('failed'); })).rejects.toThrow();
  await store.update(data => { data.recovered = true; });
  expect(disk.recovered).toBe(true);
});
