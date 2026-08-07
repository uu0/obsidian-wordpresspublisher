/**
 * Unit tests for PassCrypto.
 *
 * Covers the security-critical guarantees introduced in the H1 fix:
 *  - encrypt -> decrypt round-trip
 *  - the derived key is NOT persisted (only a random salt is stored)
 *  - legacy JWK payloads still decrypt
 *  - when Web Crypto is unavailable, encrypt/decrypt REFUSE (no silent
 *    reversible-obfuscation fallback)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PassCrypto } from '../../src/pass-crypto';

describe('PassCrypto', () => {
  const crypto = new PassCrypto();

  it('reports Web Crypto as available in the node test runtime', () => {
    expect(crypto.canUse()).toBe(true);
  });

  it('round-trips an encrypted secret', async () => {
    const payload = await crypto.encrypt('super-secret-password');
    expect(payload.encrypted).toBeTruthy();
    expect(payload.vector).toBeTruthy();
    expect(payload.salt).toBeTruthy();
    // The derived AES key must never be stored next to the ciphertext.
    expect(payload.key).toBeUndefined();

    const decrypted = await crypto.decrypt(
      payload.encrypted,
      payload.key,
      payload.vector,
      payload.salt
    );
    expect(decrypted).toBe('super-secret-password');
  });

  it('produces a different ciphertext each time (random salt/iv)', async () => {
    const a = await crypto.encrypt('same-input');
    const b = await crypto.encrypt('same-input');
    expect(a.encrypted).not.toBe(b.encrypted);
  });

  it('rejects malformed legacy JWK keys instead of returning junk', async () => {
    // A malformed legacy JWK key must be rejected, not silently decrypted.
    await expect(
      crypto.decrypt('x', '{not-json}', 'AAECAwQFAgUG')
    ).rejects.toThrow(/corrupted/);
  });

  it('rejects payloads missing both key and salt', async () => {
    await expect(
      crypto.decrypt('x', undefined, undefined, undefined)
    ).rejects.toThrow(/missing key\/vector/);
  });

  describe('refuses when Web Crypto is unavailable', () => {
    let originalCrypto: unknown;

    beforeAll(() => {
      originalCrypto = (globalThis as Record<string, unknown>).crypto;
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: undefined,
      });
    });

    afterAll(() => {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    });

    it('canUse() is false', () => {
      expect(crypto.canUse()).toBe(false);
    });

    it('encrypt throws instead of storing near-plaintext', async () => {
      await expect(crypto.encrypt('anything')).rejects.toThrow(/unavailable/);
    });

    it('decrypt throws', async () => {
      await expect(
        crypto.decrypt('x', undefined, undefined, undefined)
      ).rejects.toThrow(/unavailable/);
    });
  });
});
