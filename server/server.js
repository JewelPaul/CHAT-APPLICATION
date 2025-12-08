/**
 * ChatWave Permanent Chat Server
 * Professional permanent chat application with local storage
 * Server handles user registry and real-time message relay only
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { sanitizeMessage, sanitizeFilename, validateUserCode, validateMessage, validateMediaUpload, calculateBase64Size, Logger } = require('./utils');
const { version } = require('../package.json');
const ChatDatabase = require('./database');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validateUsername,
  validatePassword,
  validateEmail,
  validateDisplayName,
  generateUserId,
  generateFriendshipId,
  sanitizeUser
} = require('./auth');

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    },
  },
}));

// Compression middleware
app.use(compression());

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip,
      path: req.path 
    });
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});

// Rate limiting for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Initialize database
const db = new ChatDatabase();

const server = http.createServer(app);

// Configure Socket.IO with improved error handling
const io = new Server(server, {
    cors: {
        origin: process.env.ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files from client build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// ============================================
// REST API ENDPOINTS (Authentication & Users)
// ============================================

/**
 * Register new user
 */
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, displayName, email, password, publicKey, avatarUrl } = req.body;

    // Validate inputs
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.valid) {
      return res.status(400).json({ error: displayNameValidation.error });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ error: 'Public key is required' });
    }

    // Check if username already exists
    const existingUser = db.getUserByUsername(usernameValidation.username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = generateUserId();
    const user = db.createUser({
      id: userId,
      username: usernameValidation.username,
      displayName: displayNameValidation.displayName,
      email: email || null,
      passwordHash,
      publicKey,
      avatarUrl: avatarUrl || null
    });

    // Generate JWT token
    const token = generateToken(user);

    logger.info('User registered', { userId, username: user.username });

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Login user
 */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Get user
    const user = db.getUserByUsername(usernameValidation.username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update user status
    db.updateUserStatus(user.id, 'online', new Date());

    logger.info('User logged in', { userId: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Verify token and get user info
 */
app.get('/api/auth/me', apiLimiter, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Token verification error', { error: error.message });
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Search users by username
 */
app.get('/api/users/search', apiLimiter, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = db.searchUsers(q, 20);
    const sanitized = results
      .filter(user => user.id !== decoded.id) // Exclude current user
      .map(sanitizeUser);

    res.json({
      success: true,
      users: sanitized
    });
  } catch (error) {
    logger.error('Search error', { error: error.message });
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Get user friends/contacts
 */
app.get('/api/friends', apiLimiter, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const friends = db.getFriends(decoded.id);
    const sanitized = friends.map(friend => ({
      ...sanitizeUser(friend),
      friendshipId: friend.friendship_id,
      friendsSince: friend.friends_since
    }));

    res.json({
      success: true,
      friends: sanitized
    });
  } catch (error) {
    logger.error('Get friends error', { error: error.message });
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

/**
 * Send friend request
 */
app.post('/api/friends/request', apiLimiter, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const targetUser = db.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends or request exists
    const existing = db.checkFriendship(decoded.id, userId);
    if (existing) {
      return res.status(409).json({ error: 'Friend request already exists' });
    }

    // Create friend request
    const requestId = generateFriendshipId();
    const friendship = db.createFriendRequest(decoded.id, userId, requestId);

    logger.info('Friend request created', { from: decoded.id, to: userId });

    res.json({
      success: true,
      request: friendship
    });
  } catch (error) {
    logger.error('Friend request error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Respond to friend request
 */
app.post('/api/friends/respond', apiLimiter, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { requestId, accept } = req.body;
    if (!requestId || typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Request ID and accept flag are required' });
    }

    // Get friendship
    const friendship = db.getFriendship(requestId);
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Verify user is the addressee
    if (friendship.addressee_id !== decoded.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update status
    const newStatus = accept ? 'accepted' : 'rejected';
    db.updateFriendshipStatus(requestId, newStatus);

    logger.info('Friend request responded', { requestId, status: newStatus });

    res.json({
      success: true,
      status: newStatus
    });
  } catch (error) {
    logger.error('Friend response error', { error: error.message });
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// EPHEMERAL IN-MEMORY STORAGE FOR ACTIVE SESSIONS
// Map of userId -> { socketId, status, lastSeen }
const onlineUsers = new Map();

// Map of socketId -> userId (for cleanup on disconnect)
const sockets = new Map();

// Map of roomId -> { user1, user2, createdAt }
// Note: Messages are now stored in IndexedDB client-side, server only relays
const chatRooms = new Map();

// Legacy support: Map of userCode -> user data (for old ephemeral mode)
const users = new Map();

// Map of userId -> Set of pending invites
const pendingInvites = new Map();

// In-memory media storage (files never written to disk)
const mediaStorage = new Map(); // mediaId -> { data, type, filename, size, timestamp }

// Rate limiting for media uploads (max 5 uploads per minute per user)
const uploadRateLimit = new Map(); // userCode -> { count, resetTime }
const UPLOAD_RATE_LIMIT = 5;
const UPLOAD_RATE_WINDOW = 60000; // 1 minute

/**
 * Check and update rate limit for uploads
 */
function checkUploadRateLimit(userCode) {
    const now = Date.now();
    const userLimit = uploadRateLimit.get(userCode);
    
    if (!userLimit || now > userLimit.resetTime) {
        // Reset or create new limit
        uploadRateLimit.set(userCode, {
            count: 1,
            resetTime: now + UPLOAD_RATE_WINDOW
        });
        return true;
    }
    
    if (userLimit.count >= UPLOAD_RATE_LIMIT) {
        return false;
    }
    
    userLimit.count++;
    return true;
}

/**
 * Generate unique room ID for two users
 */
function generateRoomId(user1, user2) {
    return [user1, user2].sort().join('-');
}

/**
 * Clean up user data on disconnect
 */
function cleanupUser(socketId) {
    const userCode = sockets.get(socketId);
    if (userCode) {
        logger.info('Cleaning up user', { userCode, socketId });
        
        // Remove from users map
        users.delete(userCode);
        sockets.delete(socketId);
        
        // Clean up pending invites
        pendingInvites.delete(userCode);
        
        // Clean up rate limiting
        uploadRateLimit.delete(userCode);
        
        // Clean up chat rooms where this user participated
        for (const [roomId, room] of chatRooms.entries()) {
            if (room.user1 === userCode || room.user2 === userCode) {
                // Notify the other user
                const otherUser = room.user1 === userCode ? room.user2 : room.user1;
                const otherUserData = users.get(otherUser);
                if (otherUserData) {
                    io.to(otherUserData.socketId).emit('user-disconnected', { userCode });
                }
                
                // Remove room and associated media
                for (const message of room.messages) {
                    if (message.type === 'media' && message.mediaId) {
                        mediaStorage.delete(message.mediaId);
                    }
                }
                chatRooms.delete(roomId);
                logger.debug('Removed chat room', { roomId, userCode });
            }
        }
    }
}

io.on('connection', (socket) => {
    logger.info('New socket connected', { socketId: socket.id });

    // Error handling for socket
    socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message });
    });

    // ============================================
    // AUTHENTICATED USER CONNECTION
    // ============================================
    
    /**
     * Authenticate socket connection with JWT token
     */
    socket.on('authenticate', (data) => {
        try {
            const { token } = data;
            if (!token) {
                socket.emit('auth-error', { error: 'Token required' });
                return;
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                socket.emit('auth-error', { error: 'Invalid token' });
                return;
            }

            const user = db.getUserById(decoded.id);
            if (!user) {
                socket.emit('auth-error', { error: 'User not found' });
                return;
            }

            // Register authenticated user
            onlineUsers.set(user.id, {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                status: 'online'
            });

            sockets.set(socket.id, user.id);

            // Update user status in database
            db.updateUserStatus(user.id, 'online', new Date());

            // Get user's friends and notify them
            const friends = db.getFriends(user.id);
            friends.forEach(friend => {
                const friendSocket = onlineUsers.get(friend.id);
                if (friendSocket) {
                    io.to(friendSocket.socketId).emit('friend-online', {
                        userId: user.id,
                        username: user.username,
                        status: 'online'
                    });
                }
            });

            socket.emit('authenticated', { 
                userId: user.id,
                username: user.username
            });

            logger.info('User authenticated via socket', { userId: user.id, username: user.username });
        } catch (error) {
            logger.error('Socket authentication error', { error: error.message });
            socket.emit('auth-error', { error: 'Authentication failed' });
        }
    });

    /**
     * Send friend request notification
     */
    socket.on('notify-friend-request', (data) => {
        try {
            const senderId = sockets.get(socket.id);
            if (!senderId) {
                socket.emit('error', { error: 'Not authenticated' });
                return;
            }

            const { recipientId } = data;
            const recipientSocket = onlineUsers.get(recipientId);
            
            if (recipientSocket) {
                const sender = db.getUserById(senderId);
                io.to(recipientSocket.socketId).emit('friend-request-received', {
                    from: sanitizeUser(sender)
                });
            }
        } catch (error) {
            logger.error('Friend request notification error', { error: error.message });
        }
    });

    /**
     * Send friend accept notification
     */
    socket.on('notify-friend-accept', (data) => {
        try {
            const accepterId = sockets.get(socket.id);
            if (!accepterId) return;

            const { requesterId } = data;
            const requesterSocket = onlineUsers.get(requesterId);
            
            if (requesterSocket) {
                const accepter = db.getUserById(accepterId);
                io.to(requesterSocket.socketId).emit('friend-accepted', {
                    from: sanitizeUser(accepter)
                });
            }
        } catch (error) {
            logger.error('Friend accept notification error', { error: error.message });
        }
    });

    /**
     * Typing indicators for authenticated users
     */
    socket.on('typing', (data) => {
        try {
            const senderId = sockets.get(socket.id);
            if (!senderId) return;

            const { recipientId, isTyping } = data;
            const recipientSocket = onlineUsers.get(recipientId);
            
            if (recipientSocket) {
                io.to(recipientSocket.socketId).emit('user-typing', {
                    userId: senderId,
                    isTyping
                });
            }
        } catch (error) {
            logger.error('Typing indicator error', { error: error.message });
        }
    });

    /**
     * Message relay (messages stored in IndexedDB on client)
     */
    socket.on('send-message', (data) => {
        try {
            const senderId = sockets.get(socket.id);
            if (!senderId) {
                socket.emit('message-error', { error: 'Not authenticated' });
                return;
            }

            const { recipientId, encryptedContent, messageId, timestamp } = data;
            
            // Verify friendship
            const friendship = db.checkFriendship(senderId, recipientId);
            if (!friendship || friendship.status !== 'accepted') {
                socket.emit('message-error', { error: 'Not friends with recipient' });
                return;
            }

            const recipientSocket = onlineUsers.get(recipientId);
            
            // Forward message to recipient if online
            if (recipientSocket) {
                io.to(recipientSocket.socketId).emit('receive-message', {
                    messageId,
                    senderId,
                    encryptedContent,
                    timestamp
                });

                // Send delivery confirmation
                socket.emit('message-delivered', { messageId });
            } else {
                // Recipient offline, message will sync when they come online
                socket.emit('message-sent', { messageId });
            }

            logger.debug('Message relayed', { from: senderId, to: recipientId });
        } catch (error) {
            logger.error('Message relay error', { error: error.message });
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });

    /**
     * Message read receipt
     */
    socket.on('message-read', (data) => {
        try {
            const readerId = sockets.get(socket.id);
            if (!readerId) return;

            const { senderId, messageId } = data;
            const senderSocket = onlineUsers.get(senderId);
            
            if (senderSocket) {
                io.to(senderSocket.socketId).emit('message-read-receipt', {
                    messageId,
                    readerId,
                    readAt: new Date()
                });
            }
        } catch (error) {
            logger.error('Read receipt error', { error: error.message });
        }
    });

    // ============================================
    // LEGACY EPHEMERAL MODE (for backward compatibility)
    // ============================================

    // User registration with device info
    socket.on('register', (data) => {
        try {
            if (!data || typeof data !== 'object') {
                socket.emit('connection-error', { error: 'Invalid registration data' });
                return;
            }

            const { code, deviceName, avatar } = data;

            if (!validateUserCode(code)) {
                socket.emit('connection-error', { error: 'Invalid code format' });
                return;
            }

            const userCode = code.trim();
            const sanitizedDeviceName = sanitizeMessage(deviceName || 'Unknown Device');
            
            // Register user with ephemeral data
            users.set(userCode, {
                socketId: socket.id,
                deviceName: sanitizedDeviceName,
                avatar: avatar || null,
                connectionTime: new Date()
            });
            
            // Note: For legacy mode, we still use sockets map with userCode
            // New authenticated mode uses userId
            sockets.set(socket.id, userCode);
            
            socket.emit('registered', { 
                code: userCode,
                deviceName: sanitizedDeviceName
            });
            
            logger.info('User registered (legacy mode)', { userCode, deviceName: sanitizedDeviceName, socketId: socket.id });
        } catch (error) {
            logger.error('Error in register handler', { error: error.message, socketId: socket.id });
            socket.emit('connection-error', { error: 'Registration failed' });
        }
    });

    // Send connection invite
    socket.on('connection-request', (data) => {
        try {
            const requesterCode = sockets.get(socket.id);
            if (!requesterCode) {
                socket.emit('connection-error', { error: 'Not registered' });
                return;
            }

            if (!data || typeof data !== 'object' || !validateUserCode(data.code)) {
                socket.emit('connection-error', { error: 'Invalid connection code' });
                return;
            }

            const targetCode = data.code.trim();
            const targetUser = users.get(targetCode);
            
            if (targetUser) {
                // Add to pending invites
                if (!pendingInvites.has(targetCode)) {
                    pendingInvites.set(targetCode, new Set());
                }
                pendingInvites.get(targetCode).add(requesterCode);
                
                // Send invite to target user
                io.to(targetUser.socketId).emit('connection-request', { 
                    code: requesterCode,
                    deviceName: users.get(requesterCode).deviceName,
                    avatar: users.get(requesterCode).avatar
                });
                
                // Confirm to requester
                socket.emit('connection-request-sent', { code: targetCode });
                
                logger.info('Connection request sent', { from: requesterCode, to: targetCode });
            } else {
                socket.emit('connection-error', { error: 'User not found or offline' });
            }
        } catch (error) {
            logger.error('Error in connection-request handler', { error: error.message, socketId: socket.id });
            socket.emit('connection-error', { error: 'Connection request failed' });
        }
    });

    // Accept connection invite
    socket.on('connection-accept', ({ code }) => {
        const accepterCode = sockets.get(socket.id);
        if (!accepterCode) {
            socket.emit('connection-error', { error: 'Not registered' });
            return;
        }

        const requesterCode = code.trim();
        const requesterUser = users.get(requesterCode);
        
        if (requesterUser && pendingInvites.has(accepterCode) && 
            pendingInvites.get(accepterCode).has(requesterCode)) {
            
            // Remove from pending invites
            pendingInvites.get(accepterCode).delete(requesterCode);
            
            // Create chat room
            const roomId = generateRoomId(accepterCode, requesterCode);
            chatRooms.set(roomId, {
                user1: accepterCode,
                user2: requesterCode,
                messages: [],
                media: new Set(),
                createdAt: new Date()
            });
            
            // Notify both users
            io.to(requesterUser.socketId).emit('connection-accepted', { 
                code: accepterCode,
                roomId,
                deviceName: users.get(accepterCode).deviceName,
                avatar: users.get(accepterCode).avatar
            });
            
            socket.emit('connection-established', { 
                code: requesterCode,
                roomId,
                deviceName: users.get(requesterCode).deviceName,
                avatar: users.get(requesterCode).avatar
            });
            
            console.log(`[CONNECTED] ${accepterCode} <-> ${requesterCode} (Room: ${roomId})`);
        } else {
            socket.emit('connection-error', { error: 'Invalid connection request' });
        }
    });

    // Handle text messages
    socket.on('message', (data) => {
        try {
            const senderCode = sockets.get(socket.id);
            if (!senderCode) {
                socket.emit('message-error', { error: 'Not registered' });
                return;
            }

            if (!data || typeof data !== 'object') {
                socket.emit('message-error', { error: 'Invalid message data' });
                return;
            }

            const { to, message, roomId } = data;

            if (!validateUserCode(to) || !validateMessage(message) || !roomId) {
                socket.emit('message-error', { error: 'Invalid message format' });
                return;
            }

            const sanitizedMessage = sanitizeMessage(message);
            const targetUser = users.get(to);
            const room = chatRooms.get(roomId);
            
            if (targetUser && room && 
                (room.user1 === senderCode || room.user2 === senderCode) &&
                (room.user1 === to || room.user2 === to)) {
                
                // Store message in room (ephemeral)
                const messageData = {
                    id: Date.now() + Math.random(),
                    from: senderCode,
                    to: to,
                    message: sanitizedMessage,
                    timestamp: new Date(),
                    type: 'text'
                };
                
                room.messages.push(messageData);
                
                // Forward to recipient
                io.to(targetUser.socketId).emit('message', messageData);
                
                // Confirm to sender
                socket.emit('message-sent', messageData);
                
                logger.debug('Message sent', { 
                    from: senderCode, 
                    to, 
                    length: sanitizedMessage.length 
                });
            } else {
                socket.emit('message-error', { error: 'Invalid message recipient or room' });
            }
        } catch (error) {
            logger.error('Error in message handler', { error: error.message, socketId: socket.id });
            socket.emit('message-error', { error: 'Message failed to send' });
        }
    });

    // Handle media sharing (in-memory only)
    socket.on('media-upload', (data) => {
        try {
            const senderCode = sockets.get(socket.id);
            if (!senderCode) {
                socket.emit('media-error', { error: 'Not registered' });
                return;
            }

            // Check rate limit
            if (!checkUploadRateLimit(senderCode)) {
                socket.emit('media-error', { 
                    error: `Upload rate limit exceeded. Please wait before uploading more files (max ${UPLOAD_RATE_LIMIT} per minute).` 
                });
                logger.warn('Upload rate limit exceeded', { from: senderCode });
                return;
            }

            if (!data || typeof data !== 'object') {
                socket.emit('media-error', { error: 'Invalid upload data' });
                return;
            }

            const { to, roomId, mediaData, filename, mimeType } = data;

            // Validate file upload
            const validation = validateMediaUpload({ mediaData, filename, mimeType });
            if (!validation.valid) {
                socket.emit('media-error', { error: validation.error });
                logger.warn('Invalid media upload attempt', { 
                    from: senderCode, 
                    error: validation.error,
                    mimeType,
                    size: mediaData ? mediaData.length : 0
                });
                return;
            }

            // Use calculated size from validation
            const sizeInBytes = validation.size;

            // Sanitize filename
            const safeFilename = sanitizeFilename(filename);

            const targetUser = users.get(to);
            const room = chatRooms.get(roomId);
            
            if (!targetUser || !room || 
                (room.user1 !== senderCode && room.user2 !== senderCode) ||
                (room.user1 !== to && room.user2 !== to)) {
                socket.emit('media-error', { error: 'Invalid media recipient or room' });
                return;
            }
            
            // Store media in memory (never written to disk)
            const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            mediaStorage.set(mediaId, {
                data: mediaData,
                type: mimeType,
                filename: safeFilename,
                size: sizeInBytes,
                timestamp: new Date(),
                roomId: roomId
            });
            
            // Store message reference in room
            const messageData = {
                id: Date.now() + Math.random(),
                from: senderCode,
                to: to,
                mediaId: mediaId,
                filename: safeFilename,
                mimeType: mimeType,
                size: sizeInBytes,
                timestamp: new Date(),
                type: 'media'
            };
            
            room.messages.push(messageData);
            room.media.add(mediaId);
            
            // Forward to recipient (with data for immediate display)
            io.to(targetUser.socketId).emit('media-message', {
                ...messageData,
                mediaData: mediaData
            });
            
            // Confirm to sender
            socket.emit('media-sent', {
                ...messageData,
                mediaData: mediaData
            });
            
            logger.info('Media uploaded', { 
                from: senderCode, 
                to, 
                filename: safeFilename,
                mimeType,
                size: `${(sizeInBytes/1024).toFixed(1)}KB` 
            });
        } catch (error) {
            logger.error('Error in media-upload handler', { error: error.message, socketId: socket.id });
            socket.emit('media-error', { error: 'Failed to upload media' });
        }
    });

    // Get media data
    socket.on('get-media', ({ mediaId }) => {
        const userCode = sockets.get(socket.id);
        if (!userCode) {
            socket.emit('media-error', { error: 'Not registered' });
            return;
        }

        const media = mediaStorage.get(mediaId);
        if (media) {
            // Verify user has access to this media
            const room = chatRooms.get(media.roomId);
            if (room && (room.user1 === userCode || room.user2 === userCode)) {
                socket.emit('media-data', {
                    mediaId: mediaId,
                    data: media.data,
                    type: media.type,
                    filename: media.filename
                });
            } else {
                socket.emit('media-error', { error: 'Access denied' });
            }
        } else {
            socket.emit('media-error', { error: 'Media not found' });
        }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
        try {
            const senderCode = sockets.get(socket.id);
            if (!senderCode || !data || !data.to) {
                return;
            }
            
            const targetUser = users.get(data.to);
            if (targetUser) {
                io.to(targetUser.socketId).emit('typing-start', { from: senderCode });
            }
        } catch (error) {
            logger.error('Error in typing-start handler', { error: error.message });
        }
    });

    socket.on('typing-stop', (data) => {
        try {
            const senderCode = sockets.get(socket.id);
            if (!senderCode || !data || !data.to) {
                return;
            }
            
            const targetUser = users.get(data.to);
            if (targetUser) {
                io.to(targetUser.socketId).emit('typing-stop', { from: senderCode });
            }
        } catch (error) {
            logger.error('Error in typing-stop handler', { error: error.message });
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected', { socketId: socket.id, reason });
        
        const userIdentifier = sockets.get(socket.id);
        if (userIdentifier) {
            // Check if it's an authenticated user (userId) or legacy user (userCode)
            const onlineUser = onlineUsers.get(userIdentifier);
            
            if (onlineUser) {
                // Authenticated user disconnect
                onlineUsers.delete(userIdentifier);
                
                // Update database status
                db.updateUserStatus(userIdentifier, 'offline', new Date());
                
                // Notify friends
                const friends = db.getFriends(userIdentifier);
                friends.forEach(friend => {
                    const friendSocket = onlineUsers.get(friend.id);
                    if (friendSocket) {
                        io.to(friendSocket.socketId).emit('friend-offline', {
                            userId: userIdentifier
                        });
                    }
                });
                
                logger.info('Authenticated user disconnected', { userId: userIdentifier });
            } else {
                // Legacy ephemeral mode cleanup
                cleanupUser(socket.id);
            }
            
            sockets.delete(socket.id);
        }
    });

    // WebRTC Call Signaling
    socket.on('call-initiate', (data) => {
        try {
            const callerCode = sockets.get(socket.id);
            if (!callerCode) {
                socket.emit('call-error', { error: 'Not registered' });
                return;
            }

            if (!data || typeof data !== 'object' || !data.to || !data.type) {
                socket.emit('call-error', { error: 'Invalid call data' });
                return;
            }

            const { to, type } = data;
            const targetUser = users.get(to);

            if (!targetUser) {
                socket.emit('call-error', { error: 'User not available for call' });
                return;
            }

            // Forward call initiation to target user
            io.to(targetUser.socketId).emit('call-incoming', {
                from: callerCode,
                type,
                deviceName: users.get(callerCode).deviceName
            });

            logger.info('Call initiated', { from: callerCode, to, type });
        } catch (error) {
            logger.error('Error in call-initiate handler', { error: error.message });
            socket.emit('call-error', { error: 'Failed to initiate call' });
        }
    });

    socket.on('call-accept', (data) => {
        try {
            const accepterCode = sockets.get(socket.id);
            if (!accepterCode || !data || !data.from) {
                socket.emit('call-error', { error: 'Invalid call accept' });
                return;
            }

            const { from } = data;
            const callerUser = users.get(from);

            if (!callerUser) {
                socket.emit('call-error', { error: 'Caller not found' });
                return;
            }

            // Notify caller that call was accepted
            io.to(callerUser.socketId).emit('call-accepted', {
                from: accepterCode,
                deviceName: users.get(accepterCode).deviceName
            });

            logger.info('Call accepted', { caller: from, accepter: accepterCode });
        } catch (error) {
            logger.error('Error in call-accept handler', { error: error.message });
            socket.emit('call-error', { error: 'Failed to accept call' });
        }
    });

    socket.on('call-reject', (data) => {
        try {
            const rejecterCode = sockets.get(socket.id);
            if (!rejecterCode || !data || !data.from) {
                return;
            }

            const { from } = data;
            const callerUser = users.get(from);

            if (callerUser) {
                io.to(callerUser.socketId).emit('call-rejected', {
                    from: rejecterCode
                });
            }

            logger.info('Call rejected', { caller: from, rejecter: rejecterCode });
        } catch (error) {
            logger.error('Error in call-reject handler', { error: error.message });
        }
    });

    socket.on('call-end', (data) => {
        try {
            const userCode = sockets.get(socket.id);
            if (!userCode || !data || !data.to) {
                return;
            }

            const { to } = data;
            const targetUser = users.get(to);

            if (targetUser) {
                io.to(targetUser.socketId).emit('call-ended', {
                    from: userCode
                });
            }

            logger.info('Call ended', { from: userCode, to });
        } catch (error) {
            logger.error('Error in call-end handler', { error: error.message });
        }
    });

    // WebRTC signaling (SDP offer/answer, ICE candidates)
    socket.on('webrtc-signal', (data) => {
        try {
            const senderCode = sockets.get(socket.id);
            if (!senderCode || !data || !data.to || !data.signal) {
                socket.emit('call-error', { error: 'Invalid WebRTC signal' });
                return;
            }

            const { to, signal, signalType } = data;
            const targetUser = users.get(to);

            if (!targetUser) {
                socket.emit('call-error', { error: 'Target user not found' });
                return;
            }

            // Forward WebRTC signal to target user
            io.to(targetUser.socketId).emit('webrtc-signal', {
                from: senderCode,
                signal,
                signalType
            });

            logger.debug('WebRTC signal forwarded', { 
                from: senderCode, 
                to, 
                signalType 
            });
        } catch (error) {
            logger.error('Error in webrtc-signal handler', { error: error.message });
            socket.emit('call-error', { error: 'Failed to forward signal' });
        }
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.get('/health', (req, res) => {
    const uptime = process.uptime();
    res.json({
        status: 'ok',
        uptime: Math.floor(uptime),
        timestamp: new Date().toISOString(),
        clients: users.size,
        version
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info('ChatWave Ephemeral Server started', { 
        port: PORT, 
        nodeEnv: process.env.NODE_ENV || 'development' 
    });
    logger.info('Server configuration', {
        ephemeral: true,
        inviteBased: true,
        cors: process.env.ORIGIN || '*'
    });
    logger.debug('Current stats', {
        users: users.size, 
        rooms: chatRooms.size, 
        media: mediaStorage.size
    });
});

// Graceful process error handlers
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    // Don't exit immediately, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    // Don't exit immediately, log and continue
});

// Graceful shutdown - all data is lost
process.on('SIGTERM', () => {
    logger.info('Server shutting down - all ephemeral data will be lost');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('Server interrupted - all ephemeral data will be lost');
    process.exit(0);
});