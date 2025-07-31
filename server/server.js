/**
 * ChatWave Ephemeral Chat Server
 * Fully ephemeral, invite/consent-based secure chat server
 * No database or persistent storage - all data stored in memory only
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO for full cross-origin support
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    }
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
        console.log(`[CLEANUP] User ${userCode} disconnected`);
        
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
                console.log(`[CLEANUP] Removed chat room ${roomId}`);
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log(`[CONNECTION] New socket connected: ${socket.id}`);

    // User registration with device info
    socket.on('register', ({ code, deviceName, avatar }) => {
        if (typeof code !== "string" || !code.trim()) {
            socket.emit('connection-error', { error: 'Invalid code' });
            return;
        }

        const userCode = code.trim();
        
        // Register user with ephemeral data
        users.set(userCode, {
            socketId: socket.id,
            deviceName: deviceName || 'Unknown Device',
            avatar: avatar || null,
            connectionTime: new Date()
        });
        
        sockets.set(socket.id, userCode);
        
        socket.emit('registered', { 
            code: userCode,
            deviceName: deviceName || 'Unknown Device'
        });
        
        console.log(`[REGISTER] ${userCode} (${deviceName}) registered with socket ${socket.id}`);
    });

    // Send connection invite
    socket.on('connection-request', ({ code }) => {
        const requesterCode = sockets.get(socket.id);
        if (!requesterCode) {
            socket.emit('connection-error', { error: 'Not registered' });
            return;
        }

        if (typeof code !== "string" || !code.trim()) {
            socket.emit('connection-error', { error: 'Invalid connection code' });
            return;
        }

        const targetCode = code.trim();
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
            
            console.log(`[INVITE] ${requesterCode} -> ${targetCode}`);
        } else {
            socket.emit('connection-error', { error: 'User not found or offline' });
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
    socket.on('message', ({ to, message, roomId }) => {
        const senderCode = sockets.get(socket.id);
        if (!senderCode) {
            socket.emit('message-error', { error: 'Not registered' });
            return;
        }

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
                message: message,
                timestamp: new Date(),
                type: 'text'
            };
            
            room.messages.push(messageData);
            
            // Forward to recipient
            io.to(targetUser.socketId).emit('message', messageData);
            
            // Confirm to sender
            socket.emit('message-sent', messageData);
            
            console.log(`[MESSAGE] ${senderCode} -> ${to}: ${message.substring(0, 50)}...`);
        } else {
            socket.emit('message-error', { error: 'Invalid message recipient or room' });
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
    socket.on('typing-start', ({ to, roomId }) => {
        const senderCode = sockets.get(socket.id);
        const targetUser = users.get(to);
        
        if (senderCode && targetUser) {
            io.to(targetUser.socketId).emit('typing-start', { from: senderCode });
        }
    });

    socket.on('typing-stop', ({ to, roomId }) => {
        const senderCode = sockets.get(socket.id);
        const targetUser = users.get(to);
        
        if (senderCode && targetUser) {
            io.to(targetUser.socketId).emit('typing-stop', { from: senderCode });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`[DISCONNECT] Socket ${socket.id} disconnected`);
        cleanupUser(socket.id);
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        users: users.size,
        rooms: chatRooms.size,
        media: mediaStorage.size,
        memoryUsage: process.memoryUsage()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 ChatWave Ephemeral Server running on port ${PORT}`);
    console.log(`📝 All data stored in memory only - no persistence`);
    console.log(`🔒 Invite-based consent system active`);
    console.log(`💾 Active users: ${users.size}, Rooms: ${chatRooms.size}, Media: ${mediaStorage.size}`);
});

// Graceful shutdown - all data is lost
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down - all ephemeral data will be lost');
    server.close();
});

process.on('SIGINT', () => {
    console.log('🛑 Server interrupted - all ephemeral data will be lost');
    process.exit(0);
});