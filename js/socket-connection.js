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

        // Connect to the Socket.io server with better options
        try {
            // Determine the server URL based on the environment
            let serverUrl;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                serverUrl = window.location.origin;
            } else {
                // Use Render backend for production
                serverUrl = 'https://chat-application-7yim.onrender.com';
            }

            console.log(`Connecting to Socket.io server at ${serverUrl}`);

            this.socket = io(serverUrl, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000
            });
        } catch (error) {
            console.error('Error initializing Socket.io connection:', error);
            this.handleError(new Error(`Failed to initialize Socket.io: ${error.message}`));
        }

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
        this.socket.on('file-transfer-request', (data) => {
            console.log('File transfer request received:', data);
            this.handleFileTransferRequest(data);
        });

        this.socket.on('file-transfer-accepted', (data) => {
            console.log('File transfer accepted:', data);
            this.handleFileTransferAccepted(data);
        });

        this.socket.on('file-transfer-complete', (data) => {
            console.log('File transfer complete:', data);
            this.handleFileTransferComplete(data);
        });

        this.socket.on('file-transfer-error', (data) => {
            console.log('File transfer error:', data);
            this.handleError(new Error(data.error || 'File transfer error'), data.targetCode);
        });
    }

    /**
     * Connect to another user by code
     * @param {string} code
     */
    connect(code) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('connection-request', { code });
        } else {
            this.handleError(new Error('Not connected to server'));
        }
    }

    /**
     * Register this client with the server
     */
    register() {
        if (this.socket && this.uniqueCode) {
            this.socket.emit('register', { code: this.uniqueCode });
        }
    }

    /**
     * Handle incoming connection request
     * @param {Object} data
     */
    handleConnectionRequest(data) {
        // Accept all incoming requests for now (customize as needed)
        if (this.socket) {
            this.socket.emit('connection-accept', { code: data.code });
        }
        this.onConnectionStateChange('request-received', data);
    }

    /**
     * Handle connection accepted event
     * @param {Object} data
     */
    handleConnectionAccepted(data) {
        this.onConnectionStateChange('connected', data);
    }

    /**
     * Handle incoming message
     * @param {Object} data
     */
    handleMessage(data) {
        this.onMessage(data);
    }

    /**
     * Handle typing indicator
     * @param {Object} data
     */
    handleTypingIndicator(data) {
        // Implement typing indicator logic if needed
    }

    /**
     * Handle file transfer request
     * @param {Object} data
     */
    handleFileTransferRequest(data) {
        // Implement file transfer request logic
    }

    /**
     * Handle file transfer accepted event
     * @param {Object} data
     */
    handleFileTransferAccepted(data) {
        // Implement file transfer accepted logic
    }

    /**
     * Handle file transfer complete event
     * @param {Object} data
     */
    handleFileTransferComplete(data) {
        // Implement file transfer complete logic
    }

    /**
     * Handle errors
     * @param {Error} error
     * @param {string} [targetCode]
     */
    handleError(error, targetCode) {
        console.error(error);
        this.onError(error, targetCode);
    }
}
