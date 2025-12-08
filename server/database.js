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
    `;

    this.db.exec(schema);
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

    if (fields.length === 0) return;

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
}

module.exports = ChatDatabase;
