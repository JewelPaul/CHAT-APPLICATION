/**
 * Device Identity & Invite Code Management
 *
 * Each device has a stable identity stored in localStorage:
 *   zion_device_id  — internal UUID, never shown to users, never changes
 *   zion_invite_code — server-assigned ZION-XXXX code, shown and shared with others
 *   zion_username   — editable display name (unique, server-validated)
 *
 * Legacy keys ('inviteCode', 'displayName', 'username') are still read for
 * backward-compatibility with existing sessions.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STORAGE_KEY_DEVICE_ID = 'zion_device_id';
const STORAGE_KEY_CODE = 'zion_invite_code';
// Legacy displayName key: kept as-is (not prefixed) for backward compatibility
// with existing localStorage entries created before the 'zion_' naming convention.
const STORAGE_KEY_NAME = 'displayName';
const STORAGE_KEY_USERNAME = 'zion_username';

// Legacy keys kept for migration only
const LEGACY_KEY_CODE = 'inviteCode';
const LEGACY_KEY_USERNAME = 'username';

/**
 * Get or create the permanent internal device ID (UUID).
 * This is the stable identifier sent to the server for registration.
 * It is stored under 'zion_device_id' and never shown to users.
 */
export function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (stored && stored.length > 0) {
      return stored;
    }
  } catch {
    // localStorage not available — fall through to generate
  }
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
  } catch {
    // Ignore storage errors
  }
  return id;
}

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
 * Loads from localStorage (new key, then legacy key) if available.
 * Returns an empty string if not yet assigned by the server.
 */
export function getOrCreateInviteCode(): string {
  try {
    // Check new key first
    const stored = localStorage.getItem(STORAGE_KEY_CODE);
    if (stored && isValidInviteCode(stored)) {
      return stored;
    }
    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY_CODE);
    if (legacy && isValidInviteCode(legacy)) {
      saveInviteCode(legacy);
      return legacy;
    }
  } catch {
    // localStorage not available
  }
  return '';
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
 * Reads from new key first, then migrates from the legacy 'username' key.
 */
export function getStoredUsername(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (stored) return stored;
    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY_USERNAME);
    if (legacy) {
      saveUsername(legacy);
      return legacy;
    }
    return '';
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

