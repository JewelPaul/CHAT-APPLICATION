/**
 * Socket Connection Manager
 * Handles all socket.io connections and events
 */
class SocketConnection {
    /**
     * Create a new SocketConnection instance
     * @param {Object} options - Configuration options
     * @param {string} options.uniqueCode - The unique code for this peer
     * @param {Function} options.onMessage - Callback for received messages
     * @param {Function} options.onConnectionStateChange - Callback for connection state changes
     * @param {Function} options.onError - Callback for errors
     */
    constructor(options) {
        this.uniqueCode = options.uniqueCode;
        this.onMessage = options.onMessage || (() => {});
        this.onConnectionStateChange = options.onConnectionStateChange || (() => {});
        this.onError = options.onError || (() => {});

        // Store active connections
        this.connections = new Map();

        // Set up the Socket.io connection
        this.setupSocketConnection();
    }

    /**
     * Set up the Socket.io connection
     */
    setupSocketConnection() {
        console.log('Setting up Socket.io connection');

        // Connect to the Socket.io server
        this.socket = io();

        // Set up event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server, registering...');
            this.register();
        });

        this.socket.on('registered', (data) => {
            console.log('Registered with server:', data);
        });

        this.socket.on('connection-request', (data) => {
            console.log('Received connection request:', data);
            this.handleConnectionRequest(data);
        });

        this.socket.on('connection-request-sent', (data) => {
            console.log('Connection request sent:', data);
        });

        this.socket.on('connection-accepted', (data) => {
            console.log('Connection accepted:', data);
            this.handleConnectionAccepted(data);
        });

        this.socket.on('connection-established', (data) => {
            console.log('Connection established:', data);
        });

        this.socket.on('message', (data) => {
            console.log('Received message:', data);
            this.handleMessage(data);
        });

        this.socket.on('message-sent', (data) => {
            console.log('Message sent:', data);
        });

        this.socket.on('message-error', (data) => {
            console.log('Message error:', data);
            this.handleError(new Error(data.error || 'Unknown error'), data.targetCode);
        });

        // Typing indicator events
        this.socket.on('typing', (data) => {
            console.log('Typing indicator received:', data);
            this.handleTypingIndicator(data);
        });

        // File transfer events
        this.socket.on('file', (data) => {
            console.log('File received:', data);
            this.handleFileReceived(data);
        });

        this.socket.on('file-sent', (data) => {
            console.log('File sent:', data);
        });

        this.socket.on('file-error', (data) => {
            console.log('File error:', data);
            this.handleError(new Error(data.error || 'Unknown error'), data.targetCode, data.fileId);
        });

        this.socket.on('peer-disconnected', (data) => {
            console.log('Peer disconnected:', data);
            this.handlePeerDisconnected(data);
        });

        this.socket.on('disconnected-from-peer', (data) => {
            console.log('Disconnected from peer:', data);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleError(new Error('Failed to connect to server'));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    /**
     * Register with the server
     */
    register() {
        console.log('Registering with server...');
        this.socket.emit('register', {
            uniqueCode: this.uniqueCode
        });
    }

    /**
     * Connect to a peer
     * @param {string} remoteCode - The unique code of the remote peer
     * @returns {Promise} A promise that resolves when the connection is established
     */
    connect(remoteCode) {
        console.log(`Connecting to peer: ${remoteCode}`);

        return new Promise((resolve, reject) => {
            // Create a new connection
            const connection = {
                code: remoteCode,
                status: 'connecting'
            };

            // Store the connection
            this.connections.set(remoteCode, connection);

            // Send connection request
            this.socket.emit('connect-to-peer', {
                uniqueCode: this.uniqueCode,
                targetCode: remoteCode
            });

            // Set up event listeners for connection response
            const acceptHandler = (data) => {
                if (data.from === remoteCode) {
                    // Update connection status
                    connection.status = 'connected';

                    // Notify the application
                    this.onConnectionStateChange({
                        remoteCode,
                        state: 'connected',
                        connection
                    });

                    // Remove event listeners
                    this.socket.off('connection-accepted', acceptHandler);
                    this.socket.off('connection-error', errorHandler);

                    // Resolve the promise
                    resolve(connection);
                }
            };

            const errorHandler = (data) => {
                if (data.targetCode === remoteCode) {
                    // Update connection status
                    connection.status = 'failed';

                    // Notify the application
                    this.onConnectionStateChange({
                        remoteCode,
                        state: 'failed',
                        connection
                    });

                    // Remove event listeners
                    this.socket.off('connection-accepted', acceptHandler);
                    this.socket.off('connection-error', errorHandler);

                    // Reject the promise
                    reject(new Error(data.error || 'Connection failed'));
                }
            };

            // Add event listeners
            this.socket.on('connection-accepted', acceptHandler);
            this.socket.on('connection-error', errorHandler);

            // Notify the application
            this.onConnectionStateChange({
                remoteCode,
                state: 'connecting',
                connection
            });
        });
    }

    /**
     * Accept a connection request
     * @param {string} remoteCode - The unique code of the remote peer
     */
    acceptConnection(remoteCode) {
        console.log(`Accepting connection from: ${remoteCode}`);

        // Create a new connection
        const connection = {
            code: remoteCode,
            status: 'connected'
        };

        // Store the connection
        this.connections.set(remoteCode, connection);

        // Send acceptance
        this.socket.emit('accept-connection', {
            uniqueCode: this.uniqueCode,
            sourceCode: remoteCode
        });

        // Notify the application
        this.onConnectionStateChange({
            remoteCode,
            state: 'connected',
            connection
        });

        return connection;
    }

    /**
     * Send a message to a connected peer
     * @param {string} remoteCode - The unique code of the remote peer
     * @param {Object} message - The message to send
     * @returns {Promise} A promise that resolves when the message is sent
     */
    sendMessage(remoteCode, message) {
        console.log(`Sending message to: ${remoteCode}`, message);

        return new Promise((resolve, reject) => {
            // Check if we're connected to this peer
            if (!this.connections.has(remoteCode)) {
                reject(new Error(`Not connected to ${remoteCode}`));
                return;
            }

            // Get the connection
            const connection = this.connections.get(remoteCode);

            // Check if the connection is active
            if (connection.status !== 'connected') {
                reject(new Error(`Connection to ${remoteCode} is not active`));
                return;
            }

            // Set up event listeners for message response
            const sentHandler = (data) => {
                if (data.targetCode === remoteCode) {
                    // Remove event listeners
                    this.socket.off('message-sent', sentHandler);
                    this.socket.off('message-error', errorHandler);

                    // Resolve the promise
                    resolve();
                }
            };

            const errorHandler = (data) => {
                if (data.targetCode === remoteCode) {
                    // Remove event listeners
                    this.socket.off('message-sent', sentHandler);
                    this.socket.off('message-error', errorHandler);

                    // Reject the promise
                    reject(new Error(data.error || 'Failed to send message'));
                }
            };

            // Add event listeners
            this.socket.on('message-sent', sentHandler);
            this.socket.on('message-error', errorHandler);

            // Send the message
            this.socket.emit('send-message', {
                uniqueCode: this.uniqueCode,
                targetCode: remoteCode,
                message
            });
        });
    }

    /**
     * Disconnect from a peer
     * @param {string} remoteCode - The unique code of the remote peer
     */
    disconnect(remoteCode) {
        console.log(`Disconnecting from: ${remoteCode}`);

        // Check if we're connected to this peer
        if (!this.connections.has(remoteCode)) {
            console.warn(`Not connected to ${remoteCode}`);
            return;
        }

        // Send disconnect request
        this.socket.emit('disconnect-from-peer', {
            uniqueCode: this.uniqueCode,
            targetCode: remoteCode
        });

        // Update connection status
        const connection = this.connections.get(remoteCode);
        connection.status = 'disconnected';

        // Notify the application
        this.onConnectionStateChange({
            remoteCode,
            state: 'disconnected',
            connection
        });

        // Remove the connection
        this.connections.delete(remoteCode);
    }

    /**
     * Handle a connection request
     * @param {Object} data - The connection request data
     */
    handleConnectionRequest(data) {
        const { from } = data;

        // Notify the application
        const event = new CustomEvent('connection-request-received', {
            detail: {
                from
            }
        });
        document.dispatchEvent(event);

        // Try to show the connection request modal
        try {
            const modal = document.getElementById('connection-request-modal');
            if (modal) {
                const fromElement = document.getElementById('request-from-code');
                if (fromElement) {
                    fromElement.textContent = from;
                }
                modal.classList.add('active');
            }
        } catch (error) {
            console.error('Failed to show connection request modal:', error);
        }
    }

    /**
     * Handle a connection acceptance
     * @param {Object} data - The connection acceptance data
     */
    handleConnectionAccepted(data) {
        const { from } = data;

        // Check if we have a connection for this peer
        if (!this.connections.has(from)) {
            console.warn(`Received connection acceptance from unknown peer: ${from}`);
            return;
        }

        // Update connection status
        const connection = this.connections.get(from);
        connection.status = 'connected';

        // Notify the application
        this.onConnectionStateChange({
            remoteCode: from,
            state: 'connected',
            connection
        });
    }

    /**
     * Handle a message
     * @param {Object} data - The message data
     */
    handleMessage(data) {
        const { from, message } = data;

        // Check if we have a connection for this peer
        if (!this.connections.has(from)) {
            console.warn(`Received message from unknown peer: ${from}`);
            return;
        }

        // Get the connection
        const connection = this.connections.get(from);

        // Call the message handler
        this.onMessage({
            from,
            data: message,
            timestamp: new Date(),
            connection
        });
    }

    /**
     * Handle a peer disconnection
     * @param {Object} data - The disconnection data
     */
    handlePeerDisconnected(data) {
        const { from } = data;

        // Check if we have a connection for this peer
        if (!this.connections.has(from)) {
            console.warn(`Received disconnection from unknown peer: ${from}`);
            return;
        }

        // Update connection status
        const connection = this.connections.get(from);
        connection.status = 'disconnected';

        // Notify the application
        this.onConnectionStateChange({
            remoteCode: from,
            state: 'disconnected',
            connection
        });

        // Remove the connection
        this.connections.delete(from);
    }

    /**
     * Handle an error
     * @param {Error} error - The error
     * @param {string} remoteCode - The remote peer code (if applicable)
     * @param {string} fileId - The file ID (if applicable)
     */
    handleError(error, remoteCode, fileId) {
        console.error(`Error:`, error);

        // Call the error handler
        this.onError(error, remoteCode, fileId);
    }

    /**
     * Send a typing indicator to a connected peer
     * @param {string} remoteCode - The unique code of the remote peer
     * @param {boolean} isTyping - Whether the user is typing
     */
    sendTypingIndicator(remoteCode, isTyping) {
        // Check if we're connected to this peer
        if (!this.connections.has(remoteCode)) {
            console.warn(`Not connected to ${remoteCode}, can't send typing indicator`);
            return;
        }

        // Get the connection
        const connection = this.connections.get(remoteCode);

        // Check if the connection is active
        if (connection.status !== 'connected') {
            console.warn(`Connection to ${remoteCode} is not active, can't send typing indicator`);
            return;
        }

        // Send the typing indicator
        this.socket.emit('typing', {
            uniqueCode: this.uniqueCode,
            targetCode: remoteCode,
            isTyping
        });
    }

    /**
     * Handle a typing indicator
     * @param {Object} data - The typing indicator data
     */
    handleTypingIndicator(data) {
        const { from, isTyping } = data;

        // Check if we have a connection for this peer
        if (!this.connections.has(from)) {
            console.warn(`Received typing indicator from unknown peer: ${from}`);
            return;
        }

        // Notify the application
        const event = new CustomEvent('typing-indicator', {
            detail: {
                from,
                isTyping
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Send a file to a connected peer
     * @param {string} remoteCode - The unique code of the remote peer
     * @param {Object} fileData - The file data
     * @returns {Promise} A promise that resolves when the file is sent
     */
    sendFile(remoteCode, fileData) {
        console.log(`Sending file to: ${remoteCode}`, fileData);

        return new Promise((resolve, reject) => {
            // Check if we're connected to this peer
            if (!this.connections.has(remoteCode)) {
                reject(new Error(`Not connected to ${remoteCode}`));
                return;
            }

            // Get the connection
            const connection = this.connections.get(remoteCode);

            // Check if the connection is active
            if (connection.status !== 'connected') {
                reject(new Error(`Connection to ${remoteCode} is not active`));
                return;
            }

            // Set up event listeners for file response
            const sentHandler = (data) => {
                if (data.targetCode === remoteCode && data.fileId === fileData.id) {
                    // Remove event listeners
                    this.socket.off('file-sent', sentHandler);
                    this.socket.off('file-error', errorHandler);

                    // Resolve the promise
                    resolve();
                }
            };

            const errorHandler = (data) => {
                if ((data.targetCode === remoteCode || !data.targetCode) && data.fileId === fileData.id) {
                    // Remove event listeners
                    this.socket.off('file-sent', sentHandler);
                    this.socket.off('file-error', errorHandler);

                    // Reject the promise
                    reject(new Error(data.error || 'Failed to send file'));
                }
            };

            // Add event listeners
            this.socket.on('file-sent', sentHandler);
            this.socket.on('file-error', errorHandler);

            // Send the file
            this.socket.emit('send-file', {
                uniqueCode: this.uniqueCode,
                targetCode: remoteCode,
                fileData
            });
        });
    }

    /**
     * Handle a received file
     * @param {Object} data - The file data
     */
    handleFileReceived(data) {
        const { from, fileData } = data;

        // Check if we have a connection for this peer
        if (!this.connections.has(from)) {
            console.warn(`Received file from unknown peer: ${from}`);
            return;
        }

        // Get the connection
        const connection = this.connections.get(from);

        // Notify the application
        const event = new CustomEvent('file-received', {
            detail: {
                from,
                fileData,
                connection
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Disconnect from all peers
        for (const [remoteCode] of this.connections) {
            this.disconnect(remoteCode);
        }

        // Disconnect from the server
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
