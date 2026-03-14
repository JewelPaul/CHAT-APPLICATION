/**
 * Database module for permanent user storage
 * Uses SQLite for user registry and friendship management
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { Logger } = require('./utils');

const logger = new Logger(process.env.LOG_LEVEL || 'info');

class ChatDatabase {
  constructor(dbPath = './data/chatwave.db') {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('Created data directory', { path: dataDir });
    }

    this.db = new Database(dbPath, { 
      verbose: process.env.LOG_LEVEL === 'debug' ? console.log : null 
    });
    
    // Enable WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL');
    
    logger.info('Database initialized', { path: dbPath });
    this.initializeTables();
  }

  /**
   * Initialize database schema
   */
  initializeTables() {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        public_key TEXT NOT NULL,
        avatar_url TEXT,
        status TEXT DEFAULT 'offline',
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Friendships table
      CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        addressee_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(requester_id, addressee_id)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

      -- Sessions table for JWT token management (optional)
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

      -- Device usernames table: maps device keys to persistent unique usernames
      CREATE TABLE IF NOT EXISTS device_usernames (
        device_key TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_device_usernames_username ON device_usernames(username);
    `;

    this.db.exec(schema);

    // Migration: add invite_code column if it does not yet exist
    try {
      this.db.exec('ALTER TABLE device_usernames ADD COLUMN invite_code TEXT');
    } catch {
      // Column already exists — safe to ignore
    }
    // Unique partial index for invite_code (NULL values are not indexed)
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_device_usernames_invite_code ON device_usernames(invite_code) WHERE invite_code IS NOT NULL'
    );

    logger.info('Database schema initialized');
  }

  /**
   * User operations
   */

  createUser(userData) {
    const { id, username, displayName, email, passwordHash, publicKey, avatarUrl } = userData;
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, display_name, email, password_hash, public_key, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(id, username, displayName, email || null, passwordHash, publicKey, avatarUrl || null);
      logger.info('User created', { username, id });
      return this.getUserById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  getUserById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  updateUserStatus(userId, status, lastSeen = new Date()) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET status = ?, last_seen = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(status, lastSeen.toISOString(), userId);
  }

  updateUserProfile(userId, updates) {
    const allowedFields = ['display_name', 'email', 'avatar_url'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {return;}

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  searchUsers(query, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT id, username, display_name, avatar_url, status, last_seen
      FROM users 
      WHERE username LIKE ? OR display_name LIKE ?
      LIMIT ?
    `);
    return stmt.all(`%${query}%`, `%${query}%`, limit);
  }

  searchUsersByUsername(query, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT id, username, display_name, avatar_url, status, last_seen
      FROM users 
      WHERE LOWER(username) LIKE LOWER(?)
      ORDER BY username
      LIMIT ?
    `);
    return stmt.all(`%${query}%`, limit);
  }

  /**
   * Friendship operations
   */

  createFriendRequest(requesterId, addresseeId, requestId) {
    const stmt = this.db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'pending')
    `);
    
    try {
      stmt.run(requestId, requesterId, addresseeId);
      logger.info('Friend request created', { requesterId, addresseeId });
      return this.getFriendship(requestId);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Friend request already exists');
      }
      throw error;
    }
  }

  getFriendship(id) {
    const stmt = this.db.prepare('SELECT * FROM friendships WHERE id = ?');
    return stmt.get(id);
  }

  updateFriendshipStatus(friendshipId, status) {
    const stmt = this.db.prepare(`
      UPDATE friendships 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(status, friendshipId);
  }

  getFriends(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar_url, u.status, u.last_seen,
        f.id as friendship_id, f.created_at as friends_since
      FROM friendships f
      JOIN users u ON (
        (f.requester_id = ? AND f.addressee_id = u.id) OR
        (f.addressee_id = ? AND f.requester_id = u.id)
      )
      WHERE f.status = 'accepted'
      ORDER BY u.status DESC, u.last_seen DESC
    `);
    return stmt.all(userId, userId);
  }

  getPendingFriendRequests(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar_url,
        f.id as request_id, f.created_at as requested_at
      FROM friendships f
      JOIN users u ON f.requester_id = u.id
      WHERE f.addressee_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `);
    return stmt.all(userId);
  }

  getSentFriendRequests(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar_url,
        f.id as request_id, f.created_at as requested_at
      FROM friendships f
      JOIN users u ON f.addressee_id = u.id
      WHERE f.requester_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `);
    return stmt.all(userId);
  }

  checkFriendship(userId1, userId2) {
    const stmt = this.db.prepare(`
      SELECT * FROM friendships
      WHERE ((requester_id = ? AND addressee_id = ?) OR 
             (requester_id = ? AND addressee_id = ?))
      LIMIT 1
    `);
    return stmt.get(userId1, userId2, userId2, userId1);
  }

  deleteFriendship(friendshipId) {
    const stmt = this.db.prepare('DELETE FROM friendships WHERE id = ?');
    stmt.run(friendshipId);
  }

  /**
   * Session operations
   */

  createSession(sessionId, userId, token, expiresAt) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(sessionId, userId, token, expiresAt.toISOString());
  }

  getSessionByToken(token) {
    const stmt = this.db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar_url
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `);
    return stmt.get(token);
  }

  deleteSession(sessionId) {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
  }

  deleteExpiredSessions() {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')");
    const result = stmt.run();
    if (result.changes > 0) {
      logger.debug('Deleted expired sessions', { count: result.changes });
    }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
    logger.info('Database connection closed');
  }

  // ============================================================
  // Device Username operations (persistent username per device)
  // ============================================================

  /**
   * Get username for a device key. Returns null if not set.
   */
  getUsernameByDeviceKey(deviceKey) {
    const stmt = this.db.prepare('SELECT username FROM device_usernames WHERE device_key = ?');
    const row = stmt.get(deviceKey);
    return row ? row.username : null;
  }

  /**
   * Check if a username is available (not taken by any other device key).
   * If excludeDeviceKey is provided, that device's own current username is excluded from the check.
   */
  isUsernameAvailable(username, excludeDeviceKey = null) {
    let stmt;
    if (excludeDeviceKey) {
      stmt = this.db.prepare(
        'SELECT 1 FROM device_usernames WHERE LOWER(username) = LOWER(?) AND device_key != ?'
      );
      const row = stmt.get(username, excludeDeviceKey);
      return !row;
    } else {
      stmt = this.db.prepare('SELECT 1 FROM device_usernames WHERE LOWER(username) = LOWER(?)');
      const row = stmt.get(username);
      return !row;
    }
  }

  /**
   * Assign or update the username for a device key.
   * Throws an error if the username is already taken by another device.
   */
  setUsernameForDeviceKey(deviceKey, username) {
    const stmt = this.db.prepare(`
      INSERT INTO device_usernames (device_key, username, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(device_key) DO UPDATE SET
        username = excluded.username,
        updated_at = CURRENT_TIMESTAMP
    `);
    try {
      stmt.run(deviceKey, username);
      logger.info('Username assigned', { deviceKey, username });
      return username;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username already taken');
      }
      throw error;
    }
  }

  // ============================================================
  // Invite Code operations (permanent ZION-XXXX per device)
  // ============================================================

  /**
   * Get the invite code assigned to a device key. Returns null if not set.
   */
  getInviteCodeByDeviceKey(deviceKey) {
    const stmt = this.db.prepare('SELECT invite_code FROM device_usernames WHERE device_key = ?');
    const row = stmt.get(deviceKey);
    return row ? row.invite_code : null;
  }

  /**
   * Get the device key that owns the given invite code. Returns null if not found.
   */
  getDeviceKeyByInviteCode(inviteCode) {
    const stmt = this.db.prepare('SELECT device_key FROM device_usernames WHERE invite_code = ?');
    const row = stmt.get(inviteCode);
    return row ? row.device_key : null;
  }

  /**
   * Check whether an invite code is available (not taken by any device).
   */
  isInviteCodeAvailable(inviteCode) {
    const stmt = this.db.prepare('SELECT 1 FROM device_usernames WHERE invite_code = ?');
    const row = stmt.get(inviteCode);
    return !row;
  }

  /**
   * Generate a unique invite code in XXXX-XXXX-XXXX format and permanently assign it to
   * the device key.  Uses cryptographically random uppercase alphanumeric characters.
   * The device key row must already exist (i.e. a username must have been assigned first).
   * Retries up to 30 times to avoid collisions.
   */
  generateAndAssignInviteCode(deviceKey) {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const n = CHARS.length; // 36
    // Rejection-sampling threshold to avoid modulo bias (256 % 36 = 4 → reject bytes >= 252)
    const threshold = 256 - (256 % n); // 252
    const maxAttempts = 30;

    const generateCode = () => {
      const chars = [];
      const crypto = require('crypto');
      while (chars.length < 12) {
        const remaining = 12 - chars.length;
        // Request extra bytes to account for rejection (about 4/256 ≈ 1.5% rejection rate)
        const buf = crypto.randomBytes(remaining * 2);
        for (const b of buf) {
          if (chars.length >= 12) break;
          if (b < threshold) chars.push(CHARS[b % n]);
        }
      }
      return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
    };

    for (let i = 0; i < maxAttempts; i++) {
      const candidate = generateCode();

      if (this.isInviteCodeAvailable(candidate)) {
        const stmt = this.db.prepare(
          'UPDATE device_usernames SET invite_code = ?, updated_at = CURRENT_TIMESTAMP WHERE device_key = ?'
        );
        try {
          stmt.run(candidate, deviceKey);
          logger.info('Invite code assigned', { deviceKey, inviteCode: candidate });
          return candidate;
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            // Race condition — another process took this code; retry
            continue;
          }
          throw error;
        }
      }
    }

    // Fallback: use timestamp-based suffix (should never happen in practice)
    const ts = String(Date.now());
    const fallback = `${ts.slice(-4).toUpperCase()}-${ts.slice(-8, -4).toUpperCase()}-ZION`;
    const stmt = this.db.prepare(
      'UPDATE device_usernames SET invite_code = ?, updated_at = CURRENT_TIMESTAMP WHERE device_key = ?'
    );
    stmt.run(fallback, deviceKey);
    logger.warn('Invite code fallback used', { deviceKey, inviteCode: fallback });
    return fallback;
  }

  /**
   * Generate a unique random username and assign it to the device key.
   * Tries multiple candidates until a unique one is found.
   */
  generateAndAssignUsername(deviceKey) {
    const prefixes = ['guest', 'user', 'zionUser', 'zion'];
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      const candidate = `${prefix}${suffix}`;

      if (this.isUsernameAvailable(candidate)) {
        return this.setUsernameForDeviceKey(deviceKey, candidate);
      }
    }

    // Fallback: use a longer unique suffix
    const fallback = `user${Date.now().toString().slice(-8)}`;
    return this.setUsernameForDeviceKey(deviceKey, fallback);
  }
}

module.exports = ChatDatabase;
