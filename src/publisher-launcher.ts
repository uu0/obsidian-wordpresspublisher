import type WordpressPlugin from './main';
import type { WpProfile } from './wp-profile';
import type { WordPressPostParams } from './wp-types';
import { isString } from 'lodash-es';
import { getWordPressClient } from './wp-clients';
import { showError } from './utils';

/**
 * Publish content using WordPress client
 * Overload: Accept profile object
 */
export function doClientPublish(plugin: WordpressPlugin, profile: WpProfile, defaultPostParams?: WordPressPostParams): void;
/**
 * Publish content using WordPress client
 * Overload: Accept profile name string
 */
export function doClientPublish(plugin: WordpressPlugin, profileName: string, defaultPostParams?: WordPressPostParams): void;
/**
 * Publish content using WordPress client
 * @param plugin - Plugin instance
 * @param profileOrName - WordPress profile object or profile name
 * @param defaultPostParams - Optional default post parameters
 * @throws Error if profile not found
 */
export function doClientPublish(
  plugin: WordpressPlugin,
  profileOrName: WpProfile | string,
  defaultPostParams?: WordPressPostParams
): void {
  // Resolve profile from name or use directly
  let profile: WpProfile | undefined;
  if (isString(profileOrName)) {
    profile = plugin.settings.profiles.find(p => p.name === profileOrName);
  } else {
    profile = profileOrName;
  }

  // Validate profile exists
  if (!profile) {
    const noSuchProfileMessage = plugin.i18n.t('error_noSuchProfile', {
      profileName: String(profileOrName)
    });
    showError(noSuchProfileMessage);
    throw new Error(noSuchProfileMessage);
  }

  // Get client and publish
  const client = getWordPressClient(plugin, profile);
  if (client) {
    client.publishPost(defaultPostParams).catch(error => {
      showError(error);
    });
  }
}

