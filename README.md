# ChatWave - Ephemeral Secure Chat Application

![ChatWave Interface](https://github.com/user-attachments/assets/a8da8dd5-54b1-4d35-b900-16a14129a750)

A professional, production-ready ephemeral chat application built with React, TypeScript, and Socket.io. ChatWave prioritizes privacy with zero persistent storage - all conversations are lost when users disconnect or refresh their browser.

## 🚀 Features

- **Completely Ephemeral**: No database, no logs, no persistent storage - all data exists only in memory
- **End-to-End Encryption**: Messages are encrypted between users using modern cryptographic standards
- **Consent-Based Connection**: Both parties must explicitly approve connections before chatting begins  
- **Invite-Only System**: Users connect via unique invite codes, no public directories or discoverability
- **Real-Time Communication**: Instant messaging with typing indicators and connection status
- **Media Sharing**: Share files and images (stored in memory only, automatically deleted)
- **Cross-Platform**: Works on all modern browsers and devices
- **Professional UI**: Clean, responsive interface built with React and Tailwind CSS

## 🏗️ Architecture

### Server (Node.js + Socket.io)
- **Express.js** web server with security middleware (Helmet, Compression)
- **Socket.io** for real-time WebSocket communication
- **In-memory storage** only - no databases or file persistence
- **Structured logging** with configurable log levels
- **Health monitoring** endpoint with system metrics
- **Graceful error handling** for malformed requests and crashes

### Client (React + TypeScript)
- **React 19** with TypeScript for type safety
- **Vite** for fast development and optimized production builds
- **Tailwind CSS** for responsive, professional styling
- **Socket.io Client** for real-time communication
- **ESLint + Prettier** for code quality and consistency

## 🔒 Security Features

- **XSS Protection**: All user input is sanitized before processing
- **Input Validation**: Strict validation of user codes, messages, and data formats
- **CORS Configuration**: Configurable cross-origin resource sharing
- **CSP Headers**: Content Security Policy to prevent code injection
- **Rate Limiting**: Built-in Socket.io connection management
- **Error Boundaries**: Graceful handling of client-side errors

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with WebSocket support

### Local Development

1. **Clone and install dependencies:**
```bash
git clone https://github.com/JewelPaul/CHAT-APPLICATION.git
cd CHAT-APPLICATION
npm install
```

2. **Configure environment (optional):**
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

3. **Start development server:**
```bash
npm run dev
```

4. **Open application:**
Navigate to `http://localhost:3000` in your browser

### Production Build

```bash
npm run build    # Build client assets
npm start        # Start production server
```

## 🌍 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000                    # Server port (default: 3000)
NODE_ENV=development         # Environment mode
ORIGIN=http://localhost:3000 # CORS origin (use * for any origin)
LOG_LEVEL=info              # Logging level (error, warn, info, debug)
```

## 🚀 Deployment (Render)

ChatWave is configured for easy deployment on Render.com:

1. **Fork this repository**
2. **Connect to Render:**
   - Create a new Web Service
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Configure `ORIGIN` to your deployed domain
   - Adjust `LOG_LEVEL` as needed

4. **Deploy:**
   - Render will build and deploy automatically
   - Health checks are configured via `/health` endpoint

### Manual Deploy Commands
```bash
# Build command (automated)
npm install && npm run build

# Start command (automated)  
npm start
```

## 🛠️ Development Workflow

### Available Scripts

```bash
npm start              # Production server
npm run dev            # Development with hot reload (server + client)
npm run dev:server     # Server only with nodemon
npm run build          # Build client for production
npm run lint           # Lint both server and client
npm run format         # Format code with Prettier
npm run health         # Check server health endpoint
```

### Code Quality

- **ESLint**: Configured for both server and client with TypeScript support
- **Prettier**: Consistent code formatting across the project
- **TypeScript**: Strict type checking for client-side code
- **Nodemon**: Automatic server restart during development

## 📡 API Endpoints

### HTTP Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/` | GET | Serve client application | HTML |
| `/health` | GET | Health check with metrics | JSON |

### Socket.io Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `register` | `{code, deviceName, avatar}` | Register user with invite code |
| `connection-request` | `{code}` | Request connection to another user |
| `connection-accept` | `{code}` | Accept incoming connection request |
| `message` | `{to, message, roomId}` | Send text message |
| `media-upload` | `{to, roomId, mediaData, filename, mimeType}` | Share media file |
| `typing-start` | `{to}` | Indicate typing started |
| `typing-stop` | `{to}` | Indicate typing stopped |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `registered` | `{code, deviceName}` | Confirm user registration |
| `connection-request` | `{code, deviceName, avatar}` | Incoming connection request |
| `connection-accepted` | `{code, roomId, deviceName, avatar}` | Connection accepted |
| `message` | `{id, from, to, message, timestamp, type}` | Incoming text message |
| `media-message` | `{...messageData, mediaData}` | Incoming media file |
| `typing-start` | `{from}` | User started typing |
| `typing-stop` | `{from}` | User stopped typing |
| `user-disconnected` | `{userCode}` | Connection partner disconnected |
| `connection-error` | `{error}` | Connection or authentication error |
| `message-error` | `{error}` | Message delivery error |

## 🔍 Health Monitoring

The `/health` endpoint provides comprehensive system metrics:

```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2025-01-15T10:30:00.000Z", 
  "clients": 42,
  "users": 42,
  "rooms": 21,
  "media": 15,
  "memoryUsage": {
    "rss": 67108864,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576,
    "arrayBuffers": 524288
  },
  "version": "2.0.0"
}
```

## 🔐 Privacy & Security Notes

### Data Handling
- **No Persistence**: Messages, media, and user data are never written to disk
- **Memory Only**: All data exists in server RAM and is lost on restart/disconnect
- **Automatic Cleanup**: User data is immediately deleted when connections close
- **No Logging**: Message content is never logged (only metadata for debugging)

### Encryption
- **Client-Side**: Messages are encrypted before transmission using Web Crypto API
- **Key Exchange**: Secure key exchange using Diffie-Hellman or similar protocols
- **Perfect Forward Secrecy**: New keys generated for each session
- **Fallback Mode**: Unencrypted messaging if encryption fails (with clear user notice)

### Network Security
- **HTTPS Required**: Production deployment enforces secure connections
- **WebSocket Security**: WSS (WebSocket Secure) for all real-time communication
- **CORS Protection**: Configurable cross-origin restrictions
- **Input Sanitization**: All user input sanitized to prevent XSS attacks

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
- Check if port is already in use: `lsof -ti:3000`
- Verify Node.js version: `node --version` (requires 18+)
- Check environment variables in `.env`

**Client build fails:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `cd client && npx tsc --noEmit`

**WebSocket connection fails:**
- Verify server is running and accessible
- Check CORS configuration in server settings
- Ensure firewall allows WebSocket connections

**Messages not delivering:**
- Check browser console for JavaScript errors
- Verify both users are properly registered
- Check server logs for Socket.io errors

### Development Tips

- Use browser DevTools Network tab to monitor WebSocket traffic
- Check server logs with `LOG_LEVEL=debug` for detailed diagnostics
- Test with multiple browser tabs/windows to simulate different users
- Monitor health endpoint for system resource usage

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Lint and format: `npm run lint && npm run format`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/JewelPaul/CHAT-APPLICATION/issues)
- **Documentation**: Check this README and inline code comments
- **Security**: Report security issues privately via GitHub

---

**⚠️ Privacy Reminder**: ChatWave is designed to lose data. Closing your browser tab will permanently delete all conversations. This is intentional and core to our privacy design.