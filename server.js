/**
 * ChatWave Socket.io Backend Server (LEGACY)
 * 
 * NOTE: This is legacy code from when frontend was on GitHub Pages.
 * The main server is now in server/server.js which serves both frontend and backend.
 * 
 * Professional, production-ready real-time chat server
 * Author: JewelPaul
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
// Updated CORS for single-service deployment
app.use(cors({
    origin: "*",
    credentials: false
}));
const server = http.createServer(app);

// Configure Socket.IO for CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    }
});

// Map of userCode -> socket.id
const users = new Map();

// Map of socket.id -> userCode (for disconnect cleanup)
const sockets = new Map();

io.on('connection', socket => {
    let userCode = null;

    // User registers with a unique code
    socket.on('register', ({ code }) => {
        if (typeof code !== "string" || !code.trim()) {
            socket.emit('connection-error', { error: 'Invalid code' });
            return;
        }
        userCode = code;
        users.set(userCode, socket.id);
        sockets.set(socket.id, userCode);
        socket.emit('registered', { code: userCode });
        console.log(`[REGISTER] ${userCode} (${socket.id})`);
    });

    // User sends a connection request to another code
    socket.on('connection-request', ({ code }) => {
        if (!userCode) {
            socket.emit('connection-error', { error: 'Not registered' });
            return;
        }
        if (typeof code !== "string" || !code.trim()) {
            socket.emit('connection-error', { error: 'Invalid connection code' });
            return;
        }
        const targetSocketId = users.get(code);
        if (targetSocketId) {
            // Notify the recipient
            io.to(targetSocketId).emit('connection-request', { code: userCode });
            // Notify the sender that request was sent
            socket.emit('connection-request-sent', { code });
            console.log(`[CONNECT-REQUEST] ${userCode} -> ${code}`);
        } else {
            socket.emit('connection-error', { error: 'User not found or offline' });
        }
    });

    // User accepts a connection
    socket.on('connection-accept', ({ code }) => {
        if (!userCode) {
            socket.emit('connection-error', { error: 'Not registered' });
            return;
        }
        const requesterSocketId = users.get(code);
        if (requesterSocketId) {
            // Notify the requester that the connection was accepted
            io.to(requesterSocketId).emit('connection-accepted', { code: userCode });
            // Notify both users that connection is established
            io.to(requesterSocketId).emit('connection-established', { code: userCode });
            socket.emit('connection-established', { code });
            console.log(`[CONNECTED] ${userCode} <-> ${code}`);
        } else {
            socket.emit('connection-error', { error: 'Requester not found or offline' });
        }
    });

    // Real-time messaging between users
    socket.on('message', ({ to, message }) => {
        if (!userCode) {
            socket.emit('message-error', { error: 'Not registered', targetCode: to });
            return;
        }
        if (typeof to !== "string" || !to.trim()) {
            socket.emit('message-error', { error: 'Invalid target code', targetCode: to });
            return;
        }
        const targetSocketId = users.get(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('message', { from: userCode, message });
            socket.emit('message-sent', { to, message });
            console.log(`[MESSAGE] ${userCode} -> ${to}: ${message}`);
        } else {
            socket.emit('message-error', { error: 'Target user is offline', targetCode: to });
        }
    });

    // Optionally: typing indicator, file transfer, etc. can be added here

    // Handle disconnect
    socket.on('disconnect', () => {
        if (userCode) {
            users.delete(userCode);
            sockets.delete(socket.id);
            console.log(`[DISCONNECT] ${userCode} (${socket.id})`);
        }
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('ChatWave backend server is running.');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
