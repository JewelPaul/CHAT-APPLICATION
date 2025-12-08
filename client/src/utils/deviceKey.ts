/**
 * Device Key Generation and Management
 * Generates permanent device-specific keys for ChatWave users
 * Format: CW-XXXX-XXXX-XXXX
 */

const STORAGE_KEY = 'chatwave_device_key';
const KEY_PREFIX = 'CW';

/**
 * Generate a random 4-character alphanumeric segment
 * Excludes confusing characters: I, O, 0, 1
 */
function generateSegment(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
  let segment = '';
  for (let i = 0; i < 4; i++) {
    segment += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return segment;
}

/**
 * Generate a full device key in format: CW-XXXX-XXXX-XXXX
 * Example: CW-A7X9-K3M2-P5N8
 */
export function generateDeviceKey(): string {
  return `${KEY_PREFIX}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

/**
 * Get or create device key
 * If a key doesn't exist, generates and stores one
 */
export function getDeviceKey(): string {
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = generateDeviceKey();
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

/**
 * Check if this is a first-time user (no key exists)
 */
export function isFirstTimeUser(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

/**
 * Get existing key (returns null if none exists)
 */
export function getExistingKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Validate device key format
 * Returns true if key matches CW-XXXX-XXXX-XXXX pattern
 */
export function isValidDeviceKey(key: string): boolean {
  const pattern = /^CW-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
  return pattern.test(key);
}

/**
 * Copy device key to clipboard
 * Returns a promise that resolves when copied
 */
export async function copyDeviceKeyToClipboard(key: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(key);
  } else {
    // Fallback for older browsers
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
