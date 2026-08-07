import { isFunction, isNil } from 'lodash-es';

const AES_GCM = 'AES-GCM';
const FORMAT_JWK = 'jwk';
const PBKDF2 = 'PBKDF2';
const HASH = 'SHA-256';

/** PBKDF2 iteration count — high enough to slow offline brute-force. */
const PBKDF2_ITERATIONS = 120_000;

/**
 * Application-scoped secret used to derive the encryption key.
 *
 * IMPORTANT: Without a user-supplied master password there is no way to achieve
 * true on-disk secrecy — this constant is bundled into the plugin and therefore
 * recoverable by anyone who can read the local files. The scheme below is
 * defense-in-depth (best-effort obfuscation), NOT a substitute for OS-level
 * credential storage. We still avoid the two worst practices of the old code:
 *   1. storing the raw AES key next to the ciphertext (we store only a random salt);
 *   2. silently falling back to a trivially reversible string obfuscation.
 */
const APP_SECRET = 'obsidian-wordpress-publisher::v2::credential-derivation';

/** On-disk representation of an encrypted secret. */
export interface EncryptedPayload {
  /** Base64 ciphertext. */
  encrypted: string;
  /** Base64 AES-GCM initialization vector. */
  vector?: string;
  /** Legacy format only: exported JWK key stored next to the ciphertext. */
  key?: string;
  /** New format: Base64 PBKDF2 salt used to derive the key at decrypt time. */
  salt?: string;
}

export class PassCrypto {

  /**
   * Whether the Web Crypto API is available in the current runtime.
   * Obsidian's Electron environment always provides `crypto.subtle`.
   */
  canUse(): boolean {
    return !isNil(crypto)
      && !isNil(crypto.subtle)
      && isFunction(crypto.getRandomValues)
      && isFunction(crypto.subtle.generateKey)
      && isFunction(crypto.subtle.encrypt)
      && isFunction(crypto.subtle.decrypt)
      && isFunction(crypto.subtle.importKey)
      && isFunction(crypto.subtle.exportKey);
  }

  /**
   * Encrypt a secret using AES-256-GCM with a key derived from {@link APP_SECRET}
   * via PBKDF2 and a random per-call salt. The derived key is never persisted —
   * only the salt is stored — so the ciphertext cannot be opened without the
   * (bundled) application secret.
   *
   * @throws if the Web Crypto API is unavailable. Credentials must never be
   *         stored in a reversible plaintext form, so we refuse instead of
   *         falling back to obfuscation.
   */
  async encrypt(message: string): Promise<EncryptedPayload> {
    if (!this.canUse()) {
      throw new Error('Web Crypto API (crypto.subtle) is unavailable; credentials cannot be encrypted.');
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(APP_SECRET, salt);
    const vector = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: AES_GCM, iv: vector },
      key,
      new TextEncoder().encode(message)
    );

    return {
      encrypted: this.bufferToBase64(encrypted),
      vector: this.bufferToBase64(vector),
      salt: this.bufferToBase64(salt),
    };
  }

  /**
   * Decrypt a secret produced by {@link encrypt} (new salt-based format) or by
   * older plugin versions (legacy JWK `key` format).
   *
   * @throws if the Web Crypto API is unavailable, the payload is malformed, or
   *         neither a legacy `key` nor a new `salt` is present.
   */
  async decrypt(encrypted: string, key?: string, vector?: string, salt?: string): Promise<string> {
    if (!this.canUse()) {
      throw new Error('Web Crypto API (crypto.subtle) is unavailable; credentials cannot be decrypted.');
    }

    // Legacy format: a raw JWK key was stored alongside the ciphertext.
    if (key && vector) {
      let keyObject: JsonWebKey;
      try {
        keyObject = JSON.parse(key);
      } catch {
        throw new Error('Decryption failed: stored key is corrupted');
      }
      const importedKey = await crypto.subtle.importKey(FORMAT_JWK, keyObject, {
          name: AES_GCM
        },
        false,
        [ 'encrypt', 'decrypt' ]);
      const decrypted = await crypto.subtle.decrypt({
          name: AES_GCM,
          iv: this.base64ToBuffer(vector)
        },
        importedKey,
        this.base64ToBuffer(encrypted));
      return new TextDecoder().decode(decrypted);
    }

    // New format: derive the key from the application secret + stored salt.
    if (salt && vector) {
      const keyObject = await this.deriveKey(APP_SECRET, this.base64ToBuffer(salt));
      const decrypted = await crypto.subtle.decrypt({
          name: AES_GCM,
          iv: this.base64ToBuffer(vector)
        },
        keyObject,
        this.base64ToBuffer(encrypted));
      return new TextDecoder().decode(decrypted);
    }

    throw new Error('Decryption failed: missing key/vector (legacy) or salt/vector (current)');
  }

  /**
   * Derive a 256-bit AES-GCM key from a passphrase using PBKDF2.
   */
  private async deriveKey(passphrase: string, salt: Uint8Array | ArrayBuffer): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: PBKDF2 },
      false,
      [ 'deriveKey' ]
    );
    return crypto.subtle.deriveKey(
      {
        name: PBKDF2,
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: HASH
      },
      baseKey,
      { name: AES_GCM, length: 256 },
      false,
      [ 'encrypt', 'decrypt' ]
    );
  }

  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    // Chunk to avoid call-stack overflow on large inputs.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

}
