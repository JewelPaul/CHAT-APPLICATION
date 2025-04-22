# ChatWave - Real-time Chat Application

ChatWave is a professional, beautiful, and fully functional real-time chat application that allows users to connect and chat securely without requiring any sign-up or registration.

## Features

- **Real-time Communication**: Instant messaging using WebSocket technology
- **Secure Connections**: End-to-end encryption for all messages
- **No Sign-up Required**: Connect instantly using unique codes
- **Device Detection**: Automatic device name detection
- **Responsive Design**: Works on mobile, tablet, and desktop devices
- **Image Sharing**: Send and receive images in your chats
- **Connection Management**: Connect with multiple users simultaneously
- **Privacy-Focused**: No chat history stored on servers
- **Enhanced Error Handling**: Improved connection error handling with retry functionality
- **Automatic Reconnection**: Automatically attempts to reconnect when connection is lost
- **GitHub Pages Compatible**: Works seamlessly when deployed to GitHub Pages

## Deployment Instructions

### Local Development

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   node server.js
   ```
5. Open your browser and go to `http://localhost:3000`

### GitHub Pages Deployment

To deploy this application on GitHub Pages:

1. Update the configuration in the `deploy.js` script:
   ```javascript
   const config = {
       githubUsername: 'YourGitHubUsername',
       repoName: 'chatwave',
       socketServerUrl: 'https://your-server-url.herokuapp.com',
       useCustomDomain: false,
       customDomain: 'chat.example.com'
   };
   ```

2. Run the deployment script to prepare the files:
   ```
   node deploy.js
   ```

3. Push the entire project to your GitHub repository
4. Enable GitHub Pages in your repository settings
5. Set the source to the branch containing your code

Note: Since GitHub Pages doesn't support server-side code, you'll need to deploy the server component separately on a service like Heroku, Render, or Glitch. The `deploy.js` script helps configure the client-side code to connect to your deployed server.

### Server Deployment (Heroku, Render, etc.)

1. Create an account on your preferred hosting service
2. Create a new application/service
3. Connect your GitHub repository or upload the code
4. Make sure to set the correct environment variables if needed
5. Deploy the application

## How to Use

1. Open the application in your browser
2. You'll see your device name and a unique code
3. Share your unique code with someone you want to chat with
4. To connect with someone, enter their unique code and click "Connect"
5. Once connected, you can start chatting in real-time

## Troubleshooting Connection Issues

If you experience connection issues:

1. If you see "Connection error: Unknown error" messages, use the "Retry Connection" button
2. Make sure both users are online and have the application open
3. Verify that the unique codes are entered correctly
4. Try refreshing the page and generating a new code
5. Check if your network allows WebSocket connections
6. If using a VPN, try disabling it temporarily
7. Ensure the Socket.io server is running and accessible

### Fixing "Connection error: Unknown error"

This application includes enhanced error handling and automatic reconnection features. If you encounter connection errors:

1. Click the "Retry Connection" button that appears with the error message
2. Check your internet connection
3. If the error persists, try refreshing the page
4. For server deployment issues, make sure the Socket.io server URL in `js/connection-handler.js` is correctly set

## License

This project is open source and available under the MIT License.

## Contact

- GitHub: [JewelPaul](https://github.com/JewelPaul)
- Instagram: [pauljewel25](https://instagram.com/pauljewel25)
