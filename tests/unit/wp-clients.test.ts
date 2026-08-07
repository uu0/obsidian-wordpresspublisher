/**
 * Unit tests for the WordPress client factory (getWordPressClient).
 * Verifies the REST / XML-RPC selection logic per ApiType.
 */

import { describe, it, expect } from '@jest/globals';
import { getWordPressClient } from '../../src/wp-clients';
import { WpXmlRpcClient } from '../../src/wp-xml-rpc-client';
import { WpRestClient } from '../../src/wp-rest-client';
import { WpProfile } from '../../src/wp-profile';
import { ApiType } from '../../src/plugin-settings';

// Minimal plugin double — only the fields the constructors touch.
const makePlugin = () =>
  ({ app: {}, i18n: { t: (k: string) => k } } as unknown as import('../../src/main').default);

const profile = (overrides: Partial<WpProfile>): WpProfile =>
  ({
    endpoint: 'https://example.com/xmlrpc.php',
    apiType: ApiType.XML_RPC,
    ...overrides,
  } as unknown as WpProfile);

describe('getWordPressClient', () => {
  it('returns an XML-RPC client for ApiType.XML_RPC', () => {
    const client = getWordPressClient(makePlugin(), profile({ apiType: ApiType.XML_RPC }));
    expect(client).toBeInstanceOf(WpXmlRpcClient);
  });

  it('returns a REST client for miniOrange', () => {
    const client = getWordPressClient(
      makePlugin(),
      profile({ apiType: ApiType.RestAPI_miniOrange })
    );
    expect(client).toBeInstanceOf(WpRestClient);
  });

  it('returns a REST client for Application Passwords', () => {
    const client = getWordPressClient(
      makePlugin(),
      profile({ apiType: ApiType.RestApi_ApplicationPasswords })
    );
    expect(client).toBeInstanceOf(WpRestClient);
  });

  it('returns a REST client for WpCom OAuth2 when a token is present', () => {
    const client = getWordPressClient(
      makePlugin(),
      profile({
        apiType: ApiType.RestApi_WpComOAuth2,
        wpComOAuth2Token: { blogId: '1', accessToken: 'tok' },
      } as Partial<WpProfile>)
    );
    expect(client).toBeInstanceOf(WpRestClient);
  });

  it('returns null for WpCom OAuth2 without a token', () => {
    const client = getWordPressClient(
      makePlugin(),
      profile({ apiType: ApiType.RestApi_WpComOAuth2 })
    );
    expect(client).toBeNull();
  });

  it('returns null when the endpoint is empty', () => {
    const client = getWordPressClient(
      makePlugin(),
      profile({ endpoint: '', apiType: ApiType.XML_RPC })
    );
    expect(client).toBeNull();
  });
});
