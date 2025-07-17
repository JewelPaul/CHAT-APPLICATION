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

        // ... rest of your event listeners ...
    }

    // ... rest of your class ...
}
