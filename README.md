# ChatWave - Production-Ready Ephemeral Secure Chat

> **Fully ephemeral, invite/consent-based secure chat application**
> 
> 🚫 **No Database** • 🔒 **End-to-End Encrypted** • 💾 **Memory Only** • 👥 **Invite-Based**

ChatWave is a revolutionary ephemeral chat application that prioritizes privacy and security. All messages, media, and user data exist **only in memory** and are completely erased when users disconnect or the server restarts.

## ✨ Features

- **Completely Ephemeral**: No database, no file storage, no persistence
- **Invite-Only**: Consent-based connections using unique invite codes
- **Real-time Messaging**: Instant message delivery via WebSocket
- **Media Sharing**: Share images, videos, audio, and documents (temporarily)
- **End-to-End Encryption**: Placeholder implementation for future enhancement
- **Cross-Platform**: Works on desktop, mobile, and tablet
- **Dark/Light Theme**: Automatic theme switching
- **Production Ready**: Robust error handling, input validation, and monitoring

---

## 🚀 Quick Start

### Live Application
**Use the live application directly:** [https://chat-application-1-fl18.onrender.com](https://chat-application-1-fl18.onrender.com)

### Local Development

#### Prerequisites
- Node.js 14+ 
- npm or yarn

#### Installation & Setup

```bash
# Clone repository
git clone https://github.com/JewelPaul/CHAT-APPLICATION.git
cd CHAT-APPLICATION

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
CHAT-APPLICATION/
├── client/                 # Frontend (HTML, CSS, JS)
│   ├── index.html         # Main application page
│   ├── style.css          # Application styles  
│   └── app.js             # Client-side JavaScript
├── server/                 # Backend (Node.js)
│   └── server.js          # Express + Socket.io server
├── .env.example           # Environment variables template
├── .eslintrc.json         # ESLint configuration
├── .prettierrc.json       # Prettier configuration
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration  
ORIGIN=http://localhost:3000

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Security Configuration
MAX_MESSAGE_LENGTH=2000
MAX_FILE_SIZE=10485760
```

---

## 📋 Available Scripts

```bash
# Development
npm run dev          # Start development server with logging

# Production  
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically  
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Monitoring
npm run health       # Check server health status
```

---

## 🛠 Usage

### Starting a Chat

1. **Open the application** in your browser
2. **Share your unique invite code** with someone you want to chat with  
3. **Enter their invite code** to request a connection
4. **Wait for acceptance** - they must approve your connection request
5. **Start chatting!** Messages are delivered in real-time

### Features Available During Chat

- **Text Messages**: Send encrypted messages instantly
- **Media Sharing**: Upload images, videos, audio files, and documents
- **Typing Indicators**: See when the other person is typing
- **Connection Status**: Monitor your connection state
- **Dark/Light Mode**: Toggle between themes
- **End Chat**: Cleanly disconnect and clear all data

### Security & Privacy

- **No Storage**: All data exists only in server memory
- **Automatic Cleanup**: Data is destroyed when you disconnect  
- **Consent Required**: Both parties must approve connections
- **Input Validation**: Messages are validated and sanitized
- **Error Handling**: Robust error handling prevents crashes

---

## 🔗 API Endpoints

### Health Check
```
GET /health
```
Returns server status, uptime, memory usage, and connection stats.

Example response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "connectedClients": 4,
  "activeRooms": 2,
  "mediaFiles": 1,
  "environment": "production",
  "version": "2.0.0",
  "memory": {
    "rss": "54 MB",
    "heapTotal": "9 MB", 
    "heapUsed": "7 MB",
    "external": "2 MB"
  }
}
```

---

## 🚀 Deployment

### Local Production

```bash
# Set production environment
export NODE_ENV=production
export PORT=8080

# Start server
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Platforms

The application is designed to work on any Node.js hosting platform:

- **Render** ✅ (Currently deployed)  
- **Heroku** ✅
- **Railway** ✅
- **Vercel** ✅
- **Netlify Functions** ✅

---

## 🔒 Security Considerations

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Consider adding rate limiting for production
- **CORS**: Configured for your domain in production  
- **HTTPS**: Use HTTPS in production (handled by hosting platform)
- **Environment Variables**: Keep sensitive config in environment variables

---

## 🐛 Troubleshooting

### Common Issues

**Connection Issues**
- Check if server is running: `curl http://localhost:3000/health`
- Verify port is not in use: `lsof -i :3000`
- Check browser console for JavaScript errors

**Performance Issues**  
- Monitor memory usage via `/health` endpoint
- Restart server to clear memory (all chats will be lost)
- Consider horizontal scaling for high traffic

**Development Issues**
- Run `npm run lint` to check for code issues
- Run `npm run format` to fix formatting
- Check Node.js version (requires 14+)

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)  
5. **Open** a Pull Request

### Code Quality

- All code must pass ESLint checks: `npm run lint`
- Use Prettier for formatting: `npm run format`  
- Follow existing code patterns and conventions
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Socket.io** for real-time communication
- **Express.js** for the web framework
- **Font Awesome** for icons
- **Google Fonts** for typography

---

**Made with ❤️ by [JewelPaul](https://github.com/JewelPaul)**
4. **Wait for approval** - they must accept your request
5. **Start chatting** - messages are encrypted and ephemeral
6. **Close tab/browser** - all data is instantly erased

#### Local Development
1. **Open the application** in your browser at `http://localhost:3000`
2. Follow the same steps as above

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
- **Socket.IO Client** - Real-time communication (served from same origin)
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

### **Current Deployment**

The application is deployed as a single web service on Render:
- **Frontend and Backend**: [https://chat-application-1-fl18.onrender.com](https://chat-application-1-fl18.onrender.com)
- **Architecture**: Node.js server serves both the static frontend files and handles Socket.IO connections
- **Benefits**: Single deployment, no CORS issues, simplified architecture

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
