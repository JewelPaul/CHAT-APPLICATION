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
const { sanitizeMessage, validateUserCode, validateMessage, Logger } = require('./utils');

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
    socket.on('media-upload', ({ to, roomId, mediaData, filename, mimeType }) => {
        const senderCode = sockets.get(socket.id);
        if (!senderCode) {
            socket.emit('media-error', { error: 'Not registered' });
            return;
        }

        const targetUser = users.get(to);
        const room = chatRooms.get(roomId);
        
        if (targetUser && room && 
            (room.user1 === senderCode || room.user2 === senderCode) &&
            (room.user1 === to || room.user2 === to)) {
            
            // Store media in memory (never written to disk)
            const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            mediaStorage.set(mediaId, {
                data: mediaData,
                type: mimeType,
                filename: filename,
                size: mediaData.length,
                timestamp: new Date(),
                roomId: roomId
            });
            
            // Store message reference in room
            const messageData = {
                id: Date.now() + Math.random(),
                from: senderCode,
                to: to,
                mediaId: mediaId,
                filename: filename,
                mimeType: mimeType,
                size: mediaData.length,
                timestamp: new Date(),
                type: 'media'
            };
            
            room.messages.push(messageData);
            room.media.add(mediaId);
            
            // Forward to recipient (without raw data)
            io.to(targetUser.socketId).emit('media-message', {
                ...messageData,
                mediaData: mediaData // Include data for immediate display
            });
            
            // Confirm to sender
            socket.emit('media-sent', messageData);
            
            console.log(`[MEDIA] ${senderCode} -> ${to}: ${filename} (${(mediaData.length/1024).toFixed(1)}KB)`);
        } else {
            socket.emit('media-error', { error: 'Invalid media recipient or room' });
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
        timestamp: Date.now(),
        clients: users.size
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