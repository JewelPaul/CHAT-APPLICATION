/**
 * Device Identity & Invite Code Management
 *
 * Each device has a stable fingerprint-based identity:
 *   zion_device_id      — SHA-256 fingerprint of device characteristics (never shown)
 *   zion_invite_code    — server-assigned XXXX-XXXX-XXXX code, shown and shared
 *   zion_display_name   — editable display name, stored locally (not server-validated)
 *
 * Legacy keys ('inviteCode', 'displayName', 'username', 'zion_username') are still read
 * for backward-compatibility with existing sessions.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STORAGE_KEY_DEVICE_ID = 'zion_device_id';
const STORAGE_KEY_CODE = 'zion_invite_code';
const STORAGE_KEY_DISPLAY_NAME = 'zion_display_name';
const STORAGE_KEY_USERNAME = 'zion_username';

// Legacy keys kept for migration only
const LEGACY_KEY_CODE = 'inviteCode';
const LEGACY_KEY_DISPLAY_NAME = 'displayName';
const LEGACY_KEY_USERNAME = 'username';

// ============================================================
// Device Fingerprinting
// ============================================================

/**
 * Compute a stable SHA-256 device fingerprint from device characteristics.
 * Returns the first 32 hex characters (128 bits) — enough for uniqueness.
 * Uses only browser-independent system properties so the fingerprint is stable
 * across all browsers on the same physical device (Chrome, Firefox, Safari, etc.).
 * Note: not 100% guaranteed unique for identical machines in the same environment,
 * but sufficient for invite-code assignment in typical use.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  // Deliberately excludes navigator.userAgent which differs per browser.
  // Only system-level properties that are the same in all browsers on a given device.
  const components = [
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(navigator.hardwareConcurrency ?? 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.platform ?? '',
    navigator.language ?? '',
    String(screen.availWidth ?? 0),
    String(screen.availHeight ?? 0),
  ].join('|')

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(components)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    // Use first 32 hex chars (128-bit) — well within server's 64-char limit
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  } catch {
    // Fallback: use stored UUID or generate one
    return getOrCreateLegacyDeviceId()
  }
}

/**
 * Fallback: get or create a random UUID stored in localStorage.
 * Used only when crypto.subtle is unavailable (e.g., non-HTTPS).
 */
function getOrCreateLegacyDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_ID)
    if (stored && stored.length >= 32) return stored
  } catch {
    // ignore
  }
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, id)
  } catch {
    // ignore
  }
  return id
}

/**
 * Get or create the persistent device fingerprint.
 * Cached in localStorage so subsequent calls within the same browser session are synchronous-ready.
 * Returns the cached value if available; otherwise computes and caches.
 */
export async function getOrCreateDeviceFingerprint(): Promise<string> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_DEVICE_ID)
    // Accept 32-char hex fingerprints (new format) or 32-char UUID hex fallback
    if (cached && /^[0-9a-f]{32}$/.test(cached)) {
      return cached
    }
  } catch {
    // ignore
  }

  const fp = await generateDeviceFingerprint()
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, fp)
  } catch {
    // ignore
  }
  return fp
}

/**
 * @deprecated Use getOrCreateDeviceFingerprint() instead.
 * Kept for backward-compatibility with callers using synchronous UUID-based device IDs.
 */
export function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_ID)
    if (stored && stored.length > 0) return stored
  } catch {
    // ignore
  }
  const id = crypto.randomUUID()
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, id)
  } catch {
    // ignore
  }
  return id
}

// ============================================================
// Invite Code
// ============================================================

/**
 * Generate a new cryptographically secure invite code.
 * Format: XXXX-XXXX-XXXX (e.g. K8F2-QP9A-7ZXM) — 14 chars total.
 * Uses rejection sampling to avoid modulo bias.
 */
export function generateInviteCode(): string {
  const n = CHARS.length // 36
  // Threshold below which a byte is accepted (avoids modulo bias)
  const threshold = 256 - (256 % n) // 252

  const pickChar = (): string => {
    const buf = new Uint8Array(8)
    for (;;) {
      window.crypto.getRandomValues(buf)
      for (const b of buf) {
        if (b < threshold) return CHARS[b % n]
      }
    }
  }

  const group = (len: number) => Array.from({ length: len }, pickChar).join('')
  return `${group(4)}-${group(4)}-${group(4)}`
}

/**
 * Get the persistent invite code for this device.
 * Loads from localStorage (new key, then legacy key) if available.
 * Returns an empty string if not yet assigned by the server.
 */
export function getOrCreateInviteCode(): string {
  try {
    // Check new key first
    const stored = localStorage.getItem(STORAGE_KEY_CODE)
    if (stored && isValidInviteCode(stored)) return stored
    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY_CODE)
    if (legacy && isValidInviteCode(legacy)) {
      saveInviteCode(legacy)
      return legacy
    }
  } catch {
    // localStorage not available
  }
  return ''
}

/**
 * Save invite code to localStorage.
 */
export function saveInviteCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CODE, code)
  } catch {
    // ignore
  }
}

/**
 * Validate invite code: accepts new XXXX-XXXX-XXXX format and legacy formats.
 */
export function isValidInviteCode(code: string): boolean {
  if (typeof code !== 'string') return false
  // New canonical format: XXXX-XXXX-XXXX (e.g. K8F2-QP9A-7ZXM)
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return true
  // Legacy server format: ZION-XXXX (e.g. ZION-4832)
  if (/^ZION-[0-9]{4}$/.test(code)) return true
  // Legacy 5+4 alphanumeric format (e.g. JWELL-0291)
  return /^[A-Z0-9]{5}-[A-Z0-9]{4}$/.test(code)
}

// ============================================================
// Display Name  (local-only, not server-validated)
// ============================================================

/**
 * Get the user's display name from localStorage.
 * Falls back to the legacy 'displayName' key, then empty string.
 */
export function getDisplayName(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DISPLAY_NAME)
    if (stored) return stored
    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY_DISPLAY_NAME)
    if (legacy) {
      saveDisplayName(legacy)
      return legacy
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Save display name to localStorage.
 */
export function saveDisplayName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISPLAY_NAME, name)
  } catch {
    // ignore
  }
}

// ============================================================
// Username  (server-validated, kept for internal use)
// ============================================================

/**
 * Get the username stored in localStorage (set after server registration).
 */
export function getStoredUsername(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERNAME)
    if (stored) return stored
    // Migrate from legacy key
    const legacy = localStorage.getItem(LEGACY_KEY_USERNAME)
    if (legacy) {
      saveUsername(legacy)
      return legacy
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Save a username to localStorage.
 */
export function saveUsername(username: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERNAME, username)
  } catch {
    // ignore
  }
}

/**
 * Validate a username against the allowed format.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]{4,40}$/.test(username.trim())
}

// ============================================================
// Clipboard helper
// ============================================================

export async function copyDeviceKeyToClipboard(key: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(key)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = key
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

// ============================================================
// Aliases for backward compatibility
// ============================================================

export function generateDeviceKey(): string {
  return generateInviteCode()
}

export function getDeviceKey(): string {
  return getOrCreateInviteCode()
}

export function isValidDeviceKey(key: string): boolean {
  return isValidInviteCode(key)
}

/** @deprecated Use getDisplayName() instead */
export function getStoredDisplayName(): string {
  return getDisplayName()
}

/** @deprecated Use saveDisplayName() instead */
export function saveStoredDisplayName(name: string): void {
  saveDisplayName(name)
}

