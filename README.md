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

1. Push the entire project to your GitHub repository
2. Enable GitHub Pages in your repository settings
3. Set the source to the branch containing your code

Note: Since GitHub Pages doesn't support server-side code, you'll need to deploy the server component separately on a service like Heroku, Render, or Glitch.

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

1. Make sure both users are online and have the application open
2. Verify that the unique codes are entered correctly
3. Try refreshing the page and generating a new code
4. Check if your network allows WebSocket connections
5. If using a VPN, try disabling it temporarily

## License

This project is open source and available under the MIT License.

## Contact

- GitHub: [JewelPaul](https://github.com/JewelPaul)
- Instagram: [pauljewel25](https://instagram.com/pauljewel25)
