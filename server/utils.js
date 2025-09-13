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
  
  return message.trim().length > 0 && message.length <= 10000;
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
  validateUserCode,
  validateMessage,
  Logger
};