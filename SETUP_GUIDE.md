# Setup Guide for ChatWave Transformation

## Quick Start

### 1. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
npm run install-client
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set a secure JWT secret (IMPORTANT!)
# Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Development Server

```bash
# Start both server and client with hot reload
npm run dev

# Or start separately:
npm run dev:server  # Server only on port 3000
cd client && npm run dev  # Client only on port 5173
```

### 4. Build for Production

```bash
# Build client
npm run build

# Start production server
npm start
```

## Testing the New Features

### Test User Registration

1. Open browser to `http://localhost:3000` (or `http://localhost:5173` in dev)
2. You should see the new authentication screen
3. Click "Sign up" and create an account:
   - Username: `@testuser`
   - Display Name: `Test User`
   - Password: `test1234`
4. Click "Create Account"
5. You should be authenticated and see the chat interface

### Test User Login

1. Refresh the page (or open in new tab)
2. You should see the login screen
3. Enter your credentials:
   - Username: `@testuser`
   - Password: `test1234`
4. Click "Sign In"
5. You should be logged in

### Test Session Persistence

1. Login to your account
2. Refresh the page
3. You should automatically be logged in (no login screen)

### View Database

```bash
# Install sqlite3 CLI tool (if not installed)
# On Ubuntu/Debian: sudo apt-get install sqlite3
# On macOS: brew install sqlite3

# Open the database
sqlite3 data/chatwave.db

# View users table
SELECT * FROM users;

# View friendships table  
SELECT * FROM friendships;

# Exit
.quit
```

### Test API Endpoints

```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "@apitest",
    "displayName": "API Test User",
    "password": "test1234",
    "publicKey": "test-key"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "@apitest",
    "password": "test1234"
  }'

# Save the token from response, then:
TOKEN="your-token-here"

# Verify token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Search users
curl "http://localhost:3000/api/users/search?q=test" \
  -H "Authorization: Bearer $TOKEN"
```

## Current Limitations

⚠️ **The following features are NOT yet implemented in the UI:**

1. **Contact List** - After authentication, you see the old welcome screen
2. **Friend Requests** - No UI to send/accept friend requests (API works)
3. **Message Persistence** - Messages not saved to IndexedDB yet
4. **Chat History** - Previous messages not loaded (only real-time)
5. **Settings Page** - No way to edit profile or change settings
6. **Logout Button** - You can logout by clearing localStorage manually

### Manual Logout

Open browser console (F12) and run:
```javascript
localStorage.removeItem('chatwave_token');
sessionStorage.removeItem('chatwave_session_key');
location.reload();
```

## Troubleshooting

### Database Permission Errors

```bash
# Make sure data directory exists
mkdir -p data

# Check permissions
ls -la data/

# If needed, fix permissions
chmod 755 data/
chmod 644 data/chatwave.db
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules
npm install
cd client && npm install
cd ..

# Clear build cache
rm -rf client/dist

# Rebuild
npm run build
```

### Database Issues

```bash
# Backup current database
cp data/chatwave.db data/chatwave.db.backup

# Delete and recreate (WARNING: loses all data)
rm data/chatwave.db*
# Restart server to recreate tables
```

## Development Workflow

### Making Changes

1. **Server Changes** (`server/*.js`)
   - Nodemon auto-restarts on file changes
   - Check server logs in terminal

2. **Client Changes** (`client/src/**`)
   - Vite hot-reloads automatically
   - Check browser console for errors

3. **Database Changes** (`server/database.js`)
   - Restart server after schema changes
   - May need to delete and recreate database

### Adding New API Endpoints

1. Add route handler in `server/server.js`
2. Test with curl or Postman
3. Add TypeScript types if needed
4. Update API documentation

### Adding New UI Components

1. Create component in `client/src/components/`
2. Import and use in parent component
3. Add necessary types to `client/src/types.ts`
4. Test in browser

## Security Notes

### Development vs Production

**Development:**
- Uses default JWT secret (INSECURE!)
- CORS set to `*`
- Debug logging enabled

**Production:**
- Must set secure JWT_SECRET (32+ random characters)
- CORS set to specific domain
- Log level set to `info` or `warn`
- HTTPS required

### Generate Secure JWT Secret

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Example output:
# 3f4a2b8c9d7e6f5a4b3c2d1e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0
```

Use this in your `.env` file:
```
JWT_SECRET=3f4a2b8c9d7e6f5a4b3c2d1e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0
```

## Next Steps for Developers

To complete the transformation, focus on these tasks in order:

1. **Build Contact List Component** (`client/src/components/ContactList.tsx`)
   - Display accepted friends from database
   - Show online/offline status
   - Click to start chat

2. **Build Friend Request Components**
   - Search users component
   - Send request button
   - Pending requests list
   - Accept/reject UI

3. **Implement Message Persistence**
   - Save messages to IndexedDB after sending
   - Load history when opening chat
   - Handle message status updates

4. **Integrate Everything**
   - Replace legacy chat interface
   - Add navigation between views
   - Implement settings page

See `TRANSFORMATION_STATUS.md` for detailed status and roadmap.

## Useful Commands

```bash
# Run linter
npm run lint

# Format code
npm run format

# Check server health
npm run health
# or
curl http://localhost:3000/health

# View server logs (when running)
tail -f logs/server.log  # if logging to file

# Monitor database size
du -h data/chatwave.db

# Check IndexedDB in browser
# Open DevTools > Application > Storage > IndexedDB > ChatWaveDB
```

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [React Context](https://react.dev/reference/react/useContext)

## Contributing

1. Read `TRANSFORMATION_STATUS.md` to understand current state
2. Pick a task from the "Next Steps" section
3. Create a feature branch: `git checkout -b feature/contact-list`
4. Make changes and test thoroughly
5. Run linter and formatter: `npm run lint && npm run format`
6. Commit with clear message
7. Push and create pull request

## Support

- Check `TRANSFORMATION_STATUS.md` for known issues
- Review existing code for patterns
- Ask questions in pull request comments

---

Happy coding! 🚀
