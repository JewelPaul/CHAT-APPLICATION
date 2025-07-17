// Simple UUID v4 implementation as a fallback
window.uuid = {
    v4: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Also provide the simpler uuidv4 function
window.uuidv4 = window.uuid.v4;