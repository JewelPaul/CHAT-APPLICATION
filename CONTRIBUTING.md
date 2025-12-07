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

#### 10. Audio Call (Remote Media Validation)
1. In an active chat, click the phone icon
2. Grant microphone permission when prompted (check browser console for permission grants)
3. **Verify local audio is being captured** (check browser tab title for mic indicator)
4. Accept the incoming call in the other tab
5. Grant microphone permission in second tab
6. **Wait 2-5 seconds for WebRTC connection to establish**
7. **Verify remote audio is heard**: Speak into mic in Tab 1, listen in Tab 2 and vice versa
8. Test the mute/unmute button - verify other user can no longer hear you when muted
9. Test the end call button

**Expected:**
- Call initiates successfully
- Incoming call modal appears with correct caller name
- **Both users can hear each other clearly** (two-way audio)
- Mute button works - remote user doesn't hear audio when muted
- Call UI shows "Connected" status
- Call ends cleanly without errors

**Browser Console Debugging:**
- Look for `[WebRTC]` prefixed log messages
- Verify "Call accepted by remote peer" message
- Verify "Creating offer after acceptance" message
- Verify "Remote description set from answer" message
- Verify "Received remote track: audio" message
- Verify "Connection state: connected" message
- Check for any red error messages

#### 11. Video Call (Remote Media Validation)
1. In an active chat, click the video icon
2. Grant camera and microphone permissions
3. **Verify local video preview appears** (you should see yourself in small PIP window)
4. Accept the incoming call in the other tab
5. Grant camera and microphone permissions
6. **Wait 2-5 seconds for WebRTC connection to establish**
7. **Verify both local and remote video streams appear:**
   - Large video shows remote user's camera feed
   - Small PIP (top-right) shows your own camera (mirrored)
8. **Verify remote audio is heard**: Speak into mic in Tab 1, listen in Tab 2 and vice versa
9. Test mute button - verify other user can no longer hear you
10. Test camera toggle button - verify your video disappears from other user's screen
11. Test end call button

**Expected:**
- Video call initiates successfully
- **Both video streams visible and flowing** (two-way video)
- **Both audio streams working** (two-way audio)
- Picture-in-Picture local video appears in top-right corner (mirrored)
- Remote video fills main screen
- All controls function properly
- Connection status shows "Connected"
- Call ends cleanly

**Browser Console Debugging:**
- Look for `[WebRTC]` prefixed log messages
- Verify "Got local stream with tracks: ['audio', 'video']" message
- Verify "Received remote track: audio" and "Received remote track: video" messages
- Verify "Setting remote stream with 2 tracks" message
- Verify "Connection state: connected" message
- Check ICE candidate exchange: "Generated ICE candidate" and "Adding ICE candidate"
- Look for any permission errors or red error messages

#### 12. Call Rejection
1. Initiate a call from Tab 1
2. Click "Decline" in Tab 2's incoming call modal
3. Verify "Call declined" notification in Tab 1
4. Verify no media permissions are requested in Tab 2
5. Verify chat interface remains functional

**Expected:** Call rejected, caller notified, no connection established.

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

#### 16. WebRTC Connection Troubleshooting
This test validates the WebRTC signaling flow and helps debug connection issues.

1. Open browser DevTools Console in both tabs (F12)
2. Initiate a video call from Tab 1
3. **In Tab 1 console**, verify you see:
   - `[WebRTC] Initiating video call to [code]`
   - `[WebRTC] Got local stream with tracks: ['audio', 'video']`
   - `[WebRTC] Call initiation sent, waiting for acceptance`
4. Accept the call in Tab 2
5. **In Tab 2 console**, verify you see:
   - `[WebRTC] Accepting video call from [code]`
   - `[WebRTC] Got local stream with tracks: ['audio', 'video']`
   - `[WebRTC] Call accepted, peer connection ready for offer`
6. **In Tab 1 console**, verify you see:
   - `[WebRTC] Call accepted by remote peer`
   - `[WebRTC] Creating offer after acceptance`
   - `[WebRTC] Offer sent to remote peer`
7. **In Tab 2 console**, verify you see:
   - `[WebRTC] Received signal: offer from [code]`
   - `[WebRTC] Answer sent`
8. **In both consoles**, verify you see:
   - Multiple `[WebRTC] Generated ICE candidate` messages
   - Multiple `[WebRTC] Adding ICE candidate` messages
   - `[WebRTC] ICE connection state: checking`
   - `[WebRTC] ICE connection state: connected`
   - `[WebRTC] Connection state: connected`
   - `[WebRTC] Received remote track: audio`
   - `[WebRTC] Received remote track: video` (for video calls)
   - `[WebRTC] Setting remote stream with 2 tracks` (for video calls)

**Expected:**
- Clean signaling flow with no errors
- Offer is sent AFTER call acceptance (not before)
- Both peers receive remote tracks
- Connection state reaches "connected"
- No "Received signal but no peer connection exists" warnings

**Common Issues:**
- **No remote video/audio**: Check for "Received remote track" messages
- **Permission errors**: Grant camera/mic permissions when prompted
- **ICE failures**: Check firewall settings, verify STUN servers are reachable
- **Timing issues**: Verify offer is sent after acceptance, not before

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
