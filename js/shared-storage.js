/**
 * SharedStorage - A utility for sharing data between browser tabs
 * This uses localStorage and the storage event to synchronize data between tabs
 */
class SharedStorage {
    constructor() {
        // Initialize the storage
        this.initStorage();
        
        // Set up event listeners for cross-tab communication
        this.setupEventListeners();
    }
    
    /**
     * Initialize the storage
     */
    initStorage() {
        // Create storage for peers
        if (!localStorage.getItem('chatWavePeers')) {
            localStorage.setItem('chatWavePeers', JSON.stringify({}));
        }
        
        // Create storage for pending requests
        if (!localStorage.getItem('chatWavePendingRequests')) {
            localStorage.setItem('chatWavePendingRequests', JSON.stringify({}));
        }
        
        // Load the current peers
        this.peers = JSON.parse(localStorage.getItem('chatWavePeers') || '{}');
        
        // Load the current pending requests
        this.pendingRequests = JSON.parse(localStorage.getItem('chatWavePendingRequests') || '{}');
    }
    
    /**
     * Set up event listeners for cross-tab communication
     */
    setupEventListeners() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'chatWavePeers') {
                this.peers = JSON.parse(e.newValue || '{}');
                this.notifyListeners('peers-updated', this.peers);
            } else if (e.key === 'chatWavePendingRequests') {
                this.pendingRequests = JSON.parse(e.newValue || '{}');
                this.notifyListeners('requests-updated', this.pendingRequests);
            }
        });
        
        // Set up custom event listeners
        this.eventListeners = {
            'peers-updated': [],
            'requests-updated': []
        };
    }
    
    /**
     * Add a peer to the storage
     * @param {string} peerCode - The unique code of the peer
     * @param {Object} peerData - The peer data
     */
    addPeer(peerCode, peerData) {
        this.peers[peerCode] = {
            ...peerData,
            lastSeen: new Date().getTime()
        };
        
        localStorage.setItem('chatWavePeers', JSON.stringify(this.peers));
        this.notifyListeners('peers-updated', this.peers);
    }
    
    /**
     * Remove a peer from the storage
     * @param {string} peerCode - The unique code of the peer
     */
    removePeer(peerCode) {
        delete this.peers[peerCode];
        localStorage.setItem('chatWavePeers', JSON.stringify(this.peers));
        this.notifyListeners('peers-updated', this.peers);
    }
    
    /**
     * Update a peer's last seen time
     * @param {string} peerCode - The unique code of the peer
     */
    updatePeerLastSeen(peerCode) {
        if (this.peers[peerCode]) {
            this.peers[peerCode].lastSeen = new Date().getTime();
            localStorage.setItem('chatWavePeers', JSON.stringify(this.peers));
        }
    }
    
    /**
     * Check if a peer exists
     * @param {string} peerCode - The unique code of the peer
     * @returns {boolean} True if the peer exists
     */
    hasPeer(peerCode) {
        return !!this.peers[peerCode];
    }
    
    /**
     * Get a peer's data
     * @param {string} peerCode - The unique code of the peer
     * @returns {Object} The peer data
     */
    getPeer(peerCode) {
        return this.peers[peerCode];
    }
    
    /**
     * Get all peers
     * @returns {Object} All peers
     */
    getAllPeers() {
        return this.peers;
    }
    
    /**
     * Add a pending request
     * @param {string} targetCode - The target peer code
     * @param {Object} requestData - The request data
     */
    addPendingRequest(targetCode, requestData) {
        this.pendingRequests[targetCode] = {
            ...requestData,
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem('chatWavePendingRequests', JSON.stringify(this.pendingRequests));
        this.notifyListeners('requests-updated', this.pendingRequests);
    }
    
    /**
     * Remove a pending request
     * @param {string} targetCode - The target peer code
     */
    removePendingRequest(targetCode) {
        delete this.pendingRequests[targetCode];
        localStorage.setItem('chatWavePendingRequests', JSON.stringify(this.pendingRequests));
        this.notifyListeners('requests-updated', this.pendingRequests);
    }
    
    /**
     * Check if a pending request exists
     * @param {string} targetCode - The target peer code
     * @returns {boolean} True if the pending request exists
     */
    hasPendingRequest(targetCode) {
        return !!this.pendingRequests[targetCode];
    }
    
    /**
     * Get a pending request
     * @param {string} targetCode - The target peer code
     * @returns {Object} The pending request
     */
    getPendingRequest(targetCode) {
        return this.pendingRequests[targetCode];
    }
    
    /**
     * Add an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Remove an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Notify all listeners of an event
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    notifyListeners(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Error in event listener:', e);
                }
            });
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Clear all event listeners
        this.eventListeners = {
            'peers-updated': [],
            'requests-updated': []
        };
    }
}

// Create a global instance of SharedStorage
window.sharedStorage = new SharedStorage();
