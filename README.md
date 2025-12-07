# ChatWave - Ephemeral Secure Chat Application

![ChatWave Interface](https://github.com/user-attachments/assets/a8da8dd5-54b1-4d35-b900-16a14129a750)

A professional, production-ready ephemeral chat application built with React, TypeScript, and Socket.io. ChatWave prioritizes privacy with zero persistent storage - all conversations are lost when users disconnect or refresh their browser.

## 🚀 Features

- **Completely Ephemeral**: No database, no logs, no persistent storage - all data exists only in memory
- **End-to-End Encryption**: Messages are encrypted between users using modern cryptographic standards
- **Consent-Based Connection**: Both parties must explicitly approve connections before chatting begins  
- **Invite-Only System**: Users connect via unique invite codes, no public directories or discoverability
- **Real-Time Communication**: Instant messaging with typing indicators and connection status
- **Rich Media Sharing**: Share files (images, videos, audio, documents) with inline previews and secure handling
- **Audio/Video Calling**: One-to-one WebRTC-powered audio and video calls with full controls
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
- Node.js 20+ and npm (required for Vite 7 compatibility)
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

## 🐳 Docker Deployment

ChatWave includes production-ready Docker configuration with Node 20 and optimized build process:

### Docker Build & Run

```bash
# Build the Docker image
docker build -t chatwave .

# Run the container
docker run -d \
  -p 3000:3000 \
  --name chatwave-app \
  -e NODE_ENV=production \
  -e ORIGIN=* \
  -e LOG_LEVEL=info \
  chatwave

# Check health
curl http://localhost:3000/health

# Stop and remove
docker stop chatwave-app && docker rm chatwave-app
```

### Docker Features

- **Node 20 Alpine**: Lightweight base image with required Node version
- **Multi-stage ready**: Current single-stage optimized for simplicity
- **Health checks**: Built-in health monitoring via `/health` endpoint
- **Security**: Runs as non-root user in container
- **Environment**: Configurable via environment variables

## 🚀 Deployment (Render)

ChatWave is configured for easy deployment on Render.com with a production-ready build system:

### Quick Deploy Steps

1. **Fork this repository**
2. **Connect to Render:**
   - Create a new Web Service
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Environment Variables** (automatically configured):
   - `NODE_ENV=production`
   - `PORT=10000`
   - `ORIGIN` set to your service URL
   - `LOG_LEVEL=info`
   - `ENCRYPTION_ENABLED=false` (optional)

4. **Deploy:**
   - Render will build and deploy automatically
   - Health checks are configured via `/health` endpoint
   - Cold start time: ~30-60 seconds

### Manual Deploy Commands
```bash
# Build command (automated)
npm install && npm run build

# Start command (automated)  
npm start

# Health check
curl https://your-app.onrender.com/health
```

### Expected Health Response
```json
{
  "status": "ok",
  "uptime": 120,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "clients": 0,
  "version": "2.0.0"
}
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
| `call-initiate` | `{to, type}` | Initiate audio/video call |
| `call-accept` | `{from}` | Accept incoming call |
| `call-reject` | `{from}` | Reject incoming call |
| `call-end` | `{to}` | End active call |
| `webrtc-signal` | `{to, signal, signalType}` | WebRTC signaling (SDP/ICE) |

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
| `call-incoming` | `{from, type, deviceName}` | Incoming audio/video call |
| `call-accepted` | `{from, deviceName}` | Call was accepted |
| `call-rejected` | `{from}` | Call was rejected |
| `call-ended` | `{from}` | Call has ended |
| `call-error` | `{error}` | Call-related error |
| `webrtc-signal` | `{from, signal, signalType}` | WebRTC signaling from peer |

## 🔍 Health Monitoring

The `/health` endpoint provides essential system status:

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "clients": 42,
  "version": "2.0.0"
}
```

Use this endpoint for:
- Render.com health checks (configured in `render.yaml`)
- Monitoring server availability
- Checking active connection count
- Uptime tracking

## 📁 Rich Media Sharing

ChatWave supports secure file sharing with the following capabilities:

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG (max 5MB)
- **Videos**: MP4, WebM, QuickTime, AVI (max 10MB, short clips recommended)
- **Audio**: MP3, WAV, OGG, WebM, AAC (max 5MB)
- **Documents**: PDF, TXT, CSV, Word, Excel (max 10MB)

### Features
- **Inline Previews**: Images, videos, and audio display with native controls
- **Image Lightbox**: Click images to view full-size with zoom
- **Secure Downloads**: All file types can be downloaded safely
- **Rate Limiting**: Max 5 uploads per minute per user
- **Validation**: Server-side MIME type and size checks
- **Sanitization**: Filenames sanitized to prevent XSS and directory traversal
- **Ephemeral Storage**: Files stored in memory only, deleted when users disconnect

### Using File Sharing

1. Click the paperclip icon in the chat interface
2. Select a file within the size limits
3. File is validated and uploaded automatically
4. Preview appears inline for images/video/audio
5. Documents show file icon with download option

## 📞 Audio/Video Calling

ChatWave includes WebRTC-powered one-to-one audio and video calls:

### Features
- **Audio Calls**: Crystal-clear voice communication
- **Video Calls**: HD video with Picture-in-Picture local view
- **Call Controls**:
  - Mute/unmute microphone
  - Toggle camera on/off (video calls)
  - End call button
- **Call Management**:
  - Incoming call modal with accept/reject
  - Call status indicators
  - Graceful error handling

### Using Calling Features

**To make a call:**
1. Open a chat with another user
2. Click the phone icon (audio) or video icon (video call)
3. Grant camera/microphone permissions when prompted
4. Wait for the other user to accept

**To receive a call:**
1. Incoming call modal appears automatically
2. Click "Accept" to join or "Decline" to reject
3. Grant permissions if needed
4. Call starts when both users are connected

### Requirements
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera (for video calls) and microphone access
- Stable internet connection

### Troubleshooting Calls

**No remote video/audio (users only see themselves):**
- **Root Cause**: This was a timing issue in the WebRTC signaling flow where the offer was sent before the receiver's peer connection was initialized
- **Fixed**: Offer is now sent only after the receiver accepts the call and confirms readiness
- **Verify**: Open browser console (F12) and look for `[WebRTC]` logs. You should see:
  - "Call accepted by remote peer" in caller's console
  - "Creating offer after acceptance" message
  - "Received remote track: audio" and/or "video" in both consoles
  - "Connection state: connected" in both consoles
- **Still not working?** Check browser console for errors and verify both users granted permissions

**Permission denied errors:**
- Check browser settings for camera/microphone access
- Click the lock icon in address bar to manage permissions
- Reload the page after granting permissions

**Call quality issues:**
- Check internet connection stability
- Close bandwidth-heavy applications
- Try switching to audio-only if video is problematic

**Call won't connect:**
- Ensure both users have granted required permissions
- Check firewall settings (WebRTC uses UDP)
- Try refreshing the page and reconnecting
- Open browser console to check for WebRTC errors

**Debugging with Browser Console:**
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for `[WebRTC]` prefixed messages
4. Check for errors (shown in red)
5. Verify the signaling flow: initiate → accept → offer → answer → ICE exchange → connected

## 🔐 Privacy & Security Notes

### Data Handling
- **No Persistence**: Messages, media, and user data are never written to disk
- **Memory Only**: All data exists in server RAM and is lost on restart/disconnect
- **Automatic Cleanup**: User data is immediately deleted when connections close
- **No Logging**: Message content is never logged (only metadata for debugging)

### Encryption (Optional Feature)
- **Optional Feature**: Enable/disable via `ENCRYPTION_ENABLED` environment variable
- **Client-Side**: Messages are encrypted before transmission using Web Crypto API  
- **Key Exchange**: Secure key exchange using Diffie-Hellman or similar protocols
- **Perfect Forward Secrecy**: New keys generated for each session
- **Graceful Fallback**: If encryption fails, falls back to plaintext with user notification
- **Production Ready**: Wrapped in try/catch blocks to prevent chat interruption

### Network Security
- **HTTPS Required**: Production deployment enforces secure connections
- **WebSocket Security**: WSS (WebSocket Secure) for all real-time communication
- **CORS Protection**: Configurable cross-origin restrictions  
- **Input Sanitization**: All user input sanitized to prevent XSS attacks (2KB message limit)
- **Rate Limiting**: Socket.io built-in connection throttling

## 🐛 Troubleshooting

### Build Issues

**Docker build fails with "Could not resolve entry module 'index.html'" error:**
- ✅ **Root Cause**: Previously, the `postinstall` script triggered `vite build` during `npm install` before source files were copied to the container
- ✅ **Resolution**: Removed problematic `postinstall` script and updated Docker build sequence
- ✅ **Fix**: Docker now uses Node 20 (required for Vite 7) and builds after all files are copied
- Manual fix: Remove `postinstall` from `package.json` and run `npm run build` manually after installation

**Node version compatibility issues:**
- Vite 7 requires Node.js 20.19.0+ or 22.12.0+
- Docker now uses `node:20-alpine` base image  
- Local development requires Node 20+: Check with `node --version`

**Build fails with TypeScript errors:**
- ✅ Fixed: Simplified TypeScript config (no more composite build)
- Run: `npm run build` should complete without errors
- Clear cache: `rm -rf client/node_modules client/dist && cd client && npm install`

**Render deployment fails:**
- Check build logs for TypeScript compilation errors
- Verify `render.yaml` configuration is correct
- Ensure all dependencies are in `package.json`, not just `devDependencies`

### Runtime Issues

**Server won't start:**
- Check if port is already in use: `lsof -ti:3000`
- Verify Node.js version: `node --version` (requires 20+)
- Check environment variables in `.env`

**WebSocket connection fails:**
- Verify server is running and accessible: `curl http://localhost:3000/health`
- Check CORS configuration in server settings
- For Render: WebSocket connections may take 30-60 seconds on cold start

**Messages not delivering:**
- Check browser console for JavaScript errors
- Verify both users are properly registered
- Check server logs for Socket.io errors
- Test with `/health` endpoint to verify server connectivity

### Render-Specific Issues

**Cold start delays:**
- First request after inactivity takes 30-60 seconds
- Health check endpoint helps maintain warm connections
- Consider upgrading to paid plan for faster cold starts

**Environment variables not set:**
- Check Render dashboard environment variables
- `ORIGIN` should be set to your Render service URL
- `NODE_ENV=production` is required for production mode

### Development Tips

- Use browser DevTools Network tab to monitor WebSocket traffic
- Check server logs with `LOG_LEVEL=debug` for detailed diagnostics
- Test with multiple browser tabs/windows to simulate different users
- Monitor health endpoint for system resource usage

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Detailed testing scenarios for all features
- QA instructions for file sharing and calling
- Security testing guidelines
- Code style requirements
- Pull request process

Quick start:
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