/**
 * Deployment Script for GitHub Pages
 * 
 * This script prepares the application for deployment to GitHub Pages by:
 * 1. Setting the correct Socket.io server URL
 * 2. Creating a CNAME file if needed
 * 3. Updating any GitHub-specific configurations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    // The GitHub username where this will be deployed
    githubUsername: 'JewelPaul',

    // The repository name
    repoName: 'CHAT-APPLICATION',

    // The Socket.io server URL to use in production
    // This should be updated to your actual server URL
    socketServerUrl: 'https://chat-application-1-fl18.onrender.com',

    // Whether to use a custom domain
    useCustomDomain: false,

    // Custom domain name (if useCustomDomain is true)
    customDomain: 'chat.example.com'
};

console.log('Starting deployment preparation...');

// 1. Update the Socket.io connection in connection-handler.js
try {
    const connectionHandlerPath = path.join(__dirname, 'js', 'connection-handler.js');

    if (fs.existsSync(connectionHandlerPath)) {
        let content = fs.readFileSync(connectionHandlerPath, 'utf8');

        // Replace the server URL
        content = content.replace(
            /return ['"]https:\/\/[^'"]+['"]/,
            `return '${config.socketServerUrl}'`
        );

        fs.writeFileSync(connectionHandlerPath, content);
        console.log(`✅ Updated Socket.io server URL to ${config.socketServerUrl}`);
    } else {
        console.log('⚠️ connection-handler.js not found, skipping update');
    }
} catch (error) {
    console.error('❌ Error updating connection-handler.js:', error);
}

// 2. Create a CNAME file for custom domain if needed
if (config.useCustomDomain && config.customDomain) {
    try {
        fs.writeFileSync(path.join(__dirname, 'CNAME'), config.customDomain);
        console.log(`✅ Created CNAME file for ${config.customDomain}`);
    } catch (error) {
        console.error('❌ Error creating CNAME file:', error);
    }
}

// 3. Create a .nojekyll file to disable Jekyll processing
try {
    fs.writeFileSync(path.join(__dirname, '.nojekyll'), '');
    console.log('✅ Created .nojekyll file');
} catch (error) {
    console.error('❌ Error creating .nojekyll file:', error);
}

// 4. Update the README.md with deployment instructions
try {
    const readmePath = path.join(__dirname, 'README.md');
    const readmeContent = `# ChatWave

A real-time chat application that works on GitHub Pages.

## Deployment

This application is deployed at: https://${config.githubUsername}.github.io/${config.repoName}/

## Server

The Socket.io server is hosted at: ${config.socketServerUrl}

## Local Development

1. Clone the repository
2. Run \`npm install\` to install dependencies
3. Run \`node server.js\` to start the local server
4. Open \`http://localhost:3000\` in your browser

## Deployment Instructions

1. Update the \`config\` object in \`deploy.js\` with your settings
2. Run \`node deploy.js\` to prepare the application for deployment
3. Push the changes to GitHub
4. Enable GitHub Pages in the repository settings

## License

MIT
`;
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Updated README.md');
} catch (error) {
    console.error('❌ Error updating README.md:', error);
}
