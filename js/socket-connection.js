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
        // (add your file transfer logic here)
    }

    // ...rest of your class...
}
