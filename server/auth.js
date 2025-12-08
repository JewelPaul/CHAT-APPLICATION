/**
 * Authentication utilities for user management
 * Handles password hashing, JWT tokens, and user validation
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'chatwave-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Validate username format
 * - Must start with @ (like Twitter)
 * - 3-20 characters after @
 * - Only alphanumeric, underscore, hyphen
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  // Remove @ if present for validation
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return { valid: false, error: 'Username must be 3-20 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscore, and hyphen' };
  }

  return { valid: true, username: `@${cleanUsername}` };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email) {
    return { valid: true }; // Email is optional
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Invalid email format' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate display name
 */
function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, error: 'Display name is required' };
  }

  const trimmed = displayName.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { valid: false, error: 'Display name must be 1-50 characters' };
  }

  return { valid: true, displayName: trimmed };
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return uuidv4();
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return uuidv4();
}

/**
 * Generate unique friendship request ID
 */
function generateFriendshipId() {
  return uuidv4();
}

/**
 * Sanitize user data for sending to client
 */
function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName,
    email: user.email,
    avatarUrl: user.avatar_url || user.avatarUrl,
    status: user.status,
    lastSeen: user.last_seen || user.lastSeen,
    createdAt: user.created_at || user.createdAt
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validateUsername,
  validatePassword,
  validateEmail,
  validateDisplayName,
  generateUserId,
  generateSessionId,
  generateFriendshipId,
  sanitizeUser
};
