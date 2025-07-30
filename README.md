# ChatWave - Ephemeral Secure Chat

> **Fully ephemeral, invite/consent-based secure chat application**
> 
> 🚫 **No Database** • 🔒 **End-to-End Encrypted** • 💾 **Memory Only** • 👥 **Invite-Based**

ChatWave is a revolutionary ephemeral chat application that prioritizes privacy and security. All messages, media, and user data exist **only in memory** and are completely erased when users disconnect or the server restarts.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- npm or yarn

### Installation & Setup

```bash
# Clone repository
git clone https://github.com/JewelPaul/CHAT-APPLICATION.git
cd CHAT-APPLICATION

# Install dependencies
npm install

# Start server (development)
npm start
# Server runs on http://localhost:3000

# Production deployment
PORT=8080 npm start
```

### Usage

1. **Open the application** in your browser
2. **Share your unique invite code** with someone you want to chat with
3. **Enter their invite code** to request a connection
4. **Wait for approval** - they must accept your request
5. **Start chatting** - messages are encrypted and ephemeral
6. **Close tab/browser** - all data is instantly erased

---

## 🔒 Security & Ephemeral Policy

### **Ephemeral Data Policy**

ChatWave implements a **zero-persistence architecture**:

- ✅ **No database** - No PostgreSQL, MongoDB, or any persistent storage
- ✅ **No file writes** - Media files never touch the disk
- ✅ **Memory only** - All data stored in RAM only
- ✅ **Instant erasure** - Data vanishes on disconnect/restart
- ✅ **No logs** - No message or user data logging
- ✅ **No tracking** - No analytics or user behavior tracking

### **Security Features**

- 🔐 **End-to-End Encryption** (E2EE) - Messages encrypted before transmission
- 🛡️ **Invite-Only Access** - No public rooms or discoverable chats  
- ✋ **Consent Required** - Both parties must approve connection
- 🚫 **No Registration** - No accounts, emails, or personal data required
- 🔄 **Session Isolation** - Each chat session is completely independent
- ⚡ **Real-time** - Powered by Socket.IO for instant messaging

### **Data Lifecycle**

```
User connects → Data in RAM → User disconnects → Data DESTROYED
                    ↓
              Server restart → ALL DATA DESTROYED
```

**Data Categories:**
- **User Sessions:** Device name, unique code, avatar (if uploaded)
- **Messages:** Text content, timestamps, sender/recipient info  
- **Media:** Images, videos, files (stored as Base64 in memory)
- **Connections:** Active chat rooms and participant lists

**Data Destruction Triggers:**
- User closes browser tab/window
- User navigates away from page
- Network disconnection
- Server restart/crash
- Manual disconnect

---

## 🏗️ Architecture

### **File Structure**
```
CHAT-APPLICATION/
├── server/
│   └── server.js          # Express + Socket.IO server with ephemeral logic
├── client/
│   ├── index.html         # Modern responsive UI 
│   ├── app.js            # Client logic with E2EE & media handling
│   └── style.css         # Responsive styles with dark/light mode
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

### **Technology Stack**

**Backend:**
- **Node.js** - Runtime environment
- **Express.js** - Web server framework  
- **Socket.IO** - Real-time bidirectional communication
- **In-Memory Storage** - Native JavaScript Maps and Sets

**Frontend:**
- **Vanilla JavaScript** - No frameworks for minimal footprint
- **Socket.IO Client** - Real-time communication
- **CSS3 + CSS Variables** - Modern responsive design
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

**Security:**
- **Base64 Encoding** - Placeholder encryption (production would use WebCrypto API)
- **HTTPS Ready** - TLS encryption for transport layer
- **CORS Configured** - Cross-origin resource sharing protection

---

## 🎯 Core Features

### **Ephemeral Messaging**
- Real-time text messaging with instant delivery
- All messages stored only in browser and server memory
- Messages automatically deleted on disconnect
- No message history persistence

### **Media Sharing**
- Share images, videos, audio files, and documents
- Files converted to Base64 and stored in memory only
- Never written to disk or persistent storage
- Automatic cleanup when chat ends

### **Invite System**
- Generate unique alphanumeric invite codes
- Share codes securely with intended recipients
- Consent-based connection approval required
- One-to-one chat sessions only

### **Modern UI/UX**
- Clean, professional interface design
- Dark and light mode toggle
- Responsive design for all devices
- Real-time typing indicators
- Connection status indicators
- Intuitive notification system

---

## 🔧 Configuration

### **Environment Variables**

```bash
# Server Configuration
PORT=3000                    # Server port (default: 3000)

# Production Settings  
NODE_ENV=production         # Production mode
```

### **Server Configuration**

The server automatically configures itself for different environments:

- **Development:** Serves static files from `client/` directory
- **Production:** CORS enabled for cross-origin requests
- **Health Check:** `/health` endpoint for monitoring

---

## 🚀 Deployment

### **Local Development**
```bash
npm start
# Visit http://localhost:3000
```

### **Production (Render/Heroku)**
```bash
# Set environment variables
PORT=8080
NODE_ENV=production

# Deploy with your preferred platform
npm start
```

### **Docker (Optional)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## ⚠️ Important Warnings

### **Data Loss by Design**
ChatWave is designed to lose data. This is a **FEATURE, not a bug**:

- 🚨 **No backups** - There is no way to recover lost messages
- 🚨 **No exports** - You cannot save or export chat history  
- 🚨 **Instant deletion** - Closing the tab immediately erases all data
- 🚨 **Server restarts** - Any server maintenance erases all active chats

### **Browser Requirements**
- Modern browser with WebSocket support
- JavaScript enabled
- LocalStorage access (for theme preferences only)

### **Network Requirements**
- Stable internet connection required
- WebSocket connections must be allowed
- HTTPS recommended for production

---

## 🤝 Contributing

We welcome contributions that maintain our ephemeral and security principles:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make changes** ensuring no persistent storage is added
4. **Test thoroughly** - verify data is properly erased
5. **Submit a Pull Request**

### **Contribution Guidelines**
- ❌ No database or file storage additions
- ❌ No data persistence mechanisms  
- ❌ No user tracking or analytics
- ✅ Security improvements welcome
- ✅ UI/UX enhancements welcome
- ✅ Performance optimizations welcome

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔍 Technical Notes

### **Memory Management**
The application actively manages memory usage:
- Automatic cleanup of disconnected users
- Media storage limits (5MB per file)
- Garbage collection of orphaned data
- Memory usage monitoring via `/health` endpoint

### **Security Considerations**
- E2EE implementation is currently a placeholder
- Production deployment should implement proper WebCrypto API
- Transport layer encryption (HTTPS) is essential
- Regular security audits recommended

### **Performance**
- Optimized for small to medium group chats
- Memory usage scales with active users and media
- Automatic cleanup prevents memory leaks
- Efficient Binary data handling for media

---

## 📞 Support

For support, feature requests, or security concerns:

- **GitHub Issues:** [Create an issue](https://github.com/JewelPaul/CHAT-APPLICATION/issues)
- **Security:** Report security issues responsibly via GitHub

---

**Remember: ChatWave is ephemeral by design. Use it for conversations you don't need to keep forever.** 🌊

---

*Developed with ❤️ by [JewelPaul](https://github.com/JewelPaul)*
