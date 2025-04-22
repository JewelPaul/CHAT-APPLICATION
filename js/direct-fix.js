// This file is now a placeholder since we're using Socket.io for all communication
// No need for local storage or cross-tab communication as everything goes through the server

// Create a dummy registry that does nothing
window.peerRegistry = {
    register: (uniqueCode, callback) => {
        console.log('Using Socket.io for communication, local registry not needed');
    },
    get: (uniqueCode) => null,
    exists: (uniqueCode) => false,
    remove: (uniqueCode) => {},
    updateLastSeen: (uniqueCode) => {}
};
