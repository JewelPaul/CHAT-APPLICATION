/**
 * WebRTC Service for handling voice and video calls
 * Implements complete WebRTC flow with STUN servers for NAT traversal
 */

import socketService from '../socket'

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  
  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  }

  /**
   * Start a call (caller initiates)
   */
  async startCall(
    isVideo: boolean, 
    targetKey: string, 
    roomId: string
  ): Promise<MediaStream> {
    console.log('[WebRTC] Starting call:', { isVideo, targetKey, roomId })
    
    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true
    })
    
    console.log('[WebRTC] Got local stream')

    // Create peer connection
    this.peerConnection = new RTCPeerConnection(this.config)
    console.log('[WebRTC] Created peer connection')

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!)
    })
    console.log('[WebRTC] Added local tracks')

    // Handle remote stream
    this.remoteStream = new MediaStream()
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind)
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track)
      })
    }

    // ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate')
        socketService.sendWebRTCSignal(targetKey, event.candidate.toJSON(), 'ice-candidate')
      }
    }

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState)
    }

    // Create and send offer
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    console.log('[WebRTC] Created and set local description (offer)')

    // Send offer through signaling
    socketService.sendWebRTCSignal(targetKey, offer, 'offer')

    return this.localStream
  }

  /**
   * Handle incoming offer (receiver)
   */
  async handleOffer(
    offer: RTCSessionDescriptionInit, 
    targetKey: string, 
    isVideo: boolean
  ): Promise<{ local: MediaStream, remote: MediaStream }> {
    console.log('[WebRTC] Handling offer from:', targetKey)
    
    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true
    })
    console.log('[WebRTC] Got local stream')

    // Create peer connection
    this.peerConnection = new RTCPeerConnection(this.config)
    console.log('[WebRTC] Created peer connection')

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!)
    })
    console.log('[WebRTC] Added local tracks')

    // Handle remote stream
    this.remoteStream = new MediaStream()
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind)
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track)
      })
    }

    // ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate')
        socketService.sendWebRTCSignal(targetKey, event.candidate.toJSON(), 'ice-candidate')
      }
    }

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState)
    }

    // Set remote description (offer)
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    console.log('[WebRTC] Set remote description (offer)')

    // Create answer
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    console.log('[WebRTC] Created and set local description (answer)')

    // Send answer
    socketService.sendWebRTCSignal(targetKey, answer, 'answer')

    return { local: this.localStream, remote: this.remoteStream }
  }

  /**
   * Handle incoming answer (caller)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<MediaStream | null> {
    console.log('[WebRTC] Handling answer')
    
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('[WebRTC] Set remote description (answer)')
    }
    
    return this.remoteStream
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('[WebRTC] Handling ICE candidate')
    
    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('[WebRTC] Added ICE candidate')
      } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error)
      }
    }
  }

  /**
   * Toggle microphone mute
   */
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        console.log('[WebRTC] Mute toggled:', !audioTrack.enabled)
        return !audioTrack.enabled // returns true if muted
      }
    }
    return false
  }

  /**
   * Toggle camera on/off
   */
  toggleCamera(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        console.log('[WebRTC] Camera toggled:', !videoTrack.enabled)
        return !videoTrack.enabled // returns true if camera off
      }
    }
    return false
  }

  /**
   * End call and cleanup
   */
  endCall() {
    console.log('[WebRTC] Ending call and cleaning up')
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop()
        console.log('[WebRTC] Stopped track:', track.kind)
      })
    }
    
    if (this.peerConnection) {
      this.peerConnection.close()
      console.log('[WebRTC] Peer connection closed')
    }
    
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }
}

export default new WebRTCService()
