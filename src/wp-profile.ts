import { WordPressOAuth2Token } from './oauth2-client';
import { ApiType } from './plugin-settings';

export interface WpProfile {

  /**
   * Profile name.
   */
  name: string;

  /**
   * API type.
   */
  apiType: ApiType;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * XML-RPC path.
   */
  xmlRpcPath?: string;

  /**
   * WordPress username.
   */
  username?: string;

  /**
   * WordPress password.
   */
  password?: string;

  /**
   * Encrypted password which will be saved locally.
   */
  encryptedPassword?: {
    encrypted: string;
    key?: string;
    vector?: string;
    /** PBKDF2 salt used by the current encryption format. */
    salt?: string;
  };

  /**
   * OAuth2 token for wordpress.com
   */
  wpComOAuth2Token?: WordPressOAuth2Token;
  encryptedWpComOAuth2Token?: import('./pass-crypto').EncryptedPayload;

  /**
   * Save username to local data.
   */
  saveUsername: boolean;

  /**
   * Save user password to local data.
   */
  savePassword: boolean;

  /**
   * Is default profile.
   */
  isDefault: boolean;

  /**
   * Last selected post categories.
   */
  lastSelectedCategories: number[];
}
