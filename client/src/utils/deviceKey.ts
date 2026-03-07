/**
 * Invite Code Generation & Persistence
 * Format: XXXXX-XXXX — 5 uppercase alphanum, dash, 4 uppercase alphanum (e.g. JWELL-0291)
 * Persists ONLY inviteCode, displayName, and username in localStorage. No messages, no chat history.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STORAGE_KEY_CODE = 'inviteCode';
const STORAGE_KEY_NAME = 'displayName';
const STORAGE_KEY_USERNAME = 'username';

/**
 * Generate a new 10-character dash-separated invite code using Web Crypto API.
 * Format: XXXXX-XXXX (e.g. JWELL-0291)
 */
export function generateInviteCode(): string {
  const part1 = new Uint8Array(5);
  const part2 = new Uint8Array(4);
  window.crypto.getRandomValues(part1);
  window.crypto.getRandomValues(part2);
  const left = Array.from(part1, byte => CHARS[byte % CHARS.length]).join('');
  const right = Array.from(part2, byte => CHARS[byte % CHARS.length]).join('');
  return `${left}-${right}`;
}

/**
 * Get the persistent invite code for this device.
 * Loads from localStorage if available; generates and saves a new one otherwise.
 */
export function getOrCreateInviteCode(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CODE);
    if (stored && isValidInviteCode(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available — fall through to generate
  }
  const code = generateInviteCode();
  saveInviteCode(code);
  return code;
}

/**
 * Save invite code to localStorage (only inviteCode — never messages or history)
 */
export function saveInviteCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CODE, code);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get display name from localStorage, or return empty string.
 */
export function getDisplayName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_NAME) || '';
  } catch {
    return '';
  }
}

/**
 * Save display name to localStorage.
 */
export function saveDisplayName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_NAME, name);
  } catch {
    // Ignore
  }
}

/**
 * Validate invite code: server-generated ZION-XXXX or legacy XXXXX-XXXX format.
 * ZION-XXXX is the current canonical format (e.g. ZION-4832).
 * The legacy 5+4 alphanumeric format is accepted for backward compatibility.
 */
export function isValidInviteCode(code: string): boolean {
  // Current format: ZION-XXXX (e.g. ZION-4832)
  if (/^ZION-[0-9]{4}$/.test(code)) return true;
  // Legacy format: XXXXX-XXXX (e.g. JWELL-0291)
  return /^[A-Z0-9]{5}-[A-Z0-9]{4}$/.test(code);
}

/**
 * Generate a device key (alias for generateInviteCode for compatibility)
 */
export function generateDeviceKey(): string {
  return generateInviteCode();
}

/**
 * Get device key — returns persistent invite code.
 */
export function getDeviceKey(): string {
  return getOrCreateInviteCode();
}

/**
 * Validate invite code format (alias)
 */
export function isValidDeviceKey(key: string): boolean {
  return isValidInviteCode(key);
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

/**
 * Get the username stored in localStorage (set after server registration).
 */
export function getStoredUsername(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_USERNAME) || '';
  } catch {
    return '';
  }
}

/**
 * Save a username to localStorage.
 */
export function saveUsername(username: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERNAME, username);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Validate a username against the allowed format.
 * Rules: 4-40 characters, only letters, numbers, underscores, hyphens, periods.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]{4,40}$/.test(username.trim());
}

