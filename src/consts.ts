export const ERROR_NOTICE_TIMEOUT = 15000;

// Featured image upload retry configuration (P0 feature)
export const FEATURED_IMAGE_UPLOAD_MAX_RETRIES = 2;
export const FEATURED_IMAGE_UPLOAD_RETRY_DELAY_MS = 2000;

// Auth cache duration mapping (P1 feature)
// Values in milliseconds
export const AUTH_CACHE_DURATION_MS: Record<string, number> = {
  '1d': 24 * 60 * 60 * 1000,        // 1 day
  '1w': 7 * 24 * 60 * 60 * 1000,    // 1 week
  '1m': 30 * 24 * 60 * 60 * 1000,   // 1 month (approx)
  '6m': 180 * 24 * 60 * 60 * 1000,  // 6 months (approx)
  'forever': Number.MAX_SAFE_INTEGER // Never expire
};

export const WP_OAUTH2_CLIENT_ID = '79085';
// NOTE: WordPress.com OAuth2 public clients cannot keep their client_secret truly
// confidential (the secret ships in every installed copy of the plugin). This is
// a known limitation of public-client OAuth2 flows. Rotate the secret via the
// WordPress.com developer console if it is abused.
export const WP_OAUTH2_CLIENT_SECRET = 'zg4mKy9O1mc1mmynShJTVxs8r1k3X4e3g1sv5URlkpZqlWdUdAA7C2SSBOo02P7X';
export const WP_OAUTH2_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token';
export const WP_OAUTH2_AUTHORIZE_ENDPOINT = 'https://public-api.wordpress.com/oauth2/authorize';
export const WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token-info';
export const WP_OAUTH2_URL_ACTION = 'wordpress-plugin-oauth';
export const WP_OAUTH2_REDIRECT_URI = `obsidian://${WP_OAUTH2_URL_ACTION}`;

export const WP_DEFAULT_PROFILE_NAME = 'Default';

export const enum EventType {
  OAUTH2_TOKEN_GOT = 'OAUTH2_TOKEN_GOT',
}
