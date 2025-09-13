# ChatWave - Ephemeral Secure Chat

> **Professional, full-stack chat application with React + TailwindCSS**
> 
> 🚫 **No Database** • 🔒 **End-to-End Encrypted** • 💾 **Memory Only** • 👥 **Invite-Based**

ChatWave is a revolutionary ephemeral chat application that prioritizes privacy and security. All messages, media, and user data exist **only in memory** and are completely erased when users disconnect or the server restarts.

![ChatWave Light Mode](https://github.com/user-attachments/assets/6084d498-b9e0-4e5f-ab29-0ca0aa090336)

![ChatWave Dark Mode](https://github.com/user-attachments/assets/875f76db-dee3-46df-b328-f47c3ed44c6b)

![ChatWave Mobile](https://github.com/user-attachments/assets/297e7fea-ab1f-4c17-b866-b2c201661034)

---

## 🚀 Quick Start

### Live Application (Recommended)

**Use the live application directly:** [https://chat-application-1-fl18.onrender.com](https://chat-application-1-fl18.onrender.com)

The entire application (frontend and backend) is deployed on Render as a single web service, providing seamless real-time chat functionality.

### Local Development

If you want to run your own instance:

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

```bash
# Clone repository
git clone https://github.com/JewelPaul/CHAT-APPLICATION.git
cd CHAT-APPLICATION

# Install dependencies and build
npm install

# Start server (development)
npm start
# Server runs on http://localhost:3000

# Production deployment
PORT=8080 npm start
```

### Usage

#### Live Application
1. **Visit** [https://chat-application-1-fl18.onrender.com](https://chat-application-1-fl18.onrender.com)
2. **Share your unique invite code** with someone you want to chat with
3. **Enter their invite code** to request a connection
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

- 🔐 **End-to-End Encryption** (E2EE) - Messages encrypted before transmission using Web Crypto API
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
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── utils.ts       # Utility functions
│   │   ├── crypto.ts      # End-to-end encryption
│   │   ├── socket.ts      # Socket.IO client service
│   │   └── index.css      # TailwindCSS styles
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
├── package.json           # Root dependencies and scripts
├── render.yaml           # Render.com deployment config
├── vercel.json           # Vercel deployment config
├── Dockerfile            # Container deployment
└── README.md            # This file
```

### **Technology Stack**

**Backend:**
- **Node.js** - Runtime environment
- **Express.js** - Web server framework  
- **Socket.IO** - Real-time bidirectional communication
- **In-Memory Storage** - Native JavaScript Maps and Sets

**Frontend:**
- **React** - Modern UI framework with TypeScript
- **TailwindCSS** - Utility-first CSS framework for styling
- **Vite** - Fast build tool and development server
- **Lucide React** - Beautiful icon library
- **Socket.IO Client** - Real-time communication

**Security:**
- **Web Crypto API** - Modern browser encryption for E2EE
- **HTTPS Ready** - TLS encryption for transport layer
- **CORS Configured** - Cross-origin resource sharing protection

---

## 🎯 Core Features

### **Modern UI/UX**
- **React + TailwindCSS** - Modern, responsive design system
- **Dark/Light Mode** - Automatic and manual theme switching
- **Mobile-First** - Fully responsive for all devices
- **Accessible** - WCAG compliant with proper ARIA labels
- **Professional Design** - Clean, minimalist interface

### **Ephemeral Messaging**
- Real-time text messaging with instant delivery
- All messages stored only in browser and server memory
- Messages automatically deleted on disconnect
- No message history persistence

### **Media Sharing** (Coming Soon)
- Share images, videos, audio files, and documents
- Files converted to Base64 and stored in memory only
- Never written to disk or persistent storage
- Automatic cleanup when chat ends

### **Invite System**
- Generate unique alphanumeric invite codes
- Share codes securely with intended recipients
- Consent-based connection approval required
- One-to-one chat sessions only

### **End-to-End Encryption**
- **Web Crypto API** implementation for real encryption
- **ECDH Key Exchange** for secure key derivation
- **AES-GCM Encryption** for message protection
- **Forward Secrecy** - New keys for each session

---

## 🔧 Configuration

### **Environment Variables**

```bash
# Server Configuration
PORT=3000                    # Server port (default: 3000)

# Production Settings  
NODE_ENV=production         # Production mode
```

### **Development Scripts**

```bash
# Install all dependencies
npm install

# Build frontend for production
npm run build

# Start production server
npm start

# Development mode (client)
cd client && npm run dev

# Install client dependencies only
npm run install-client
```

---

## 🚀 Deployment

### **Render.com (Recommended)**

1. **Fork this repository**
2. **Connect to Render.com**
3. **Create a new Web Service**
4. **Select your fork**
5. **Render will automatically deploy using render.yaml**

**Live Example**: [https://chat-application-1-fl18.onrender.com](https://chat-application-1-fl18.onrender.com)

### **Vercel (Frontend Only)**

```bash
# Deploy frontend to Vercel
vercel --prod
```

### **Docker**

```bash
# Build and run with Docker
docker build -t chatwave .
docker run -p 3000:3000 chatwave
```

### **Manual Deployment**

```bash
# Prepare for deployment
npm install
npm run build

# Set environment variables
export PORT=8080
export NODE_ENV=production

# Start production server
npm start
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
- Web Crypto API support (for encryption)
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

### **Development Setup**

```bash
# Clone and setup
git clone https://github.com/JewelPaul/CHAT-APPLICATION.git
cd CHAT-APPLICATION
npm install

# Start development server
npm start

# Start frontend development server (separate terminal)
cd client
npm run dev
```

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
- End-to-end encryption using modern Web Crypto API
- Transport layer encryption (HTTPS) essential for production
- Regular security audits recommended
- No sensitive data logging or persistence

### **Performance**
- Optimized React components with proper memoization
- Efficient WebSocket communication
- TailwindCSS for optimized CSS bundle size
- Vite for fast development and optimized production builds
- Memory usage scales with active users and media
- Automatic cleanup prevents memory leaks

---

## 📞 Support

For support, feature requests, or security concerns:

- **GitHub Issues:** [Create an issue](https://github.com/JewelPaul/CHAT-APPLICATION/issues)
- **Security:** Report security issues responsibly via GitHub

---

**Remember: ChatWave is ephemeral by design. Use it for conversations you don't need to keep forever.** 🌊

---

*Developed with ❤️ by [JewelPaul](https://github.com/JewelPaul)*
