/**
 * ChatWave Ephemeral Chat Server
 * Fully ephemeral, invite/consent-based secure chat server
 * No database or persistent storage - all data stored in memory only
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const { sanitizeMessage, sanitizeFilename, validateUserCode, validateMessage, validateMediaUpload, Logger } = require('./utils');
const { version } = require('../package.json');

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const app = express();

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

// EPHEMERAL IN-MEMORY STORAGE ONLY
// All data is lost when server restarts or users disconnect

// Map of userCode -> { socketId, deviceName, avatar, connectionTime }
const users = new Map();

// Map of socketId -> userCode (for cleanup on disconnect)
const sockets = new Map();

// Map of roomId -> { user1, user2, messages, media, createdAt }
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
            
            sockets.set(socket.id, userCode);
            
            socket.emit('registered', { 
                code: userCode,
                deviceName: sanitizedDeviceName
            });
            
            logger.info('User registered', { userCode, deviceName: sanitizedDeviceName, socketId: socket.id });
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
            
            // Calculate actual size
            const sizeInBytes = Math.ceil((mediaData.length * 3) / 4);
            
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
        cleanupUser(socket.id);
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