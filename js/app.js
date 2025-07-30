/**
 * ChatWave - Main Application Script
 * This script handles the main functionality of the ChatWave application, including:
 * - User interface interactions
 * - Managing peer connections
 * - Handling messages
 * - Managing the application state
 */

// Application state
const state = {
    // User information
    user: {
        deviceName: null,
        uniqueCode: null,
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMzEgMjMxIj48cGF0aCBkPSJNMzMuODMsMzMuODNhMTE1LjUsMTE1LjUsMCwxLDEsMCwxNjMuMzQsMTE1LjQ5LDExNS40OSwwLDAsMSwwLTE2My4zNFoiIHN0eWxlPSJmaWxsOiNkMWQxZDE7Ii8+PHBhdGggZD0ibTE1Ny4zLDEyOS40NWMtNi44LDMuNC0xNC44NSw1LjEtMjMuNyw1LjEtOC44NSwwLTE2LjktMS43LTIzLjctNS4xLTIzLjI1LDUuMS00My4zNSwyMC40LTQzLjM1LDQxLjY1LDAsMCwwLDQyLjUsMCw4LjUsMCwwLDEzLjYsMCwxMy42LDAsMCw0Mi41LDAsMCwwLDAsOC41LDAsMTMuNiwwLDEzLjYsMCw0Mi41LDAsMCwwLDAsODUsMCwwLDQyLjUsMCw0Mi41LDAsMCwyMS4yNS0yMC40LDQzLjM1LTQzLjM1LTQzLjM1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48cGF0aCBkPSJtMTMzLjYsMTI3Ljc1YzE2LjE1LDAsMjkuNzUtMTMuNiwyOS43NS0zOC4yNSwwLTE1LjMtMTMuNi0yOS43NS0yOS43NS0yOS43NXMtMjkuNzUsMTQuNDUtMjkuNzUsMjkuNzVjMCwyNC42NSwxMy42LDM4LjI1LDI5Ljc1LDM4LjI1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48L3N2Zz4='
    },

    // Active connections
    connections: new Map(),

    // Current active chat
    activeChat: null,

    // Socket connection manager
    socketConnection: null,

    // Pending connection request
    pendingRequest: null,

    // Message history (in-memory only, not persisted)
    messages: new Map(),

    // Encryption keys for each connection
    encryptionKeys: new Map()
};

/**
 * Encryption utilities using CryptoJS
 */
const EncryptionUtils = {
    /**
     * Generate a random encryption key
     * @returns {string} A random encryption key
     */
    generateKey() {
        return CryptoJS.lib.WordArray.random(256/8).toString();
    },

    /**
     * Encrypt a message using AES encryption
     * @param {string} message - The message to encrypt
     * @param {string} key - The encryption key
     * @returns {string} The encrypted message
     */
    encrypt(message, key) {
        try {
            const encrypted = CryptoJS.AES.encrypt(message, key).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt message');
        }
    },

    /**
     * Decrypt a message using AES decryption
     * @param {string} encryptedMessage - The encrypted message
     * @param {string} key - The encryption key
     * @returns {string} The decrypted message
     */
    decrypt(encryptedMessage, key) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
            const message = decrypted.toString(CryptoJS.enc.Utf8);
            if (!message) {
                throw new Error('Failed to decrypt message - invalid key or corrupted data');
            }
            return message;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt message');
        }
    },

    /**
     * Generate a shared encryption key from two unique codes
     * @param {string} code1 - First unique code
     * @param {string} code2 - Second unique code
     * @returns {string} The shared encryption key
     */
    generateSharedKey(code1, code2) {
        // Create a deterministic key by combining and hashing the codes
        const combined = [code1, code2].sort().join('-');
        return CryptoJS.SHA256(combined).toString();
    }
};

// DOM Elements
const elements = {
    // Connection request modal
    connectionRequestModal: document.getElementById('connection-request-modal'),
    requestFromCode: document.getElementById('request-from-code'),
    acceptConnectionBtn: document.getElementById('accept-connection-btn'),
    rejectConnectionBtn: document.getElementById('reject-connection-btn'),

    // Connection waiting modal
    connectionWaitingModal: document.getElementById('connection-waiting-modal'),
    waitingForCode: document.getElementById('waiting-for-code'),
    closeWaitingModal: document.getElementById('close-waiting-modal'),
    cancelWaitingBtn: document.getElementById('cancel-waiting-btn'),
    // Welcome screen
    welcomeScreen: document.getElementById('welcome-screen'),
    deviceName: document.getElementById('device-name'),
    uniqueCode: document.getElementById('unique-code'),
    copyCodeBtn: document.getElementById('copy-code-btn'),
    connectCode: document.getElementById('connect-code'),
    connectBtn: document.getElementById('connect-btn'),
    welcomeUserAvatar: document.getElementById('welcome-user-avatar'),
    avatarUploadInput: document.getElementById('avatar-upload-input'),

    // Chat interface
    chatInterface: document.getElementById('chat-interface'),
    userName: document.getElementById('user-name'),
    userStatus: document.getElementById('user-status'),
    sidebarUniqueCode: document.getElementById('sidebar-unique-code'),
    sidebarCopyCodeBtn: document.getElementById('sidebar-copy-code-btn'),
    connectionsList: document.getElementById('connections-list'),
    connections: document.getElementById('connections'),
    emptyConnectionsMessage: document.getElementById('empty-connections-message'),
    newConnectionBtn: document.getElementById('new-connection-btn'),
    disconnectAllBtn: document.getElementById('disconnect-all-btn'),

    // Mobile navigation
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    backButton: document.getElementById('back-button'),

    // Chat main
    chatUserName: document.getElementById('chat-user-name'),
    chatUserStatus: document.getElementById('chat-user-status'),
    chatUserAvatar: document.getElementById('chat-user-avatar'),
    messagesContainer: document.getElementById('messages-container'),
    emptyChatMessage: document.getElementById('empty-chat-message'),
    typingIndicator: document.getElementById('typing-indicator'),
    messageInput: document.getElementById('message-input'),
    sendButton: document.getElementById('send-button'),
    attachmentButton: document.getElementById('attachment-button'),
    infoButton: document.getElementById('info-button'),
    disconnectButton: document.getElementById('disconnect-button'),

    // Info panel
    infoPanel: document.getElementById('info-panel'),
    closeInfoPanel: document.getElementById('close-info-panel'),
    infoUserName: document.getElementById('info-user-name'),
    infoUserDevice: document.getElementById('info-user-device'),
    infoUserAvatar: document.getElementById('info-user-avatar'),
    infoConnectionStatus: document.getElementById('info-connection-status'),
    infoConnectionTime: document.getElementById('info-connection-time'),
    infoUniqueCode: document.getElementById('info-unique-code'),
    infoDisconnectBtn: document.getElementById('info-disconnect-btn'),

    // Connection modal
    connectionModal: document.getElementById('connection-modal'),
    modalConnectCode: document.getElementById('modal-connect-code'),
    closeConnectionModal: document.getElementById('close-connection-modal'),
    cancelConnectionBtn: document.getElementById('cancel-connection-btn'),
    confirmConnectionBtn: document.getElementById('confirm-connection-btn'),

    // Notifications
    notificationsContainer: document.getElementById('notifications-container'),

    // Connection Status
    connectionStatus: document.getElementById('connection-status'),
    connectingStatus: document.getElementById('connecting-status'),
    connectingCode: document.getElementById('connecting-code'),
    connectionError: document.getElementById('connection-error'),
    errorMessage: document.getElementById('error-message')
};

/**
 * Initialize the application
 */
function initApp() {
    // Add global error handler
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', message, source, lineno, colno, error);
        showNotification(`Error: ${message}`, 'error');
        return false;
    };

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showNotification(`Error: ${event.reason}`, 'error');
    });

    // Initialize state
    state.isTyping = false;
    state.typingTimeout = null;
    state.typingUsers = new Map();
    state.fileTransfers = new Map();

    // Generate a unique code for this session
    state.user.uniqueCode = generateUniqueCode();

    // Detect device name
    state.user.deviceName = detectDeviceName();

    // Update UI with user information
    updateUserInfo();

    // Initialize socket connection
    initSocketConnection();

    // Set up event listeners
    setupEventListeners();

    // Check for pending connection requests in localStorage
    checkPendingConnectionRequests();

    // Show welcome screen
    showWelcomeScreen();
}

/**
 * Generate a unique code for this session
 * @returns {string} A unique 6-character code
 */
function generateUniqueCode() {
    // Generate a random 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }

    return code;
}

/**
 * Detect the user's device name
 * @returns {string} The detected device name
 */
function detectDeviceName() {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';

    // Detect common device types
    if (/iPhone/.test(userAgent)) {
        deviceName = 'iPhone';
    } else if (/iPad/.test(userAgent)) {
        deviceName = 'iPad';
    } else if (/Android/.test(userAgent)) {
        deviceName = 'Android Device';
        if (/Mobile/.test(userAgent)) {
            deviceName = 'Android Phone';
        } else {
            deviceName = 'Android Tablet';
        }
    } else if (/Mac/.test(platform)) {
        deviceName = 'Mac';
    } else if (/Win/.test(platform)) {
        deviceName = 'Windows PC';
    } else if (/Linux/.test(platform)) {
        deviceName = 'Linux Device';
    }

    // Add a random identifier to make it unique
    const randomId = Math.floor(Math.random() * 1000);
    return `${deviceName} ${randomId}`;
}

/**
 * Update the UI with user information
 */
function updateUserInfo() {
    // Update welcome screen
    elements.deviceName.textContent = state.user.deviceName;
    elements.uniqueCode.textContent = state.user.uniqueCode;
    elements.welcomeUserAvatar.src = state.user.avatar;

    // Update chat interface
    elements.userName.textContent = state.user.deviceName;
    elements.sidebarUniqueCode.textContent = state.user.uniqueCode;
    document.getElementById('user-avatar').src = state.user.avatar;
}

/**
 * Initialize the socket connection
 */
function initSocketConnection() {
    try {
        console.log('Initializing socket connection with unique code:', state.user.uniqueCode);
        state.socketConnection = new SocketConnection({
            uniqueCode: state.user.uniqueCode,
            onMessage: handleIncomingMessage,
            onConnectionStateChange: handleConnectionStateChange,
            onError: handleConnectionError
        });
        console.log('Socket connection initialized successfully');
    } catch (error) {
        console.error('Error initializing socket connection:', error);
        showNotification(`Error connecting to server: ${error.message}. Please refresh the page.`, 'error');
    }
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
    // Connection request event listener
    document.addEventListener('connection-request-received', handleConnectionRequest);

    // Typing indicator event listener
    document.addEventListener('typing-indicator', handleTypingIndicator);

    // File received event listener
    document.addEventListener('file-received', handleFileReceived);

    // Footer button and modal
    const footerButton = document.getElementById('footer-button');
    const footerModal = document.getElementById('footer-modal');
    const closeFooterModal = document.getElementById('close-footer-modal');

    if (footerButton && footerModal && closeFooterModal) {
        footerButton.addEventListener('click', () => {
            footerModal.classList.add('active');
        });

        closeFooterModal.addEventListener('click', () => {
            footerModal.classList.remove('active');
        });

        // Close modal when clicking outside
        footerModal.addEventListener('click', (event) => {
            if (event.target === footerModal) {
                footerModal.classList.remove('active');
            }
        });
    }

    // Socket reconnection event listeners
    document.addEventListener('socket-reconnected', (event) => {
        const { attemptNumber } = event.detail;
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        showNotification(`Connection restored after ${attemptNumber} attempts`, 'success');

        // Update all connections to show they're back online
        state.connections.forEach((connection, code) => {
            connection.status = 'online';
            updateConnectionsList();

            if (state.activeChat === code) {
                updateActiveChatInfo();
            }
        });
    });

    document.addEventListener('socket-reconnect-attempt', (event) => {
        const { attemptNumber } = event.detail;
        console.log(`Socket reconnection attempt ${attemptNumber}`);

        if (attemptNumber === 1) {
            showNotification('Connection lost. Attempting to reconnect...', 'warning');
        }

        // Update all connections to show they're reconnecting
        state.connections.forEach((connection) => {
            connection.status = 'reconnecting';
        });
        updateConnectionsList();

        if (state.activeChat) {
            updateActiveChatInfo();
        }
    });

    document.addEventListener('socket-reconnect-error', (event) => {
        console.error('Socket reconnection error:', event.detail.error);
    });

    document.addEventListener('socket-reconnect-failed', () => {
        console.error('Socket reconnection failed after all attempts');
        showNotification('Failed to reconnect. Please refresh the page.', 'error', 0);

        // Update all connections to show they're offline
        state.connections.forEach((connection) => {
            connection.status = 'offline';
        });
        updateConnectionsList();

        if (state.activeChat) {
            updateActiveChatInfo();
        }
    });

    // Connection request modal buttons
    elements.acceptConnectionBtn.addEventListener('click', () => {
        const fromCode = elements.requestFromCode.textContent;
        acceptConnectionRequest(fromCode);
    });

    elements.rejectConnectionBtn.addEventListener('click', () => {
        hideConnectionRequestModal();
        showNotification('Connection request rejected', 'info');
    });

    // Connection waiting modal buttons
    elements.closeWaitingModal.addEventListener('click', () => {
        hideConnectionWaitingModal();
    });

    elements.cancelWaitingBtn.addEventListener('click', () => {
        hideConnectionWaitingModal();
        showNotification('Connection request canceled', 'info');
    });

    // Avatar upload
    elements.avatarUploadInput.addEventListener('change', handleAvatarUpload);

    // Copy code buttons
    elements.copyCodeBtn.addEventListener('click', () => {
        copyToClipboard(state.user.uniqueCode);
        showNotification('Code copied to clipboard', 'success');
    });

    elements.sidebarCopyCodeBtn.addEventListener('click', () => {
        copyToClipboard(state.user.uniqueCode);
        showNotification('Code copied to clipboard', 'success');
    });

    // Connect buttons
    elements.connectBtn.addEventListener('click', () => {
        const code = elements.connectCode.value.trim().toUpperCase();
        if (code) {
            connectToPeer(code);
            elements.connectCode.value = '';
        }
    });

    // New connection button
    elements.newConnectionBtn.addEventListener('click', () => {
        showConnectionModal();
    });

    // Disconnect all button
    elements.disconnectAllBtn.addEventListener('click', () => {
        disconnectAllPeers();
    });

    // Mobile menu toggle
    elements.mobileMenuToggle.addEventListener('click', () => {
        document.querySelector('.chat-sidebar').classList.toggle('active');
    });

    // Back button
    elements.backButton.addEventListener('click', () => {
        document.querySelector('.chat-sidebar').classList.toggle('active');
    });

    // Info button
    elements.infoButton.addEventListener('click', () => {
        elements.infoPanel.classList.add('active');
    });

    // Close info panel
    elements.closeInfoPanel.addEventListener('click', () => {
        elements.infoPanel.classList.remove('active');
    });

    // Disconnect button
    elements.disconnectButton.addEventListener('click', () => {
        if (state.activeChat) {
            disconnectPeer(state.activeChat);
        }
    });

    // Info disconnect button
    elements.infoDisconnectBtn.addEventListener('click', () => {
        if (state.activeChat) {
            disconnectPeer(state.activeChat);
            elements.infoPanel.classList.remove('active');
        }
    });

    // Connection modal
    elements.closeConnectionModal.addEventListener('click', () => {
        hideConnectionModal();
    });

    elements.cancelConnectionBtn.addEventListener('click', () => {
        hideConnectionModal();
    });

    elements.confirmConnectionBtn.addEventListener('click', () => {
        const code = elements.modalConnectCode.value.trim().toUpperCase();
        if (code) {
            connectToPeer(code);
            hideConnectionModal();
            elements.modalConnectCode.value = '';
        }
    });

    // Send message
    elements.sendButton.addEventListener('click', sendMessage);

    // File attachment
    elements.attachmentButton.addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            sendFile(file);
            // Reset the file input so the same file can be selected again
            event.target.value = '';
        }
    });

    elements.messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        } else if (state.activeChat) {
            // Send typing indicator
            sendTypingIndicator(true);

            // Clear any existing typing timeout
            if (state.typingTimeout) {
                clearTimeout(state.typingTimeout);
            }

            // Set a timeout to stop the typing indicator after 2 seconds of inactivity
            state.typingTimeout = setTimeout(() => {
                sendTypingIndicator(false);
            }, 2000);
        }
    });

    // Also handle input events for paste, cut, etc.
    elements.messageInput.addEventListener('input', () => {
        if (state.activeChat) {
            // Send typing indicator
            sendTypingIndicator(true);

            // Clear any existing typing timeout
            if (state.typingTimeout) {
                clearTimeout(state.typingTimeout);
            }

            // Set a timeout to stop the typing indicator after 2 seconds of inactivity
            state.typingTimeout = setTimeout(() => {
                sendTypingIndicator(false);
            }, 2000);
        }
    });

    // Handle blur event to stop typing indicator
    elements.messageInput.addEventListener('blur', () => {
        if (state.activeChat && state.isTyping) {
            sendTypingIndicator(false);
        }
    });

    // Handle Enter key on connect input
    elements.connectCode.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const code = elements.connectCode.value.trim().toUpperCase();
            if (code) {
                connectToPeer(code);
                elements.connectCode.value = '';
            }
        }
    });

    // Handle Enter key on modal connect input
    elements.modalConnectCode.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const code = elements.modalConnectCode.value.trim().toUpperCase();
            if (code) {
                connectToPeer(code);
                hideConnectionModal();
                elements.modalConnectCode.value = '';
            }
        }
    });
}

/**
 * Show the welcome screen
 */
function showWelcomeScreen() {
    elements.welcomeScreen.classList.remove('hidden');
    elements.chatInterface.classList.add('hidden');
}

/**
 * Show the chat interface
 */
function showChatInterface() {
    elements.welcomeScreen.classList.add('hidden');
    elements.chatInterface.classList.remove('hidden');
}

/**
 * Show the connection modal
 */
function showConnectionModal() {
    elements.connectionModal.classList.add('active');
    elements.modalConnectCode.focus();
}

/**
 * Hide the connection modal
 */
function hideConnectionModal() {
    elements.connectionModal.classList.remove('active');
}

/**
 * Connect to a peer using their unique code
 * @param {string} code - The unique code of the peer to connect to
 */
function connectToPeer(code) {
    // Don't connect to ourselves
    if (code === state.user.uniqueCode) {
        showNotification('Cannot connect to yourself', 'error');
        return;
    }

    // Check if we're already connected to this peer
    if (state.connections.has(code)) {
        showNotification('Already connected to this peer', 'info');
        setActiveChat(code);
        return;
    }

    // Show waiting modal
    elements.waitingForCode.textContent = code;
    showConnectionWaitingModal();

    // Show connecting notification
    showNotification(`Sending connection request to ${code}...`, 'info');

    try {
        // Connect to the peer
        state.socketConnection.connect(code)
            .then(connection => {
                console.log('Connection successful:', connection);
                // Hide the waiting modal
                hideConnectionWaitingModal();

                // Add the connection to our state
                state.connections.set(code, {
                    code,
                    deviceName: `Peer ${code}`,
                    avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMzEgMjMxIj48cGF0aCBkPSJNMzMuODMsMzMuODNhMTE1LjUsMTE1LjUsMCwxLDEsMCwxNjMuMzQsMTE1LjQ5LDExNS40OSwwLDAsMSwwLTE2My4zNFoiIHN0eWxlPSJmaWxsOiNkMWQxZDE7Ii8+PHBhdGggZD0ibTE1Ny4zLDEyOS40NWMtNi44LDMuNC0xNC44NSw1LjEtMjMuNyw1LjEtOC44NSwwLTE2LjktMS43LTIzLjctNS4xLTIzLjI1LDUuMS00My4zNSwyMC40LTQzLjM1LDQxLjY1LDAsMCwwLDQyLjUsMCw4LjUsMCwwLDEzLjYsMCwxMy42LDAsMCw0Mi41LDAsMCwwLDAsOC41LDAsMTMuNiwwLDEzLjYsMCw0Mi41LDAsMCwwLDAsODUsMCwwLDQyLjUsMCw0Mi41LDAsMCwyMS4yNS0yMC40LDQzLjM1LTQzLjM1LTQzLjM1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48cGF0aCBkPSJtMTMzLjYsMTI3Ljc1YzE2LjE1LDAsMjkuNzUtMTMuNiwyOS43NS0zOC4yNSwwLTE1LjMtMTMuNi0yOS43NS0yOS43NS0yOS43NXMtMjkuNzUsMTQuNDUtMjkuNzUsMjkuNzVjMCwyNC42NSwxMy42LDM4LjI1LDI5Ljc1LDM4LjI1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48L3N2Zz4=',
                    status: 'online',
                    connectionTime: new Date(),
                    connection
                });

                // Generate and store encryption key for this connection
                const encryptionKey = EncryptionUtils.generateSharedKey(state.user.uniqueCode, code);
                state.encryptionKeys.set(code, encryptionKey);
                console.log(`Generated encryption key for ${code}`);

                // Update the UI
                updateConnectionsList();

                // Set as active chat
                setActiveChat(code);

                // Show success notification
                showNotification(`Connected to ${code}`, 'success');

                // Switch to chat interface if we're on the welcome screen
                if (!elements.welcomeScreen.classList.contains('hidden')) {
                    showChatInterface();
                }
            })
            .catch(error => {
                console.error('Connection error:', error);
                // Hide the waiting modal
                hideConnectionWaitingModal();

                // Show error message
                let errorMsg = '';
                if (error.message.includes('Peer not found')) {
                    errorMsg = `Connection failed: The peer with code ${code} was not found. Make sure the code is correct and the peer is online.`;
                } else if (error.message.includes('inactive')) {
                    errorMsg = `Connection failed: The peer with code ${code} is inactive. They may have closed their browser or lost connection.`;
                } else {
                    errorMsg = `Failed to connect: ${error.message}`;
                }

                // Show error notification
                showNotification(errorMsg, 'error');
            });
    } catch (error) {
        console.error('Error initiating connection:', error);
        hideConnectionWaitingModal();
        showNotification(`Error initiating connection: ${error.message}`, 'error');
    }
}

/**
 * Disconnect from a peer
 * @param {string} code - The unique code of the peer to disconnect from
 */
function disconnectPeer(code) {
    // Check if we're connected to this peer
    if (!state.connections.has(code)) {
        return;
    }

    // Disconnect from the peer
    state.socketConnection.disconnect(code);

    // Remove the connection from our state
    state.connections.delete(code);

    // Remove the encryption key
    state.encryptionKeys.delete(code);

    // Update the UI
    updateConnectionsList();

    // If this was the active chat, clear it
    if (state.activeChat === code) {
        state.activeChat = null;
        clearChatArea();
    }

    // Show notification
    showNotification(`Disconnected from ${code}`, 'info');

    // If we have no more connections and we're in the chat interface, go back to welcome screen
    if (state.connections.size === 0 && elements.welcomeScreen.classList.contains('hidden')) {
        showWelcomeScreen();
    }
}

/**
 * Disconnect from all peers
 */
function disconnectAllPeers() {
    try {
        // Disconnect from all peers
        for (const [code] of state.connections) {
            state.socketConnection.disconnect(code);
        }

        // Clear our state
        state.connections.clear();
        state.encryptionKeys.clear();
        state.activeChat = null;

        // Update the UI
        updateConnectionsList();
        clearChatArea();

        // Show notification
        showNotification('Disconnected from all peers', 'info');

        // Go back to welcome screen
        showWelcomeScreen();
    } catch (error) {
        console.error('Error disconnecting from all peers:', error);
        showNotification(`Error disconnecting: ${error.message}`, 'error');
    }
}

/**
 * Update the connections list in the UI
 */
function updateConnectionsList() {
    // Clear the list
    elements.connections.innerHTML = '';

    // Show/hide empty message
    if (state.connections.size === 0) {
        elements.emptyConnectionsMessage.classList.remove('hidden');
    } else {
        elements.emptyConnectionsMessage.classList.add('hidden');
    }

    // Add each connection to the list
    for (const [code, connection] of state.connections.entries()) {
        const li = document.createElement('li');
        li.className = `connection-item ${state.activeChat === code ? 'active' : ''}`;
        li.dataset.code = code;

        // Determine the status text and class
        let statusText = connection.status;
        let statusClass = connection.status;

        if (connection.status === 'reconnecting') {
            statusText = 'Reconnecting...';
        } else if (connection.status === 'offline') {
            statusText = 'Offline';
        } else {
            statusText = 'Online';
        }

        li.innerHTML = `
            <div class="connection-avatar">
                <img src="${connection.avatar}" alt="${connection.deviceName}">
                <span class="status-indicator ${statusClass}"></span>
            </div>
            <div class="connection-info">
                <h3>${connection.deviceName}</h3>
                <p>${statusText}</p>
            </div>
            <div class="connection-actions">
                <button class="connection-action-btn disconnect-btn" title="Disconnect">
                    <i class="fas fa-unlink"></i>
                </button>
            </div>
        `;

        // Add click event to set as active chat
        li.addEventListener('click', (event) => {
            // Don't trigger if the disconnect button was clicked
            if (event.target.closest('.disconnect-btn')) {
                return;
            }

            setActiveChat(code);
        });

        // Add click event to disconnect button
        const disconnectBtn = li.querySelector('.disconnect-btn');
        disconnectBtn.addEventListener('click', () => {
            disconnectPeer(code);
        });

        elements.connections.appendChild(li);
    }
}

/**
 * Set the active chat
 * @param {string} code - The unique code of the peer to chat with
 */
function setActiveChat(code) {
    // Check if we're connected to this peer
    if (!state.connections.has(code)) {
        return;
    }

    // Set as active chat
    state.activeChat = code;

    // Update the UI
    updateConnectionsList();
    updateChatHeader();
    updateInfoPanel();
    loadMessages();

    // On mobile, hide the sidebar
    if (window.innerWidth < 768) {
        document.querySelector('.chat-sidebar').classList.remove('active');
    }

    // Focus the message input
    elements.messageInput.focus();
}

/**
 * Update the chat header with the active chat information
 */
function updateChatHeader() {
    if (!state.activeChat || !state.connections.has(state.activeChat)) {
        return;
    }

    const connection = state.connections.get(state.activeChat);

    // Determine the status text
    let statusText = connection.status;
    if (connection.status === 'reconnecting') {
        statusText = 'Reconnecting...';
    } else if (connection.status === 'offline') {
        statusText = 'Offline';
    } else {
        statusText = 'Online';
    }

    elements.chatUserName.textContent = connection.deviceName;
    elements.chatUserStatus.textContent = statusText;
    elements.chatUserAvatar.src = connection.avatar;

    // Update the status indicator
    const statusIndicator = elements.chatUserAvatar.nextElementSibling;
    if (statusIndicator && statusIndicator.classList.contains('status-indicator')) {
        statusIndicator.className = `status-indicator ${connection.status}`;
    }
}

/**
 * Update all information related to the active chat
 */
function updateActiveChatInfo() {
    if (!state.activeChat) {
        return;
    }

    updateChatHeader();
    updateInfoPanel();
}

/**
 * Update the info panel with the active chat information
 */
function updateInfoPanel() {
    if (!state.activeChat || !state.connections.has(state.activeChat)) {
        return;
    }

    const connection = state.connections.get(state.activeChat);

    // Determine the status text
    let statusText = connection.status;
    if (connection.status === 'reconnecting') {
        statusText = 'Reconnecting...';
    } else if (connection.status === 'offline') {
        statusText = 'Offline';
    } else {
        statusText = 'Online';
    }

    elements.infoUserName.textContent = connection.deviceName;
    elements.infoUserDevice.textContent = connection.deviceName;
    elements.infoUserAvatar.src = connection.avatar;
    elements.infoConnectionStatus.textContent = statusText;
    elements.infoUniqueCode.textContent = connection.code;

    // Format connection time
    const connectionTime = connection.connectionTime;
    const now = new Date();
    const diffMs = now - connectionTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        elements.infoConnectionTime.textContent = 'Just now';
    } else if (diffMins === 1) {
        elements.infoConnectionTime.textContent = '1 minute ago';
    } else if (diffMins < 60) {
        elements.infoConnectionTime.textContent = `${diffMins} minutes ago`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) {
            elements.infoConnectionTime.textContent = '1 hour ago';
        } else {
            elements.infoConnectionTime.textContent = `${diffHours} hours ago`;
        }
    }
}

/**
 * Clear the chat area
 */
function clearChatArea() {
    elements.messagesContainer.innerHTML = '';
    elements.emptyChatMessage.classList.remove('hidden');
    elements.chatUserName.textContent = 'Select a chat';
    elements.chatUserStatus.textContent = '';
    elements.chatUserAvatar.src = 'images/default-avatar.png';
}

/**
 * Load messages for the active chat
 */
function loadMessages() {
    // Clear the messages container
    elements.messagesContainer.innerHTML = '';

    // Check if we have an active chat
    if (!state.activeChat) {
        elements.emptyChatMessage.classList.remove('hidden');
        return;
    }

    // Get messages for the active chat
    const messages = state.messages.get(state.activeChat) || [];

    // Show/hide empty message
    if (messages.length === 0) {
        elements.emptyChatMessage.classList.remove('hidden');
    } else {
        elements.emptyChatMessage.classList.add('hidden');
    }

    // Add each message to the container
    for (const message of messages) {
        addMessageToUI(message);
    }

    // Scroll to bottom
    scrollToBottom();
}

/**
 * Add a message to the UI
 * @param {Object} message - The message to add
 * @param {boolean} isSending - Whether the message is currently being sent
 * @returns {HTMLElement} The message element that was added to the UI
 */
function addMessageToUI(message, isSending = false) {
    const isOutgoing = message.sender === state.user.uniqueCode;
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    messageEl.dataset.messageId = message.id;

    // Format timestamp
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Determine the status icon for outgoing messages
    let statusIcon = '';
    if (isOutgoing) {
        if (isSending) {
            statusIcon = '<span class="message-status sending" title="Sending..."><i class="fas fa-spinner fa-spin"></i></span>';
        } else {
            statusIcon = '<span class="message-status sent" title="Sent"><i class="fas fa-check"></i></span>';
        }
    }

    messageEl.innerHTML = `
        <div class="message-avatar">
            <img src="${isOutgoing ? state.user.avatar : state.connections.get(state.activeChat).avatar}" alt="Avatar">
        </div>
        <div class="message-content">
            <div class="message-text">${escapeHTML(message.text)}</div>
            <div class="message-meta">
                <span class="message-time">${timeString}</span>
                ${statusIcon}
            </div>
        </div>
    `;

    elements.messagesContainer.appendChild(messageEl);
    elements.emptyChatMessage.classList.add('hidden');

    // Scroll to bottom
    scrollToBottom();

    return messageEl;
}

/**
 * Scroll the messages container to the bottom
 */
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

/**
 * Send a message to the active chat
 */
function sendMessage() {
    try {
        // Check if we have an active chat
        if (!state.activeChat) {
            return;
        }

        // Get the message text
        const text = elements.messageInput.value.trim();

        // Don't send empty messages
        if (!text) {
            return;
        }

        // Disable the send button to prevent double-sending
        elements.sendButton.disabled = true;
        elements.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Create the message object
        const message = {
            id: uuidv4(),
            sender: state.user.uniqueCode,
            receiver: state.activeChat,
            text,
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        console.log('Sending message:', message);

        // Get the encryption key for this connection
        const encryptionKey = state.encryptionKeys.get(state.activeChat);
        if (!encryptionKey) {
            console.error('No encryption key found for connection:', state.activeChat);
            showNotification('Connection not properly established. Please reconnect.', 'error');
            // Re-enable the send button
            elements.sendButton.disabled = false;
            elements.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
            return;
        }

        // Encrypt the message text for transmission
        let encryptedMessage;
        try {
            encryptedMessage = {
                ...message,
                text: EncryptionUtils.encrypt(text, encryptionKey),
                encrypted: true
            };
            console.log('Message encrypted for transmission');
        } catch (error) {
            console.error('Failed to encrypt message:', error);
            showNotification('Failed to encrypt message. Please try again.', 'error');
            // Re-enable the send button
            elements.sendButton.disabled = false;
            elements.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
            return;
        }

        // Clear the input immediately for better UX
        elements.messageInput.value = '';

        // Add the message to the UI with a 'sending' status
        const messageEl = addMessageToUI(message, true);

        // Store the message (unencrypted for local display)
        storeMessage(message);

        // Send the encrypted message
        state.socketConnection.sendMessage(state.activeChat, encryptedMessage)
            .then(() => {
                console.log('Message sent successfully');
                // Update the message UI to show 'sent' status
                if (messageEl) {
                    const statusIcon = messageEl.querySelector('.message-status');
                    if (statusIcon) {
                        statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                        statusIcon.classList.remove('sending');
                        statusIcon.classList.add('sent');
                    }
                }
            })
            .catch(error => {
                console.error('Error sending message:', error);
                // Update the message UI to show 'failed' status
                if (messageEl) {
                    const statusIcon = messageEl.querySelector('.message-status');
                    if (statusIcon) {
                        statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                        statusIcon.classList.remove('sending');
                        statusIcon.classList.add('failed');
                        statusIcon.title = 'Failed to send: ' + error.message;
                    }
                }
                showNotification(`Failed to send message: ${error.message}. Tap to retry.`, 'error', 10000)
                    .addEventListener('click', () => {
                        // Retry sending the message
                        retrySendMessage(message, messageEl);
                    });
            })
            .finally(() => {
                // Re-enable the send button
                elements.sendButton.disabled = false;
                elements.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
                // Focus the input field again
                elements.messageInput.focus();
            });
    } catch (error) {
        console.error('Error in sendMessage function:', error);
        showNotification(`Error sending message: ${error.message}`, 'error');

        // Re-enable the send button
        elements.sendButton.disabled = false;
        elements.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

/**
 * Retry sending a failed message
 * @param {Object} message - The message to retry sending
 * @param {HTMLElement} messageEl - The message element in the UI
 */
function retrySendMessage(message, messageEl) {
    console.log('Retrying message send:', message);

    // Update the UI to show 'sending' status
    if (messageEl) {
        const statusIcon = messageEl.querySelector('.message-status');
        if (statusIcon) {
            statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            statusIcon.classList.remove('failed');
            statusIcon.classList.add('sending');
            statusIcon.title = 'Sending...';
        }
    }

    // Send the message again
    state.socketConnection.sendMessage(message.receiver, message)
        .then(success => {
            console.log('Message resent successfully');
            // Update the message UI to show 'sent' status
            if (messageEl) {
                const statusIcon = messageEl.querySelector('.message-status');
                if (statusIcon) {
                    statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                    statusIcon.classList.remove('sending');
                    statusIcon.classList.add('sent');
                    statusIcon.title = 'Sent';
                }
            }
            showNotification('Message sent successfully', 'success');
        })
        .catch(error => {
            console.error('Error resending message:', error);
            // Update the message UI to show 'failed' status
            if (messageEl) {
                const statusIcon = messageEl.querySelector('.message-status');
                if (statusIcon) {
                    statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                    statusIcon.classList.remove('sending');
                    statusIcon.classList.add('failed');
                    statusIcon.title = 'Failed to send: ' + error.message;
                }
            }
            showNotification(`Failed to send message: ${error.message}. Tap to retry.`, 'error', 10000)
                .addEventListener('click', () => {
                    // Retry sending the message again
                    retrySendMessage(message, messageEl);
                });
        });
}

/**
 * Handle an incoming message
 * @param {Object} event - The message event
 */
function handleIncomingMessage(event) {
    const { from, data } = event;

    // Get the encryption key for this connection
    const encryptionKey = state.encryptionKeys.get(from);
    if (!encryptionKey) {
        console.error('No encryption key found for incoming message from:', from);
        showNotification(`Received message from ${from} but connection not properly established`, 'warning');
        return;
    }

    let decryptedMessage;
    try {
        // Decrypt the message if it's encrypted
        if (data.encrypted && data.text) {
            const decryptedText = EncryptionUtils.decrypt(data.text, encryptionKey);
            decryptedMessage = {
                ...data,
                text: decryptedText,
                encrypted: false // Mark as decrypted for local storage
            };
            console.log('Message decrypted successfully');
        } else {
            // Message is not encrypted (backwards compatibility)
            decryptedMessage = data;
            console.log('Received unencrypted message');
        }
    } catch (error) {
        console.error('Failed to decrypt message:', error);
        showNotification(`Failed to decrypt message from ${from}. The message may be corrupted.`, 'error');
        return;
    }

    // Store the decrypted message
    storeMessage(decryptedMessage);

    // If this is from the active chat, add it to the UI
    if (state.activeChat === from) {
        addMessageToUI(decryptedMessage);
    } else {
        // Show a notification
        showNotification(`New message from ${from}`, 'info');
    }
}

/**
 * Store a message in the message history
 * @param {Object} message - The message to store
 */
function storeMessage(message) {
    const chatId = message.sender === state.user.uniqueCode ? message.receiver : message.sender;

    // Initialize the message array if it doesn't exist
    if (!state.messages.has(chatId)) {
        state.messages.set(chatId, []);
    }

    // Add the message to the array
    state.messages.get(chatId).push(message);
}

/**
 * Handle connection state changes
 * @param {Object} event - The state change event
 */
function handleConnectionStateChange(event) {
    const { remoteCode, state: connectionState } = event;

    // Update the connection status
    if (state.connections.has(remoteCode)) {
        const connection = state.connections.get(remoteCode);

        // Map connection state to UI status
        switch (connectionState) {
            case 'connected':
                connection.status = 'online';
                break;
            case 'connecting':
            case 'reconnecting':
                connection.status = 'reconnecting';
                break;
            case 'closed':
            case 'failed':
            case 'disconnected':
                connection.status = 'offline';
                break;
            default:
                connection.status = 'offline';
        }

        // Update the UI
        updateConnectionsList();

        // If this is the active chat, update the chat header and info panel
        if (state.activeChat === remoteCode) {
            updateChatHeader();
            updateInfoPanel();
        }

        // Show appropriate notification
        if (connectionState === 'connected' && connection.wasReconnecting) {
            connection.wasReconnecting = false;
            showNotification(`Connection with ${remoteCode} restored`, 'success');

            // Play a notification sound
            try {
                const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
                audio.volume = 0.3; // Set volume to 30%
                audio.play();
            } catch (e) {
                console.error('Could not play notification sound:', e);
            }
        } else if (connectionState === 'reconnecting' || connectionState === 'connecting') {
            connection.wasReconnecting = true;
        }
    }

    // If the connection was closed, remove it
    if (connectionState === 'closed' || connectionState === 'failed') {
        disconnectPeer(remoteCode);
    }
}

/**
 * Handle connection errors
 * @param {Object} event - The error event
 */
function handleConnectionError(event) {
    const { remoteCode, error } = event;
    let errorMessage = error || 'Unknown error';
    console.error('Connection error:', errorMessage, 'Remote code:', remoteCode);

    // Hide any connection modals that might be open
    hideConnectionWaitingModal();
    hideConnectionRequestModal();

    // Format a user-friendly error message
    let notificationMessage = 'Connection error';

    if (typeof errorMessage === 'string') {
        if (errorMessage.includes('timed out')) {
            notificationMessage = `Connection to ${remoteCode} timed out. The user may be offline or the code may be incorrect.`;
        } else if (errorMessage.includes('Peer not found')) {
            notificationMessage = `The user with code ${remoteCode} was not found. Please check the code and try again.`;
        } else if (errorMessage.includes('inactive')) {
            notificationMessage = `The user with code ${remoteCode} appears to be offline. Please try again later.`;
        } else if (errorMessage.includes('in another tab')) {
            notificationMessage = `The user with code ${remoteCode} exists but is in another tab. Please open a new browser window (not tab) to connect.`;
        } else if (errorMessage.includes('last seen')) {
            notificationMessage = errorMessage; // Use the detailed message from the socket connection
        } else if (errorMessage.includes('taking too long')) {
            notificationMessage = `Connection to ${remoteCode} is taking too long. The user may be on a slow network or unavailable.`;
        } else if (errorMessage.includes('Failed to connect to server')) {
            notificationMessage = `Server connection failed. Please check your internet connection and try again.`;
        } else if (errorMessage.includes('xhr poll error')) {
            notificationMessage = `Server connection failed. Please check your internet connection.`;
        } else {
            notificationMessage = `Connection error: ${errorMessage}`;
        }
    }

    // Show error in status and notification
    elements.errorMessage.textContent = notificationMessage;
    elements.connectionError.classList.remove('hidden');
    elements.connectingStatus.classList.add('hidden');
    showNotification(notificationMessage, 'error');

    // Create a retry button for connection errors
    const retryButton = document.createElement('button');
    retryButton.className = 'btn btn-primary retry-connection-btn';
    retryButton.innerHTML = '<i class="fas fa-sync-alt"></i> Retry Connection';

    // Add the retry button to the error message container
    const errorContainer = elements.connectionError;

    // Remove any existing retry buttons
    const existingRetryButton = errorContainer.querySelector('.retry-connection-btn');
    if (existingRetryButton) {
        existingRetryButton.remove();
    }

    // Add click handler based on the type of error
    if (notificationMessage.includes('server') || notificationMessage.includes('Server')) {
        // Server connection error - retry the socket connection
        retryButton.onclick = () => {
            showNotification('Reconnecting to server...', 'info');
            // Force a page reload to reconnect
            window.location.reload();
        };
    } else if (remoteCode) {
        // Peer connection error - retry connecting to the peer
        retryButton.onclick = () => {
            showNotification(`Retrying connection to ${remoteCode}...`, 'info');
            connectToPeer(remoteCode);
        };
    } else {
        // Generic error - just reload the page
        retryButton.onclick = () => {
            window.location.reload();
        };
    }

    // Add the retry button to the error container
    errorContainer.appendChild(retryButton);

    // Auto-hide the error after 15 seconds (increased from 8)
    setTimeout(() => {
        elements.connectionError.classList.add('hidden');
    }, 15000);

    // If we have a remote code, disconnect from that peer
    if (remoteCode && state.connections.has(remoteCode)) {
        disconnectPeer(remoteCode);
    }

    // If we're on the welcome screen, clear the connect code input
    if (!elements.welcomeScreen.classList.contains('hidden')) {
        elements.connectCode.value = '';
    }
}

/**
 * Show a notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, info, warning)
 * @param {number} duration - The duration in milliseconds to show the notification (default: 5000)
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Create the notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Set the icon based on the type
    let icon;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            icon = 'fas fa-info-circle';
    }

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add close button event
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.remove();
    });

    // Add to the notifications container
    elements.notificationsContainer.appendChild(notification);

    // Add a slight animation to make it more noticeable
    notification.style.animation = 'notification-slide-in 0.3s ease-out forwards';

    // Remove after the specified duration
    setTimeout(() => {
        notification.style.animation = 'notification-slide-out 0.3s ease-in forwards';
        setTimeout(() => {
            notification.remove();
        }, 300); // Wait for the animation to complete
    }, duration);

    // Return the notification element in case the caller wants to manipulate it
    return notification;
}

/**
 * Show the connection request modal
 */
function showConnectionRequestModal() {
    elements.connectionRequestModal.classList.add('active');
}

/**
 * Hide the connection request modal
 */
function hideConnectionRequestModal() {
    elements.connectionRequestModal.classList.remove('active');
}

/**
 * Show the connection waiting modal
 */
function showConnectionWaitingModal() {
    elements.connectionWaitingModal.classList.add('active');
}

/**
 * Hide the connection waiting modal
 */
function hideConnectionWaitingModal() {
    elements.connectionWaitingModal.classList.remove('active');
}

/**
 * Check for pending connection requests in localStorage
 */
function checkPendingConnectionRequests() {
    try {
        // Check localStorage for pending requests
        const storedRequests = JSON.parse(localStorage.getItem('pendingConnectionRequests') || '{}');

        // Check window object for pending requests
        const windowRequests = window.pendingConnectionRequests || {};

        // Combine both sources
        const allRequests = { ...storedRequests, ...windowRequests };

        // Process any pending requests
        const requestKeys = Object.keys(allRequests);

        if (requestKeys.length > 0) {
            console.log(`Found ${requestKeys.length} pending connection requests`);

            // Process the most recent request
            const mostRecentKey = requestKeys.reduce((latest, current) => {
                return (!latest || allRequests[current].timestamp > allRequests[latest].timestamp)
                    ? current : latest;
            }, null);

            if (mostRecentKey) {
                const request = allRequests[mostRecentKey];
                console.log(`Processing pending connection request from ${request.from}`);

                // Create a synthetic event to handle the request
                const syntheticEvent = {
                    detail: {
                        from: request.from,
                        encryptionKey: request.encryptionKey
                    }
                };

                // Handle the request
                handleConnectionRequest(syntheticEvent);

                // Remove this request from storage
                delete storedRequests[request.from];
                localStorage.setItem('pendingConnectionRequests', JSON.stringify(storedRequests));

                if (window.pendingConnectionRequests) {
                    delete window.pendingConnectionRequests[request.from];
                }
            }
        }
    } catch (e) {
        console.error('Error checking pending connection requests:', e);
    }
}

/**
 * Handle an incoming connection request
 * @param {CustomEvent} event - The connection request event
 */
function handleConnectionRequest(event) {
    try {
        const { from } = event.detail;
        console.log(`Handling connection request from ${from}`);

        // Store the request for later use
        state.pendingRequest = {
            from
        };

        // Update the request modal
        elements.requestFromCode.textContent = from;

        // Show the request modal
        showConnectionRequestModal();

        // Make the modal more noticeable with a shake animation
        const modal = elements.connectionRequestModal.querySelector('.modal-content');
        if (modal) {
            modal.classList.add('shake');
            setTimeout(() => {
                modal.classList.remove('shake');
            }, 1000);
        }

        // Show a notification
        showNotification(`Connection request from ${from}. Click Accept to connect.`, 'info', 10000);

        // Flash the title to get user's attention if the tab is not active
        let originalTitle = document.title;
        let titleInterval;

        if (document.hidden) {
            titleInterval = setInterval(() => {
                document.title = document.title === originalTitle ?
                    '🔔 New Connection Request!' : originalTitle;
            }, 1000);

            // Stop flashing when the document becomes visible
            const visibilityHandler = () => {
                if (!document.hidden) {
                    clearInterval(titleInterval);
                    document.title = originalTitle;
                    document.removeEventListener('visibilitychange', visibilityHandler);
                }
            };

            document.addEventListener('visibilitychange', visibilityHandler);
        }

        // Play a notification sound
        try {
            const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            audio.volume = 0.5; // Set volume to 50%
            audio.play();
        } catch (e) {
            console.error('Could not play notification sound:', e);
        }
    } catch (error) {
        console.error('Error handling connection request:', error);
        showNotification(`Error handling connection request: ${error.message}`, 'error');
    }
}

/**
 * Accept a connection request
 * @param {string} fromCode - The unique code of the peer who sent the request
 */
function acceptConnectionRequest(fromCode) {
    console.log(`Accepting connection request from ${fromCode}`);

    try {
        // Hide the request modal
        hideConnectionRequestModal();

        // Accept the connection
        const connection = state.socketConnection.acceptConnection(fromCode);
        console.log(`Connection accepted:`, connection);

        // Add the connection to our state
        state.connections.set(fromCode, {
            code: fromCode,
            deviceName: `Peer ${fromCode}`,
            avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMzEgMjMxIj48cGF0aCBkPSJNMzMuODMsMzMuODNhMTE1LjUsMTE1LjUsMCwxLDEsMCwxNjMuMzQsMTE1LjQ5LDExNS40OSwwLDAsMSwwLTE2My4zNFoiIHN0eWxlPSJmaWxsOiNkMWQxZDE7Ii8+PHBhdGggZD0ibTE1Ny4zLDEyOS40NWMtNi44LDMuNC0xNC44NSw1LjEtMjMuNyw1LjEtOC44NSwwLTE2LjktMS43LTIzLjctNS4xLTIzLjI1LDUuMS00My4zNSwyMC40LTQzLjM1LDQxLjY1LDAsMCwwLDQyLjUsMCw4LjUsMCwwLDEzLjYsMCwxMy42LDAsMCw0Mi41LDAsMCwwLDAsOC41LDAsMTMuNiwwLDEzLjYsMCw0Mi41LDAsMCwwLDAsODUsMCwwLDQyLjUsMCw0Mi41LDAsMCwyMS4yNS0yMC40LDQzLjM1LTQzLjM1LTQzLjM1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48cGF0aCBkPSJtMTMzLjYsMTI3Ljc1YzE2LjE1LDAsMjkuNzUtMTMuNiwyOS43NS0zOC4yNSwwLTE1LjMtMTMuNi0yOS43NS0yOS43NS0yOS43NXMtMjkuNzUsMTQuNDUtMjkuNzUsMjkuNzVjMCwyNC42NSwxMy42LDM4LjI1LDI5Ljc1LDM4LjI1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48L3N2Zz4=',
            status: 'online',
            connectionTime: new Date(),
            connection
        });

        // Generate and store encryption key for this connection
        const encryptionKey = EncryptionUtils.generateSharedKey(state.user.uniqueCode, fromCode);
        state.encryptionKeys.set(fromCode, encryptionKey);
        console.log(`Generated encryption key for ${fromCode}`);

        // Update the UI
        updateConnectionsList();

        // Set as active chat
        setActiveChat(fromCode);

        // Show success notification
        showNotification(`Connected to ${fromCode}`, 'success');

        // Switch to chat interface if we're on the welcome screen
        if (!elements.welcomeScreen.classList.contains('hidden')) {
            showChatInterface();
        }

        // Clear the pending request
        state.pendingRequest = null;
    } catch (error) {
        console.error('Error accepting connection:', error);
        showNotification(`Error accepting connection: ${error.message}`, 'error');
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 */
function copyToClipboard(text) {
    // Create a temporary input element
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);

    // Select and copy the text
    input.select();
    document.execCommand('copy');

    // Remove the temporary input
    document.body.removeChild(input);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handle avatar upload
 * @param {Event} event - The change event from the file input
 */
function handleAvatarUpload(event) {
    const file = event.target.files[0];

    // Check if a file was selected
    if (!file) {
        return;
    }

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }

    // Create a FileReader to read the image
    const reader = new FileReader();

    reader.onload = (e) => {
        // Update the avatar in the state
        state.user.avatar = e.target.result;

        // Update all avatar images in the UI
        elements.welcomeUserAvatar.src = state.user.avatar;
        document.getElementById('user-avatar').src = state.user.avatar;

        // Show success notification
        showNotification('Avatar updated successfully', 'success');
    };

    reader.onerror = () => {
        showNotification('Failed to load the image', 'error');
    };

    // Read the image as a data URL
    reader.readAsDataURL(file);
}

/**
 * Generate a UUID v4
 * @returns {string} A UUID v4
 */
function uuidv4() {
    return uuid.v4();
}

/**
 * Send a typing indicator to the active chat
 * @param {boolean} isTyping - Whether the user is typing
 */
function sendTypingIndicator(isTyping) {
    // Check if we have an active chat
    if (!state.activeChat) {
        return;
    }

    // Only send if the state has changed
    if (state.isTyping !== isTyping) {
        state.isTyping = isTyping;
        state.socketConnection.sendTypingIndicator(state.activeChat, isTyping);
    }
}

/**
 * Handle a typing indicator from a peer
 * @param {CustomEvent} event - The typing indicator event
 */
function handleTypingIndicator(event) {
    const { from, isTyping } = event.detail;

    // Update the typing status for this user
    if (isTyping) {
        state.typingUsers.set(from, Date.now());
    } else {
        state.typingUsers.delete(from);
    }

    // Update the UI if this is the active chat
    if (state.activeChat === from) {
        updateTypingIndicator();
    }
}

/**
 * Update the typing indicator in the UI
 */
function updateTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) return;

    if (state.activeChat && state.typingUsers.has(state.activeChat)) {
        typingIndicator.classList.remove('hidden');
        typingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    } else {
        typingIndicator.classList.add('hidden');
    }
}

/**
 * Send a file to the active chat
 * @param {File} file - The file to send
 */
function sendFile(file) {
    try {
        // Check if we have an active chat
        if (!state.activeChat) {
            showNotification('No active chat to send file to', 'error');
            return;
        }

        // Check file size (limit to 5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            showNotification(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 'error');
            return;
        }

        // Show sending notification
        showNotification(`Preparing to send ${file.name}...`, 'info');

        // Create a file reader to read the file as data URL
        const reader = new FileReader();

        reader.onload = (e) => {
            // Create a unique ID for this file transfer
            const fileId = uuidv4();

            // Create the file data object
            const fileData = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                timestamp: new Date().toISOString()
            };

            // Store the file transfer
            state.fileTransfers.set(fileId, {
                id: fileId,
                file: fileData,
                status: 'sending',
                progress: 0
            });

            // Create a message for the file
            const message = {
                id: fileId,
                sender: state.user.uniqueCode,
                receiver: state.activeChat,
                text: `Sent a file: ${file.name}`,
                fileData: fileData,
                timestamp: new Date().toISOString(),
                type: 'file'
            };

            // Add the message to the UI with a 'sending' status
            const messageEl = addFileMessageToUI(message, true);

            // Store the message
            storeMessage(message);

            // Send the file
            state.socketConnection.sendFile(state.activeChat, fileData)
                .then(() => {
                    console.log('File sent successfully');

                    // Update the file transfer status
                    const transfer = state.fileTransfers.get(fileId);
                    if (transfer) {
                        transfer.status = 'sent';
                        transfer.progress = 100;
                    }

                    // Update the message UI to show 'sent' status
                    if (messageEl) {
                        const statusIcon = messageEl.querySelector('.message-status');
                        if (statusIcon) {
                            statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                            statusIcon.classList.remove('sending');
                            statusIcon.classList.add('sent');
                        }
                    }

                    showNotification(`File ${file.name} sent successfully`, 'success');
                })
                .catch(error => {
                    console.error('Error sending file:', error);

                    // Update the file transfer status
                    const transfer = state.fileTransfers.get(fileId);
                    if (transfer) {
                        transfer.status = 'failed';
                    }

                    // Update the message UI to show 'failed' status
                    if (messageEl) {
                        const statusIcon = messageEl.querySelector('.message-status');
                        if (statusIcon) {
                            statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                            statusIcon.classList.remove('sending');
                            statusIcon.classList.add('failed');
                            statusIcon.title = 'Failed to send: ' + error.message;
                        }
                    }

                    showNotification(`Failed to send file: ${error.message}`, 'error');
                });
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            showNotification('Error reading file', 'error');
        };

        // Read the file as data URL
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error in sendFile function:', error);
        showNotification(`Error sending file: ${error.message}`, 'error');
    }
}

/**
 * Handle a received file
 * @param {CustomEvent} event - The file received event
 */
function handleFileReceived(event) {
    const { from, fileData } = event.detail;
    console.log('Received file:', fileData);

    // Create a message for the file
    const message = {
        id: fileData.id,
        sender: from,
        receiver: state.user.uniqueCode,
        text: `Sent a file: ${fileData.name}`,
        fileData: fileData,
        timestamp: new Date().toISOString(),
        type: 'file'
    };

    // Store the message
    storeMessage(message);

    // If this is from the active chat, add it to the UI
    if (state.activeChat === from) {
        addFileMessageToUI(message);
    }

    // Play a notification sound
    try {
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
        audio.volume = 0.3; // Set volume to 30%
        audio.play();
    } catch (e) {
        console.error('Could not play notification sound:', e);
    }

    // Show a notification
    showNotification(`Received a file: ${fileData.name} from ${from}`, 'info');
}

/**
 * Add a file message to the UI
 * @param {Object} message - The message to add
 * @param {boolean} isSending - Whether the message is currently being sent
 * @returns {HTMLElement} The message element that was added to the UI
 */
function addFileMessageToUI(message, isSending = false) {
    try {
        console.log('Adding file message to UI:', message);

        const isOutgoing = message.sender === state.user.uniqueCode;
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        messageEl.dataset.messageId = message.id;

        // Format timestamp
        const timestamp = new Date(message.timestamp);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Determine the status icon for outgoing messages
        let statusIcon = '';
        if (isOutgoing) {
            if (isSending) {
                statusIcon = '<span class="message-status sending" title="Sending..."><i class="fas fa-spinner fa-spin"></i></span>';
            } else {
                statusIcon = '<span class="message-status sent" title="Sent"><i class="fas fa-check"></i></span>';
            }
        }

        // Determine the file icon based on the file type
        let fileIcon = 'fas fa-file';
        const fileType = message.fileData.type;

        if (fileType.startsWith('image/')) {
            fileIcon = 'fas fa-file-image';
        } else if (fileType.startsWith('video/')) {
            fileIcon = 'fas fa-file-video';
        } else if (fileType.startsWith('audio/')) {
            fileIcon = 'fas fa-file-audio';
        } else if (fileType === 'application/pdf') {
            fileIcon = 'fas fa-file-pdf';
        } else if (fileType.includes('word') || fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            fileIcon = 'fas fa-file-word';
        } else if (fileType.includes('excel') || fileType === 'application/vnd.ms-excel' || fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            fileIcon = 'fas fa-file-excel';
        } else if (fileType.includes('powerpoint') || fileType === 'application/vnd.ms-powerpoint' || fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            fileIcon = 'fas fa-file-powerpoint';
        } else if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed') {
            fileIcon = 'fas fa-file-archive';
        } else if (fileType === 'text/plain') {
            fileIcon = 'fas fa-file-alt';
        }

        // Create file preview if it's an image
        let filePreview = '';
        if (fileType.startsWith('image/')) {
            filePreview = `<div class="file-preview"><img src="${message.fileData.data}" alt="${message.fileData.name}"></div>`;
        }

        // Get the avatar for the sender
        let avatar = isOutgoing ? state.user.avatar : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMzEgMjMxIj48cGF0aCBkPSJNMzMuODMsMzMuODNhMTE1LjUsMTE1LjUsMCwxLDEsMCwxNjMuMzQsMTE1LjQ5LDExNS40OSwwLDAsMSwwLTE2My4zNFoiIHN0eWxlPSJmaWxsOiNkMWQxZDE7Ii8+PHBhdGggZD0ibTE1Ny4zLDEyOS40NWMtNi44LDMuNC0xNC44NSw1LjEtMjMuNyw1LjEtOC44NSwwLTE2LjktMS43LTIzLjctNS4xLTIzLjI1LDUuMS00My4zNSwyMC40LTQzLjM1LDQxLjY1LDAsMCwwLDQyLjUsMCw4LjUsMCwwLDEzLjYsMCwxMy42LDAsMCw0Mi41LDAsMCwwLDAsOC41LDAsMTMuNiwwLDEzLjYsMCw0Mi41LDAsMCwwLDAsODUsMCwwLDQyLjUsMCw0Mi41LDAsMCwyMS4yNS0yMC40LDQzLjM1LTQzLjM1LTQzLjM1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48cGF0aCBkPSJtMTMzLjYsMTI3Ljc1YzE2LjE1LDAsMjkuNzUtMTMuNiwyOS43NS0zOC4yNSwwLTE1LjMtMTMuNi0yOS43NS0yOS43NS0yOS43NXMtMjkuNzUsMTQuNDUtMjkuNzUsMjkuNzVjMCwyNC42NSwxMy42LDM4LjI1LDI5Ljc1LDM4LjI1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48L3N2Zz4=';

        // If we have a connection for this peer, use their avatar
        if (!isOutgoing && state.connections.has(message.sender)) {
            avatar = state.connections.get(message.sender).avatar;
        }

        messageEl.innerHTML = `
            <div class="message-avatar">
                <img src="${avatar}" alt="Avatar">
            </div>
            <div class="message-content">
                <div class="message-file">
                    ${filePreview}
                    <div class="file-info">
                        <i class="${fileIcon}"></i>
                        <span class="file-name">${escapeHTML(message.fileData.name)}</span>
                        <span class="file-size">${formatFileSize(message.fileData.size)}</span>
                    </div>
                    <a href="${message.fileData.data}" download="${message.fileData.name}" class="file-download-btn">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
                <div class="message-meta">
                    <span class="message-time">${timeString}</span>
                    ${statusIcon}
                </div>
            </div>
        `;

        elements.messagesContainer.appendChild(messageEl);
        elements.emptyChatMessage.classList.add('hidden');

        // Scroll to bottom
        scrollToBottom();

        return messageEl;
    } catch (error) {
        console.error('Error in addFileMessageToUI:', error);
        showNotification(`Error displaying file: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Format file size in a human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} The formatted file size
 */
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHTML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generate a UUID v4
 * @returns {string} A UUID v4 string
 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Clean up resources when the window is closed or refreshed
window.addEventListener('beforeunload', () => {
    if (state.socketConnection) {
        state.socketConnection.cleanup();
    }
});
