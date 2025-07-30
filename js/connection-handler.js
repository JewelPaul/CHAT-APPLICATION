/**
 * Connection Handler
 * Manages Socket.io connections with improved error handling and fallback mechanisms
 */

// Determine the server URL based on the current environment
function getServerUrl() {
    // Use relative connection - connects to same origin as the frontend
    // This works for both local development and deployed environments
    return window.location.origin;
}

// Enhanced Socket.io connection with better error handling
class EnhancedSocketConnection extends SocketConnection {
    constructor(options) {
        super(options);

        // Add additional error handling and reconnection logic
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.isReconnecting = false;
    }

    setupSocketConnection() {
        console.log('Setting up enhanced Socket.io connection');

        try {
            // Connect to the Socket.io server with same-origin URL
            const serverUrl = getServerUrl();
            console.log(`Connecting to server at: ${serverUrl}`);

            this.socket = io(serverUrl, {
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 10000, // Max 10 seconds between attempts
                timeout: 10000 // 10 second connection timeout
            });

            // Set up all the standard event listeners from the parent class
            super.setupSocketConnection();

            // Add enhanced error handling
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.handleConnectionError(error);
            });

            this.socket.on('connect_timeout', (timeout) => {
                console.error('Connection timeout after', timeout, 'ms');
                this.handleError(new Error(`Connection timeout after ${timeout}ms`));
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log(`Reconnected after ${attemptNumber} attempts`);
                this.isReconnecting = false;

                // Notify the application
                document.dispatchEvent(new CustomEvent('socket-reconnected', {
                    detail: { attemptNumber }
                }));

                // Re-register with the server
                this.register();
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Reconnection attempt ${attemptNumber}`);
                this.isReconnecting = true;

                // Notify the application
                document.dispatchEvent(new CustomEvent('socket-reconnect-attempt', {
                    detail: { attemptNumber }
                }));
            });

            this.socket.on('reconnect_error', (error) => {
                console.error('Reconnection error:', error);

                // Notify the application
                document.dispatchEvent(new CustomEvent('socket-reconnect-error', {
                    detail: { error }
                }));
            });

            this.socket.on('reconnect_failed', () => {
                console.error('Failed to reconnect after all attempts');
                this.isReconnecting = false;

                // Notify the application
                document.dispatchEvent(new CustomEvent('socket-reconnect-failed'));

                // Show a more user-friendly error
                this.handleError(new Error('Failed to connect to the server after multiple attempts. Please check your internet connection and try again.'));
            });
        } catch (error) {
            console.error('Error setting up socket connection:', error);
            this.handleError(new Error(`Failed to set up socket connection: ${error.message}`));
        }
    }

    // Add connect() method for compatibility with UI
    connect(code) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('connection-request', { code });
        } else {
            this.handleError(new Error('Not connected to server'));
        }
    }

    handleConnectionError(error) {
        this.handleError(error);
    }
}
