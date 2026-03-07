/**
 * Security and utility functions for ChatWave
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized output
 */
function sanitizeMessage(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate user code format
 * @param {any} code - User provided code
 * @returns {boolean} - True if valid
 */
function validateUserCode(code) {
  if (typeof code !== 'string') {
    return false;
  }
  
  const trimmed = code.trim();
  // Accept server-generated invite code format: ZION-XXXX (e.g. ZION-4832)
  if (/^ZION-[0-9]{4}$/.test(trimmed)) {
    return true;
  }
  // Accept new 10-char dash-separated format: XXXXX-XXXX (e.g. JWELL-0291)
  if (/^[A-Z0-9]{5}-[A-Z0-9]{4}$/.test(trimmed)) {
    return true;
  }
  // Accept legacy 6-char uppercase alphanumeric invite codes
  if (/^[A-Z0-9]{6}$/.test(trimmed)) {
    return true;
  }
  // Also accept general alphanumeric identifiers (3–50 chars) for compatibility
  return trimmed.length >= 3 && trimmed.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Validate message content
 * @param {any} message - Message content
 * @returns {boolean} - True if valid
 */
function validateMessage(message) {
  if (typeof message !== 'string') {
    return false;
  }
  
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 2048; // 2KB limit
}

/**
 * Sanitize filename to prevent directory traversal and XSS
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return 'unnamed_file';
  }
  
  // Remove directory traversal attempts
  let safe = filename.replace(/\.\./g, '');
  safe = safe.replace(/[/\\]/g, '');
  
  // Remove special characters that could cause issues
  safe = safe.replace(/[<>:"|?*]/g, '');
  
  // Limit length
  if (safe.length > 255) {
    const parts = safe.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const name = parts.join('.');
    
    if (ext) {
      const maxNameLength = 250 - ext.length - 1; // -1 for the dot
      safe = `${name.substring(0, maxNameLength)}.${ext}`;
    } else {
      safe = safe.substring(0, 255);
    }
  }
  
  return safe || 'unnamed_file';
}

/**
 * Calculate base64 decoded size in bytes
 * @param {string} base64String - Base64 encoded string
 * @returns {number} - Size in bytes
 */
function calculateBase64Size(base64String) {
  return Math.ceil((base64String.length * 3) / 4);
}

/**
 * Validate media file upload
 * @param {Object} fileData - File data object
 * @returns {Object} - { valid: boolean, error?: string, size?: number }
 */
function validateMediaUpload(fileData) {
  const { mediaData, filename, mimeType } = fileData;
  
  // Validate presence of required fields
  if (!mediaData || !filename || !mimeType) {
    return { valid: false, error: 'Missing required file data' };
  }
  
  // Strict MIME type whitelist — no generic files, no documents
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/webm'
  ];
  
  if (!allowedMimeTypes.includes(mimeType)) {
    return { valid: false, error: `File type "${mimeType}" is not allowed. Only images (JPEG/PNG/WebP/GIF), videos (MP4/WebM), and voice messages (audio/webm) are supported.` };
  }
  
  // Size limits based on type
  const maxSizes = {
    image: 3 * 1024 * 1024,   // 3MB for images
    video: 8 * 1024 * 1024,   // 8MB for short videos
    audio: 8 * 1024 * 1024    // 8MB for voice messages
  };
  
  let maxSize = maxSizes.image; // Default to most restrictive
  if (mimeType.startsWith('video/')) {
    maxSize = maxSizes.video;
  } else if (mimeType.startsWith('audio/')) {
    maxSize = maxSizes.audio;
  }

  // Calculate approximate decoded size from base64 payload
  const sizeInBytes = calculateBase64Size(mediaData);
  
  if (sizeInBytes > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit for ${mimeType}` };
  }
  
  // Validate filename
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }
  
  return { valid: true, size: sizeInBytes };
}

/**
 * Structured logger with different levels
 */
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.level = this.levels[level] || 2;
  }

  error(message, meta = {}) {
    if (this.level >= 0) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.level >= 1) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    }
  }

  info(message, meta = {}) {
    if (this.level >= 2) {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.level >= 3) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  }
}

module.exports = {
  sanitizeMessage,
  sanitizeFilename,
  validateUserCode,
  validateMessage,
  validateMediaUpload,
  calculateBase64Size,
  Logger
};