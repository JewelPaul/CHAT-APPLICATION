/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for secure encryption
 * Based on X25519 key exchange and AES-GCM encryption
 */

// Key derivation settings
const PBKDF2_ITERATIONS = 600000; // OWASP 2024 recommendation
const PBKDF2_HASH = 'SHA-256';
const AES_KEY_LENGTH = 256;

/**
 * Generate a new keypair for encryption
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    return {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk)
    };
  } catch (error) {
    console.error('Failed to generate keypair:', error);
    throw new Error('Key generation failed');
  }
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt private key with password
 */
export async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<{ encrypted: string; salt: string; iv: string }> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const derivedKey = await deriveKeyFromPassword(password, salt);

    const encoder = new TextEncoder();
    const privateKeyBuffer = encoder.encode(privateKey);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      derivedKey,
      privateKeyBuffer
    );

    return {
      encrypted: arrayBufferToBase64(encrypted),
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv)
    };
  } catch (error) {
    console.error('Failed to encrypt private key:', error);
    throw new Error('Private key encryption failed');
  }
}

/**
 * Decrypt private key with password
 */
export async function decryptPrivateKey(
  encrypted: string,
  salt: string,
  iv: string,
  password: string
): Promise<string> {
  try {
    const saltBuffer = base64ToArrayBuffer(salt);
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedBuffer = base64ToArrayBuffer(encrypted);

    const derivedKey = await deriveKeyFromPassword(password, new Uint8Array(saltBuffer));

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer)
      },
      derivedKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw new Error('Invalid password or corrupted key');
  }
}

/**
 * Derive shared secret from keypair
 */
async function deriveSharedSecret(
  privateKeyJwk: string,
  publicKeyJwk: string
): Promise<CryptoKey> {
  try {
    const privateKey = await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(privateKeyJwk),
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      ['deriveKey', 'deriveBits']
    );

    const publicKey = await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(publicKeyJwk),
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Failed to derive shared secret:', error);
    throw new Error('Key derivation failed');
  }
}

/**
 * Encrypt message content
 */
export async function encryptMessage(
  content: string,
  myPrivateKey: string,
  theirPublicKey: string
): Promise<{ encrypted: string; iv: string }> {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const sharedKey = await deriveSharedSecret(myPrivateKey, theirPublicKey);

    const encoder = new TextEncoder();
    const contentBuffer = encoder.encode(content);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      sharedKey,
      contentBuffer
    );

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv)
    };
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    throw new Error('Message encryption failed');
  }
}

/**
 * Decrypt message content
 */
export async function decryptMessage(
  encrypted: string,
  iv: string,
  myPrivateKey: string,
  theirPublicKey: string
): Promise<string> {
  try {
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedBuffer = base64ToArrayBuffer(encrypted);
    const sharedKey = await deriveSharedSecret(myPrivateKey, theirPublicKey);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer)
      },
      sharedKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    throw new Error('Message decryption failed');
  }
}

/**
 * Generate random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash data using SHA-256
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Verify encryption is supported
 */
export function isCryptoSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}
