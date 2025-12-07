# Contributing to ChatWave

Thank you for your interest in contributing to ChatWave! This document provides guidelines for testing and contributing to the project.

## Testing Guide

### Prerequisites
- Two browser windows/tabs or two devices
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone and camera (for testing calling features)

### Manual Testing Scenarios

#### 1. Basic Connection Flow
1. Open ChatWave in two browser tabs (e.g., one normal, one incognito)
2. Note the user code in Tab 1
3. In Tab 2, enter Tab 1's code and send connection request
4. Accept the connection request in Tab 1
5. Verify both users see the chat interface

**Expected:** Connection established, chat interface appears for both users.

#### 2. Text Messaging
1. After establishing a connection (see above)
2. Send messages from both tabs
3. Verify messages appear in real-time
4. Test typing indicators by typing (but not sending) a message

**Expected:** Messages deliver instantly, typing indicators appear.

#### 3. File Sharing - Images
1. In an active chat, click the paperclip icon
2. Select an image file (under 5MB: JPEG, PNG, GIF, WebP)
3. Verify the image appears inline in both chat windows
4. Click the image to open full-size lightbox
5. Test the download button

**Expected:** 
- Image uploads successfully
- Preview appears inline
- Lightbox opens on click
- Download works correctly

#### 4. File Sharing - Videos
1. Click the paperclip icon
2. Select a short video file (under 10MB: MP4, WebM, MOV)
3. Verify video player appears with controls
4. Test play, pause, volume, and fullscreen

**Expected:** Video uploads and plays with native controls.

#### 5. File Sharing - Audio
1. Click the paperclip icon
2. Select an audio file (under 5MB: MP3, WAV, OGG)
3. Verify audio player appears
4. Test play, pause, and volume controls

**Expected:** Audio uploads and plays correctly.

#### 6. File Sharing - Documents
1. Click the paperclip icon
2. Select a document (PDF, TXT, Word, Excel - under 10MB)
3. Verify file icon and info appear
4. Test the download button

**Expected:** Document uploads, shows file info, downloads correctly.

#### 7. File Validation - Size Limits
1. Try uploading a file larger than the limit (e.g., 15MB video)
2. Verify error message appears

**Expected:** "File size exceeds [X]MB limit" error shown.

#### 8. File Validation - Type Restrictions
1. Try uploading an unsupported file type (e.g., .exe, .zip)
2. Verify error message appears

**Expected:** "File type not supported" error shown.

#### 9. File Upload Rate Limiting
1. Rapidly upload 6+ files in quick succession
2. Verify rate limit error after 5th upload

**Expected:** "Upload rate limit exceeded" error after 5 uploads.

#### 10. Audio Call
1. In an active chat, click the phone icon
2. Grant microphone permission when prompted
3. Accept the incoming call in the other tab
4. Grant microphone permission in second tab
5. Test the mute/unmute button
6. Test the end call button

**Expected:**
- Call initiates successfully
- Incoming call modal appears
- Audio connection establishes
- Mute button works
- Call ends cleanly

#### 11. Video Call
1. In an active chat, click the video icon
2. Grant camera and microphone permissions
3. Accept the incoming call in the other tab
4. Grant camera and microphone permissions
5. Verify both local and remote video streams appear
6. Test mute, camera toggle, and end call buttons

**Expected:**
- Video call initiates successfully
- Both video streams visible
- Picture-in-Picture local video appears
- All controls function properly
- Call ends cleanly

#### 12. Call Rejection
1. Initiate a call from Tab 1
2. Click "Decline" in Tab 2's incoming call modal
3. Verify "Call declined" notification in Tab 1

**Expected:** Call rejected, caller notified.

#### 13. Permission Denied Handling
1. Click phone or video icon
2. Click "Block" or "Deny" when browser requests permissions
3. Verify error message about permissions

**Expected:** Clear error message about granting permissions.

#### 14. Disconnection Handling
1. Establish connection between two tabs
2. Close one tab
3. Verify the other tab shows disconnection notification

**Expected:** "User disconnected" notification appears.

#### 15. Message Persistence
1. Send messages and upload files
2. Refresh the page
3. Verify all data is lost (ephemeral design)

**Expected:** No messages or files persist after refresh.

## Security Testing

### XSS Prevention
- Try uploading files with malicious names: `<script>alert('XSS')</script>.jpg`
- Expected: Filename sanitized, no script execution

### Directory Traversal
- Try uploading with path traversal: `../../etc/passwd.txt`
- Expected: Path components removed, safe filename used

### MIME Type Spoofing
- Try renaming executable as image: `virus.exe` → `virus.jpg`
- Expected: Server validates actual MIME type, rejects invalid files

## Code Style

- Follow existing code patterns
- Use TypeScript for client code
- Add JSDoc comments for server functions
- Run linter before committing: `npm run lint`
- Format code: `npm run format`

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly using scenarios above
5. Run linter and fix any issues: `npm run lint`
6. Commit with descriptive message: `git commit -m 'Add amazing feature'`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request with detailed description

## Reporting Issues

When reporting bugs, please include:
- Browser version and OS
- Steps to reproduce
- Expected vs actual behavior
- Console error messages (if any)
- Screenshots (if applicable)

## Feature Requests

We welcome feature suggestions! Please:
- Check existing issues first to avoid duplicates
- Describe the use case clearly
- Explain how it fits with ChatWave's ephemeral design
- Consider privacy and security implications

## Questions?

- Open a [GitHub Issue](https://github.com/JewelPaul/CHAT-APPLICATION/issues)
- Check the [README](README.md) for documentation

Thank you for contributing to ChatWave! 🎉
