const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store connected peers
const peers = {};

// Global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Debug middleware to log all socket events
io.use((socket, next) => {
  const originalEmit = socket.emit;
  socket.emit = function(event, ...args) {
    console.log(`[SOCKET EMIT] ${event}:`, ...args);
    return originalEmit.apply(socket, [event, ...args]);
  };
  next();
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Log all incoming events
  const originalOn = socket.on;
  socket.on = function(event, handler) {
    return originalOn.call(this, event, (...args) => {
      console.log(`[SOCKET RECEIVED] ${event}:`, ...args);
      return handler(...args);
    });
  };

  // Handle peer registration
  socket.on('register', (data) => {
    try {
      const { uniqueCode } = data;
      console.log(`Peer registered: ${uniqueCode}`);

      // Store the peer
      peers[uniqueCode] = {
        socketId: socket.id,
        lastSeen: Date.now()
      };

      // Acknowledge registration
      socket.emit('registered', {
        success: true,
        uniqueCode
      });
    } catch (error) {
      console.error('Error in register handler:', error);
      socket.emit('error', { message: 'Registration failed' });
    }
  });

  // Handle connection requests
  socket.on('connect-to-peer', (data) => {
    try {
      const { uniqueCode, targetCode } = data;
      console.log(`Connection request from ${uniqueCode} to ${targetCode}`);

      // Check if the target peer exists
      if (!peers[targetCode]) {
        console.log(`Peer ${targetCode} not found`);
        socket.emit('connection-error', {
          error: 'Peer not found',
          targetCode
        });
        return;
      }

      // Forward the connection request to the target peer
      io.to(peers[targetCode].socketId).emit('connection-request', {
        from: uniqueCode
      });

      // Acknowledge that the request was sent
      socket.emit('connection-request-sent', {
        success: true,
        targetCode
      });
    } catch (error) {
      console.error('Error in connect-to-peer handler:', error);
      socket.emit('connection-error', { error: 'Internal server error' });
    }
  });

  // Handle connection acceptance
  socket.on('accept-connection', (data) => {
    try {
      const { uniqueCode, sourceCode } = data;
      console.log(`Connection accepted by ${uniqueCode} from ${sourceCode}`);

      // Check if the source peer exists
      if (!peers[sourceCode]) {
        console.log(`Source peer ${sourceCode} not found`);
        socket.emit('connection-error', {
          error: 'Peer not found',
          targetCode: sourceCode
        });
        return;
      }

      // Forward the acceptance to the source peer
      io.to(peers[sourceCode].socketId).emit('connection-accepted', {
        from: uniqueCode
      });

      // Confirm to the accepting peer
      socket.emit('connection-established', {
        success: true,
        peerCode: sourceCode
      });
    } catch (error) {
      console.error('Error in accept-connection handler:', error);
      socket.emit('connection-error', { error: 'Internal server error' });
    }
  });

  // Handle message sending
  socket.on('send-message', (data) => {
    try {
      const { uniqueCode, targetCode, message } = data;
      console.log(`Message from ${uniqueCode} to ${targetCode}`);

      // Check if the target peer exists
      if (!peers[targetCode]) {
        console.log(`Target peer ${targetCode} not found`);
        socket.emit('message-error', {
          error: 'Peer not found',
          targetCode
        });
        return;
      }

      // Forward the message to the target peer
      io.to(peers[targetCode].socketId).emit('message', {
        from: uniqueCode,
        message
      });

      // Acknowledge the message
      socket.emit('message-sent', {
        success: true,
        targetCode
      });
    } catch (error) {
      console.error('Error in send-message handler:', error);
      socket.emit('message-error', { error: 'Internal server error' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    try {
      const { uniqueCode, targetCode, isTyping } = data;
      console.log(`Typing indicator from ${uniqueCode} to ${targetCode}: ${isTyping}`);

      // Check if the target peer exists
      if (!peers[targetCode]) {
        console.log(`Target peer ${targetCode} not found for typing indicator`);
        return;
      }

      // Forward the typing indicator to the target peer
      io.to(peers[targetCode].socketId).emit('typing', {
        from: uniqueCode,
        isTyping
      });
    } catch (error) {
      console.error('Error in typing handler:', error);
    }
  });

  // Handle file transfer
  socket.on('send-file', (data) => {
    try {
      const { uniqueCode, targetCode, fileData } = data;
      console.log(`File from ${uniqueCode} to ${targetCode}, size: ${fileData.data.length} bytes`);

      // Check if the target peer exists
      if (!peers[targetCode]) {
        console.log(`Target peer ${targetCode} not found for file transfer`);
        socket.emit('file-error', {
          error: 'Peer not found',
          targetCode,
          fileId: fileData.id
        });
        return;
      }

      // Forward the file to the target peer
      io.to(peers[targetCode].socketId).emit('file', {
        from: uniqueCode,
        fileData
      });

      // Acknowledge the file transfer
      socket.emit('file-sent', {
        success: true,
        targetCode,
        fileId: fileData.id
      });
    } catch (error) {
      console.error('Error in send-file handler:', error);
      socket.emit('file-error', {
        error: 'Internal server error',
        fileId: data?.fileData?.id || 'unknown'
      });
    }
  });

  // Handle disconnection from peer
  socket.on('disconnect-from-peer', (data) => {
    try {
      const { uniqueCode, targetCode } = data;
      console.log(`Disconnection from ${uniqueCode} to ${targetCode}`);

      // Check if the target peer exists
      if (peers[targetCode]) {
        // Notify the target peer
        io.to(peers[targetCode].socketId).emit('peer-disconnected', {
          from: uniqueCode
        });
      }

      // Acknowledge the disconnection
      socket.emit('disconnected-from-peer', {
        success: true,
        targetCode
      });
    } catch (error) {
      console.error('Error in disconnect-from-peer handler:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      console.log('User disconnected:', socket.id);

      // Find the peer that disconnected
      for (const uniqueCode in peers) {
        if (peers[uniqueCode].socketId === socket.id) {
          console.log(`Peer ${uniqueCode} disconnected`);
          delete peers[uniqueCode];
          break;
        }
      }
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
