import { cloneDeep } from 'lodash-es';
import { PassCrypto } from './pass-crypto';
import type { WordpressPluginSettings } from './plugin-settings';

/** Disk representation only. Session secrets and auxiliary state never escape into it. */
export async function settingsForStorage(input: WordpressPluginSettings, crypto = new PassCrypto()): Promise<Record<string, unknown>> {
  const settings = cloneDeep(input);
  for (const profile of settings.profiles) {
    if (!profile.saveUsername) delete profile.username;
    if (!profile.savePassword) delete profile.encryptedPassword;
    else if (profile.password) profile.encryptedPassword = await crypto.encrypt(profile.password);
    delete profile.password;
    if (profile.wpComOAuth2Token) {
      profile.encryptedWpComOAuth2Token = await crypto.encrypt(JSON.stringify(profile.wpComOAuth2Token));
      delete profile.wpComOAuth2Token;
    }
  }
  for (const provider of [settings.aiConfig?.textAI, settings.aiConfig?.imageAI]) {
    if (!provider) continue;
    if (provider.apiKey !== undefined) {
      if (provider.apiKey) provider.encryptedApiKey = await crypto.encrypt(provider.apiKey);
      else delete provider.encryptedApiKey;
      delete provider.apiKey;
    }
  }
  if (settings.unsplashAccessKey !== undefined) {
    if (settings.unsplashAccessKey) settings.encryptedUnsplashAccessKey = await crypto.encrypt(settings.unsplashAccessKey);
    else delete settings.encryptedUnsplashAccessKey;
    delete (settings as Partial<WordpressPluginSettings>).unsplashAccessKey;
  }
  const clean = settings as unknown as Record<string, unknown>;
  delete clean['feature-picture-cache'];
  delete clean.publishCheckpoints;
  delete clean.mediaReceipts;
  return clean;
}
