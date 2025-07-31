/**
 * ChatWave Client Application
 * Ephemeral, invite-based secure chat client
 * Features: Real-time messaging, E2EE placeholder, media sharing, dark/light mode
 */

class ChatWaveApp {
    constructor() {
        this.socket = null;
        this.userCode = null;
        this.deviceName = null;
        this.userAvatar = null;
        this.currentChat = null;
        this.isConnected = false;
        this.typingTimer = null;
        
        // E2EE placeholder - in production this would use real cryptography
        this.encryptionKey = null;
        
        this.init();
    }

    init() {
        this.generateUserCode();
        this.detectDevice();
        this.setupSocketConnection();
        this.setupEventListeners();
        this.setupThemeToggle();
        this.showNotification('Welcome to ChatWave! Your session is completely ephemeral.', 'info');
    }

    // Generate unique user code
    generateUserCode() {
        this.userCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        document.getElementById('unique-code').textContent = this.userCode;
    }

    // Detect device name
    detectDevice() {
        const ua = navigator.userAgent;
        let device = 'Unknown Device';
        
        if (ua.includes('Mac')) device = 'Mac';
        else if (ua.includes('Windows')) device = 'Windows';
        else if (ua.includes('Linux')) device = 'Linux';
        else if (ua.includes('iPhone')) device = 'iPhone';
        else if (ua.includes('iPad')) device = 'iPad';
        else if (ua.includes('Android')) device = 'Android';
        
        // Add random number for uniqueness
        device += ' ' + Math.floor(Math.random() * 1000);
        
        this.deviceName = device;
        document.getElementById('device-name').textContent = device;
    }

    // Setup Socket.IO connection
    setupSocketConnection() {
        // Use relative connection - connects to same origin as the frontend
        this.socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupSocketEvents();
    }

    // Setup socket event listeners
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'Connected');
            
            // Register with server
            this.socket.emit('register', {
                code: this.userCode,
                deviceName: this.deviceName,
                avatar: this.userAvatar
            });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', 'Disconnected');
            this.showNotification('Connection lost. All chat data has been cleared.', 'warning');
        });

        this.socket.on('registered', (data) => {
            console.log('Registered with code:', data.code);
            this.showNotification('You are now online and ready to receive invites!', 'success');
        });

        this.socket.on('connection-request', (data) => {
            this.showConnectionRequest(data);
        });

        this.socket.on('connection-request-sent', (data) => {
            this.showWaitingModal(data.code);
        });

        this.socket.on('connection-accepted', (data) => {
            this.hideWaitingModal();
            this.establishConnection(data);
        });

        this.socket.on('connection-established', (data) => {
            this.establishConnection(data);
        });

        this.socket.on('message', (data) => {
            this.displayMessage(data);
        });

        this.socket.on('media-message', (data) => {
            this.displayMediaMessage(data);
        });

        this.socket.on('typing-start', (data) => {
            this.showTypingIndicator(data.from);
        });

        this.socket.on('typing-stop', (data) => {
            this.hideTypingIndicator();
        });

        this.socket.on('user-disconnected', (data) => {
            this.showNotification(`${data.userCode} has disconnected. Chat ended.`, 'info');
            this.endChat();
        });

        this.socket.on('connection-error', (data) => {
            this.showNotification(data.error, 'error');
        });

        this.socket.on('message-error', (data) => {
            this.showNotification(data.error, 'error');
        });

        this.socket.on('media-error', (data) => {
            this.showNotification(data.error, 'error');
        });
    }

    // Setup UI event listeners
    setupEventListeners() {
        // Copy code button
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(this.userCode).then(() => {
                this.showNotification('Invite code copied to clipboard!', 'success');
            });
        });

        // Connect button
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.requestConnection();
        });

        // Connect input enter key
        document.getElementById('connect-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.requestConnection();
            }
        });

        // Message input
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.handleTyping();
        });

        // Send button
        document.getElementById('send-button').addEventListener('click', () => {
            this.sendMessage();
        });

        // File attachment
        document.getElementById('attachment-button').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Avatar upload
        document.getElementById('avatar-upload-input').addEventListener('change', (e) => {
            this.handleAvatarUpload(e.target.files[0]);
        });

        // Modal controls
        document.getElementById('accept-connection-btn').addEventListener('click', () => {
            this.acceptConnection();
        });

        document.getElementById('reject-connection-btn').addEventListener('click', () => {
            this.rejectConnection();
        });

        document.getElementById('cancel-waiting-btn').addEventListener('click', () => {
            this.hideWaitingModal();
        });

        document.getElementById('close-waiting-modal').addEventListener('click', () => {
            this.hideWaitingModal();
        });

        // Chat controls
        document.getElementById('back-button').addEventListener('click', () => {
            this.endChat();
        });

        document.getElementById('disconnect-button').addEventListener('click', () => {
            this.endChat();
        });

        document.getElementById('info-button').addEventListener('click', () => {
            this.showInfoPanel();
        });

        document.getElementById('close-info-panel').addEventListener('click', () => {
            this.hideInfoPanel();
        });

        document.getElementById('info-disconnect-btn').addEventListener('click', () => {
            this.endChat();
        });

        // Emoji button (placeholder)
        document.getElementById('emoji-button').addEventListener('click', () => {
            this.showNotification('Emoji picker coming soon!', 'info');
        });
    }

    // Setup theme toggle functionality
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Set initial theme
        if (prefersDark) {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            
            this.showNotification(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'info');
        });
    }

    // Request connection to another user
    requestConnection() {
        const code = document.getElementById('connect-code').value.trim().toUpperCase();
        if (!code) {
            this.showNotification('Please enter a valid invite code', 'error');
            return;
        }

        if (code === this.userCode) {
            this.showNotification('You cannot connect to yourself!', 'error');
            return;
        }

        this.socket.emit('connection-request', { code });
        document.getElementById('connect-code').value = '';
    }

    // Show connection request modal
    showConnectionRequest(data) {
        document.getElementById('request-from-code').textContent = data.code;
        document.getElementById('request-device-name').textContent = data.deviceName || data.code;
        
        if (data.avatar) {
            document.getElementById('request-avatar').src = data.avatar;
        }
        
        this.pendingRequest = data;
        document.getElementById('connection-request-modal').classList.add('show');
    }

    // Accept connection
    acceptConnection() {
        if (this.pendingRequest) {
            this.socket.emit('connection-accept', { code: this.pendingRequest.code });
            this.hideConnectionRequestModal();
        }
    }

    // Reject connection
    rejectConnection() {
        this.hideConnectionRequestModal();
        this.showNotification('Connection request declined', 'info');
    }

    hideConnectionRequestModal() {
        document.getElementById('connection-request-modal').classList.remove('show');
        this.pendingRequest = null;
    }

    // Show waiting modal
    showWaitingModal(code) {
        document.getElementById('waiting-for-code').textContent = code;
        document.getElementById('connection-waiting-modal').classList.add('show');
    }

    hideWaitingModal() {
        document.getElementById('connection-waiting-modal').classList.remove('show');
    }

    // Establish connection and switch to chat view
    establishConnection(data) {
        this.currentChat = {
            userCode: data.code,
            deviceName: data.deviceName,
            avatar: data.avatar,
            roomId: data.roomId,
            connectedAt: new Date()
        };

        // Generate E2EE key placeholder
        this.generateE2EEKey();

        // Update chat UI
        document.getElementById('chat-user-name').textContent = data.deviceName || data.code;
        document.getElementById('chat-user-device').textContent = data.code;
        
        if (data.avatar) {
            document.getElementById('chat-user-avatar').src = data.avatar;
        }

        // Switch to chat interface
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('chat-interface').classList.remove('hidden');

        this.showNotification(`Connected to ${data.deviceName || data.code}`, 'success');
        this.clearMessages();
    }

    // Generate E2EE key (placeholder implementation)
    generateE2EEKey() {
        // In production, this would use proper key exchange protocols
        this.encryptionKey = Math.random().toString(36).substr(2, 32);
        console.log('E2EE Key generated (placeholder):', this.encryptionKey);
    }

    // Encrypt message (placeholder)
    encryptMessage(message) {
        // Placeholder encryption - in production use real cryptography
        return btoa(message + this.encryptionKey);
    }

    // Decrypt message (placeholder)
    decryptMessage(encryptedMessage) {
        // Placeholder decryption - in production use real cryptography
        try {
            const decoded = atob(encryptedMessage);
            return decoded.replace(this.encryptionKey, '');
        } catch {
            return encryptedMessage; // Fallback for unencrypted messages
        }
    }

    // Send message
    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentChat) return;

        // Encrypt message (placeholder)
        const encryptedMessage = this.encryptMessage(message);

        this.socket.emit('message', {
            to: this.currentChat.userCode,
            message: encryptedMessage,
            roomId: this.currentChat.roomId
        });

        input.value = '';
        this.stopTyping();
    }

    // Display message in chat
    displayMessage(data) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${data.from === this.userCode ? 'sent' : 'received'}`;

        // Decrypt message (placeholder)
        const decryptedMessage = this.decryptMessage(data.message);

        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(decryptedMessage)}</p>
                <span class="message-time">${this.formatTime(new Date(data.timestamp))}</span>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Handle file upload
    handleFileUpload(file) {
        if (!file || !this.currentChat) return;

        const maxSize = 5 * 1024 * 1024; // 5MB limit
        if (file.size > maxSize) {
            this.showNotification('File too large. Maximum size is 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.socket.emit('media-upload', {
                to: this.currentChat.userCode,
                roomId: this.currentChat.roomId,
                mediaData: e.target.result,
                filename: file.name,
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);

        this.showNotification(`Uploading ${file.name}...`, 'info');
    }

    // Display media message
    displayMediaMessage(data) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message media-message ${data.from === this.userCode ? 'sent' : 'received'}`;

        let mediaContent = '';
        if (data.mimeType.startsWith('image/')) {
            mediaContent = `<img src="${data.mediaData}" alt="${data.filename}" class="media-preview">`;
        } else if (data.mimeType.startsWith('video/')) {
            mediaContent = `<video controls class="media-preview"><source src="${data.mediaData}" type="${data.mimeType}"></video>`;
        } else if (data.mimeType.startsWith('audio/')) {
            mediaContent = `<audio controls class="media-preview"><source src="${data.mediaData}" type="${data.mimeType}"></audio>`;
        } else {
            mediaContent = `
                <div class="file-preview">
                    <i class="fas fa-file"></i>
                    <span>${data.filename}</span>
                    <a href="${data.mediaData}" download="${data.filename}" class="download-btn">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
        }

        messageElement.innerHTML = `
            <div class="message-content">
                ${mediaContent}
                <p class="media-filename">${data.filename} (${this.formatFileSize(data.size)})</p>
                <span class="message-time">${this.formatTime(new Date(data.timestamp))}</span>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Handle avatar upload
    handleAvatarUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.userAvatar = e.target.result;
            document.getElementById('user-avatar').src = this.userAvatar;
            this.showNotification('Avatar updated!', 'success');
        };
        reader.readAsDataURL(file);
    }

    // Typing indicators
    handleTyping() {
        if (!this.currentChat) return;

        this.socket.emit('typing-start', {
            to: this.currentChat.userCode,
            roomId: this.currentChat.roomId
        });

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }

    stopTyping() {
        if (!this.currentChat) return;

        this.socket.emit('typing-stop', {
            to: this.currentChat.userCode,
            roomId: this.currentChat.roomId
        });
    }

    showTypingIndicator(user) {
        document.getElementById('typing-user').textContent = this.currentChat?.deviceName || user;
        document.getElementById('typing-indicator').classList.remove('hidden');
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').classList.add('hidden');
    }

    // Show info panel
    showInfoPanel() {
        if (!this.currentChat) return;

        document.getElementById('info-user-name').textContent = this.currentChat.deviceName;
        document.getElementById('info-user-device').textContent = this.currentChat.userCode;
        document.getElementById('info-unique-code').textContent = this.currentChat.userCode;
        document.getElementById('info-room-id').textContent = this.currentChat.roomId;
        document.getElementById('info-connection-time').textContent = this.formatTime(this.currentChat.connectedAt);
        
        if (this.currentChat.avatar) {
            document.getElementById('info-user-avatar').src = this.currentChat.avatar;
        }

        document.getElementById('info-panel').classList.add('show');
    }

    hideInfoPanel() {
        document.getElementById('info-panel').classList.remove('show');
    }

    // End chat and return to welcome screen
    endChat() {
        this.currentChat = null;
        this.encryptionKey = null;
        
        document.getElementById('chat-interface').classList.add('hidden');
        document.getElementById('welcome-screen').classList.remove('hidden');
        
        this.hideInfoPanel();
        this.clearMessages();
        this.showNotification('Chat ended. All messages cleared from memory.', 'info');
    }

    // Clear all messages
    clearMessages() {
        const container = document.getElementById('messages-container');
        const messages = container.querySelectorAll('.message, .media-message');
        messages.forEach(msg => msg.remove());
    }

    // Update connection status
    updateConnectionStatus(status, text) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = text;
    }

    // Show notification
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatWaveApp();
});

// Show warning when user tries to leave
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = 'All chat data will be lost when you leave this page. Are you sure?';
});