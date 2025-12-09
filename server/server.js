/**
 * ChatWave Device Key Chat Server
 * Simple chat application using permanent device keys
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
const { sanitizeMessage, sanitizeFilename, validateUserCode, validateMediaUpload, Logger } = require('./utils');
const { version } = require('../package.json');

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

// Rate limiting for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Simple health check endpoint
app.get('/api/health', apiLimiter, (req, res) => {
  res.json({ 
    status: 'ok', 
    version,
    mode: 'device-key'
  });
});

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
// IN-MEMORY DATA STRUCTURES
// ============================================
// Map of userCode -> user data
const users = new Map();

// Map of socketId -> userCode
const sockets = new Map();

// Map of roomId -> room data
const chatRooms = new Map();

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

io.on('connection', (socket) => {
    logger.info('New socket connected', { socketId: socket.id });

    // Error handling for socket
    socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message });
    });

    // ============================================
    // DEVICE KEY MODE - User Registration
    // ============================================

    // User registration with device key
    socket.on('register', (data) => {
        try {
            if (!data || typeof data !== 'object') {
                socket.emit('error', { message: 'Invalid registration data' });
                return;
            }

            const { deviceKey, deviceName } = data;

            if (!deviceKey || !validateUserCode(deviceKey)) {
                socket.emit('error', { message: 'Invalid device key format' });
                return;
            }

            const key = deviceKey.trim();
            const name = sanitizeMessage(deviceName || key);
            
            // Register user with device key
            users.set(key, {
                socketId: socket.id,
                name: name,
                online: true
            });
            
            sockets.set(socket.id, key);
            
            socket.emit('registered', { 
                success: true,
                deviceKey: key
            });
            
            logger.info('User registered', { deviceKey: key, name, socketId: socket.id });
        } catch (error) {
            logger.error('Error in register handler', { error: error.message, socketId: socket.id });
            socket.emit('error', { message: 'Registration failed' });
        }
    });

    // CONNECTION REQUEST
    socket.on('connection-request', (data) => {
        try {
            const senderKey = sockets.get(socket.id);
            if (!senderKey) {
                socket.emit('error', { message: 'Not registered' });
                return;
            }

            if (!data || typeof data !== 'object' || !data.targetKey) {
                socket.emit('error', { message: 'Invalid request data' });
                return;
            }

            const { targetKey } = data;
            const target = users.get(targetKey);
            
            if (!target || !target.online) {
                socket.emit('user-not-found', { targetKey });
                return;
            }
            
            // Add to pending invites
            if (!pendingInvites.has(targetKey)) {
                pendingInvites.set(targetKey, new Set());
            }
            pendingInvites.get(targetKey).add(senderKey);
            
            // Send to target
            io.to(target.socketId).emit('incoming-request', {
                fromKey: senderKey,
                fromName: users.get(senderKey)?.name || senderKey
            });
            
            socket.emit('request-sent', { targetKey });
            
            logger.info('Connection request sent', { from: senderKey, to: targetKey });
        } catch (error) {
            logger.error('Error in connection-request handler', { error: error.message, socketId: socket.id });
            socket.emit('error', { message: 'Connection request failed' });
        }
    });

    // ACCEPT REQUEST
    socket.on('accept-request', (data) => {
        try {
            const accepterKey = sockets.get(socket.id);
            if (!accepterKey) {
                socket.emit('error', { message: 'Not registered' });
                return;
            }

            if (!data || !data.fromKey) {
                socket.emit('error', { message: 'Invalid request' });
                return;
            }

            const { fromKey } = data;
            const fromUser = users.get(fromKey);
            
            if (!fromUser) {
                socket.emit('error', { message: 'User offline' });
                return;
            }
            
            // Check if request exists
            if (!pendingInvites.has(accepterKey) || !pendingInvites.get(accepterKey).has(fromKey)) {
                socket.emit('error', { message: 'No pending request from this user' });
                return;
            }
            
            // Remove from pending invites
            pendingInvites.get(accepterKey).delete(fromKey);
            
            const roomId = [accepterKey, fromKey].sort().join('_');
            
            // Create chat room
            chatRooms.set(roomId, {
                user1: accepterKey,
                user2: fromKey,
                messages: [],
                media: new Set(),
                createdAt: new Date()
            });
            
            // Join room
            socket.join(roomId);
            const fromSocket = io.sockets.sockets.get(fromUser.socketId);
            if (fromSocket) {fromSocket.join(roomId);}
            
            // Notify both
            const accepterName = users.get(accepterKey)?.name || accepterKey;
            const fromName = fromUser.name || fromKey;
            
            socket.emit('connection-established', { 
                partnerKey: fromKey, 
                partnerName: fromName, 
                roomId 
            });
            io.to(fromUser.socketId).emit('connection-established', { 
                partnerKey: accepterKey, 
                partnerName: accepterName, 
                roomId 
            });
            
            logger.info('Connection established', { accepter: accepterKey, requester: fromKey, roomId });
        } catch (error) {
            logger.error('Error in accept-request handler', { error: error.message, socketId: socket.id });
            socket.emit('error', { message: 'Failed to accept request' });
        }
    });

    // REJECT REQUEST
    socket.on('reject-request', (data) => {
        try {
            const rejecterKey = sockets.get(socket.id);
            if (!rejecterKey) {return;}

            if (!data || !data.fromKey) {return;}

            const { fromKey } = data;
            const fromUser = users.get(fromKey);
            
            // Remove from pending invites
            if (pendingInvites.has(rejecterKey)) {
                pendingInvites.get(rejecterKey).delete(fromKey);
            }
            
            if (fromUser) {
                io.to(fromUser.socketId).emit('request-rejected', { 
                    message: 'Request declined' 
                });
            }
            
            logger.info('Connection request rejected', { rejecter: rejecterKey, requester: fromKey });
        } catch (error) {
            logger.error('Error in reject-request handler', { error: error.message });
        }
    });

    // SEND MESSAGE
    socket.on('send-message', (data) => {
        try {
            const senderKey = sockets.get(socket.id);
            if (!senderKey) {return;}

            if (!data || !data.roomId || !data.message) {
                return;
            }

            const { roomId, message } = data;
            const room = chatRooms.get(roomId);
            
            if (!room) {
                return;
            }
            
            // Verify sender is in room
            if (room.user1 !== senderKey && room.user2 !== senderKey) {
                return;
            }
            
            const sanitizedMessage = sanitizeMessage(message);
            
            const msgData = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromKey: senderKey,
                content: sanitizedMessage,
                timestamp: Date.now(),
                roomId
            };
            
            // Store message in room
            room.messages.push(msgData);
            
            // Emit to entire room (sender and recipient)
            io.to(roomId).emit('new-message', msgData);
            
            logger.debug('Message sent', { from: senderKey, roomId, length: sanitizedMessage.length });
        } catch (error) {
            logger.error('Error in send-message handler', { error: error.message, socketId: socket.id });
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

    // TYPING
    socket.on('typing-start', (data) => {
        try {
            const key = sockets.get(socket.id);
            if (!key || !data || !data.roomId) {return;}
            
            const { roomId } = data;
            socket.to(roomId).emit('user-typing', { userKey: key });
        } catch (error) {
            logger.error('Error in typing-start handler', { error: error.message });
        }
    });

    socket.on('typing-stop', (data) => {
        try {
            const key = sockets.get(socket.id);
            if (!key || !data || !data.roomId) {return;}
            
            const { roomId } = data;
            socket.to(roomId).emit('user-stopped-typing', { userKey: key });
        } catch (error) {
            logger.error('Error in typing-stop handler', { error: error.message });
        }
    });

    // DISCONNECT
    socket.on('disconnect', (reason) => {
        try {
            const key = sockets.get(socket.id);
            if (key) {
                logger.info('User disconnected', { deviceKey: key, socketId: socket.id, reason });
                
                const user = users.get(key);
                if (user) {
                    user.online = false;
                }
                sockets.delete(socket.id);
                
                // Clean up pending invites
                pendingInvites.delete(key);
                
                // Notify other users
                socket.broadcast.emit('user-offline', { deviceKey: key });
                
                // Clean up chat rooms and media
                for (const [roomId, room] of chatRooms.entries()) {
                    if (room.user1 === key || room.user2 === key) {
                        // Remove room and associated media after disconnect
                        for (const message of room.messages) {
                            if (message.type === 'media' && message.mediaId) {
                                mediaStorage.delete(message.mediaId);
                            }
                        }
                        chatRooms.delete(roomId);
                    }
                }
            }
        } catch (error) {
            logger.error('Error in disconnect handler', { error: error.message, socketId: socket.id });
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