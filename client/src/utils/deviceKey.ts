/**
 * Ephemeral Invite Code Generation
 * Generates temporary 6-character uppercase alphanumeric invite codes.
 * Codes are NOT persisted anywhere — each page load generates a fresh code.
 * Format: 6 uppercase alphanumeric characters (e.g. "A7X9K3")
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random 6-character uppercase alphanumeric invite code
 * Uses Web Crypto API for secure randomness
 */
export function generateInviteCode(): string {
  const array = new Uint8Array(6);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => CHARS[byte % CHARS.length]).join('');
}

/**
 * Generate a device key (alias for generateInviteCode for compatibility)
 */
export function generateDeviceKey(): string {
  return generateInviteCode();
}

/**
 * Get device key — always generates a fresh ephemeral code.
 * No localStorage persistence — data is lost on refresh (by design).
 */
export function getDeviceKey(): string {
  return generateInviteCode();
}

/**
 * Check if this is a first-time user.
 * Always returns true since we never persist state.
 */
export function isFirstTimeUser(): boolean {
  return true;
}

/**
 * Get existing key — always returns null since we never persist.
 */
export function getExistingKey(): string | null {
  return null;
}

/**
 * Validate invite code format: 6 uppercase alphanumeric characters
 */
export function isValidDeviceKey(key: string): boolean {
  return /^[A-Z0-9]{6}$/.test(key);
}

/**
 * Copy invite code to clipboard
 */
export async function copyDeviceKeyToClipboard(key: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(key);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = key;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

