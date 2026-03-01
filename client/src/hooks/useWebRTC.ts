import { useState, useEffect, useRef, useCallback } from 'react'
import socketService from '../socket'
import type { CallState, CallType, User } from '../types'

// STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export function useWebRTC(user: User | null, remoteUser: User | null) {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    type: 'audio',
    isMuted: false,
    isVideoEnabled: false
  })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  // Queue for ICE candidates received before remote description is set
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  // Tracks whether this peer initiated the call (true = caller, false = receiver)
  const isInitiatorRef = useRef<boolean>(false)
  // Flag to prevent multiple concurrent offer creation attempts
  const isCreatingOfferRef = useRef<boolean>(false)
  // Ref always holds the current remote user — avoids stale closures in event handlers
  const remoteUserRef = useRef<User | null>(remoteUser)
  // Keep ref in sync with prop changes
  useEffect(() => {
    remoteUserRef.current = remoteUser
  }, [remoteUser])

  // Clean up media streams and peer connection
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleanup: Stopping tracks and closing peer connection')
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('[WebRTC] Stopped local track:', track.kind)
      })
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      console.log('[WebRTC] Peer connection closed')
      peerConnectionRef.current = null
    }

    remoteStreamRef.current = null
    setRemoteStream(null)
    iceCandidateQueueRef.current = []
    isInitiatorRef.current = false
    isCreatingOfferRef.current = false

    setCallState({
      status: 'idle',
      type: 'audio',
      isMuted: false,
      isVideoEnabled: false
    })
  }, [])

  // Helper function to process queued ICE candidates
  const processIceCandidateQueue = useCallback(async (peerConnection: RTCPeerConnection) => {
    if (iceCandidateQueueRef.current.length === 0) return
    
    console.log('[WebRTC] Processing', iceCandidateQueueRef.current.length, 'queued ICE candidates')
    for (const candidateInit of iceCandidateQueueRef.current) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit))
      } catch (error) {
        console.error('[WebRTC] Failed to add queued ICE candidate:', error)
        // Continue processing remaining candidates even if one fails
      }
    }
    iceCandidateQueueRef.current = []
  }, [])

  // Initialize peer connection
  const initializePeerConnection = useCallback(async (callType: CallType) => {
    try {
      console.log('[WebRTC] Initializing peer connection for', callType, 'call')
      
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video'
      }

      console.log('[WebRTC] Requesting user media with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('[WebRTC] Got local stream with tracks:', stream.getTracks().map(t => t.kind))
      
      localStreamRef.current = stream
      setLocalStream(stream)

      // Create peer connection
      const peerConnection = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = peerConnection
      console.log('[WebRTC] Created peer connection')

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
        console.log('[WebRTC] Added local track to peer connection:', track.kind)
      })

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind)
        if (event.streams && event.streams[0]) {
          console.log('[WebRTC] Setting remote stream with', event.streams[0].getTracks().length, 'tracks')
          remoteStreamRef.current = event.streams[0]
          setRemoteStream(event.streams[0])
        }
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] Generated ICE candidate:', event.candidate.type)
          if (remoteUserRef.current) {
            socketService.sendWebRTCSignal(
              remoteUserRef.current.code,
              event.candidate.toJSON(),
              'ice-candidate'
            )
          }
        } else {
          console.log('[WebRTC] ICE gathering complete')
        }
      }

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', peerConnection.iceConnectionState)
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.log('[WebRTC] Connection state:', state)
        
        if (state === 'connected') {
          console.log('[WebRTC] Peer connection established successfully')
          setCallState(prev => ({ ...prev, status: 'active' }))
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          console.log('[WebRTC] Connection closed or failed')
          cleanup()
        }
      }

      // Handle negotiation needed (for renegotiation scenarios)
      peerConnection.onnegotiationneeded = async () => {
        console.log('[WebRTC] Negotiation needed, isInitiator:', isInitiatorRef.current)
        
        // Only the initiator should create offers on renegotiation
        // Also check if we're already creating an offer to prevent multiple concurrent attempts
        if (isInitiatorRef.current && 
            peerConnection.signalingState === 'stable' && 
            !isCreatingOfferRef.current) {
          try {
            isCreatingOfferRef.current = true
            console.log('[WebRTC] Creating new offer due to negotiation needed')
            const offer = await peerConnection.createOffer()
            await peerConnection.setLocalDescription(offer)
            if (remoteUserRef.current) {
              socketService.sendWebRTCSignal(remoteUserRef.current.code, offer, 'offer')
            }
          } catch (error) {
            console.error('[WebRTC] Error during renegotiation:', error)
          } finally {
            isCreatingOfferRef.current = false
          }
        }
      }

      return peerConnection
    } catch (error) {
      console.error('[WebRTC] Error initializing peer connection:', error)
      throw error
    }
  }, [cleanup])

  // Initiate a call (caller side)
  const initiateCall = useCallback(async (callType: CallType) => {
    if (!remoteUser) return

    try {
      console.log('[WebRTC] Initiating', callType, 'call to', remoteUser.code)
      isInitiatorRef.current = true
      remoteUserRef.current = remoteUser
      
      setCallState({
        status: 'calling',
        type: callType,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        remoteUser
      })

      // Initialize peer connection and get local media
      await initializePeerConnection(callType)
      
      // Send call initiation signal (but not the offer yet)
      // The offer will be created after the remote peer accepts and is ready
      socketService.initiateCall(remoteUser.code, callType)
      console.log('[WebRTC] Call initiation sent, waiting for acceptance')
    } catch (error) {
      console.error('[WebRTC] Error initiating call:', error)
      cleanup()
      throw error
    }
  }, [remoteUser, initializePeerConnection, cleanup])

  // Accept an incoming call (receiver side)
  const acceptCall = useCallback(async (callType: CallType, fromUser: User) => {
    if (!user) return

    try {
      console.log('[WebRTC] Accepting', callType, 'call from', fromUser.code)
      isInitiatorRef.current = false
      remoteUserRef.current = fromUser
      
      setCallState({
        status: 'active',
        type: callType,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        remoteUser: fromUser
      })

      // Initialize peer connection and get local media
      await initializePeerConnection(callType)
      
      // Notify the caller that we've accepted and are ready for offer
      socketService.acceptCall(fromUser.code)
      console.log('[WebRTC] Call accepted, peer connection ready for offer')
    } catch (error) {
      console.error('[WebRTC] Error accepting call:', error)
      cleanup()
      throw error
    }
  }, [user, initializePeerConnection, cleanup])

  // Reject an incoming call
  const rejectCall = useCallback((fromUser: User) => {
    socketService.rejectCall(fromUser.code)
    cleanup()
  }, [cleanup])

  // End an active call
  const endCall = useCallback(() => {
    if (remoteUserRef.current) {
      socketService.endCall(remoteUserRef.current.code)
    }
    cleanup()
  }, [cleanup])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }))
      }
    }
  }, [])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }))
      }
    }
  }, [])

  // Handle WebRTC signaling
  useEffect(() => {
    const handleWebRTCSignal = async (data: {
      from: string
      signal: RTCSessionDescriptionInit | RTCIceCandidateInit
      signalType: 'offer' | 'answer' | 'ice-candidate'
    }) => {
      console.log('[WebRTC] Received signal:', data.signalType, 'from', data.from)
      
      if (!peerConnectionRef.current) {
        console.warn('[WebRTC] Received signal but no peer connection exists')
        return
      }

      try {
        if (data.signalType === 'offer') {
          // Handle incoming offer
          console.log('[WebRTC] Processing offer')
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )
          console.log('[WebRTC] Remote description set from offer')

          // Process any queued ICE candidates
          await processIceCandidateQueue(peerConnectionRef.current)

          // Create answer
          console.log('[WebRTC] Creating answer')
          const answer = await peerConnectionRef.current.createAnswer()
          await peerConnectionRef.current.setLocalDescription(answer)
          console.log('[WebRTC] Local description set from answer')

          // Send answer back
          socketService.sendWebRTCSignal(data.from, answer, 'answer')
          console.log('[WebRTC] Answer sent')
        } else if (data.signalType === 'answer') {
          // Handle incoming answer
          console.log('[WebRTC] Processing answer')
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )
          console.log('[WebRTC] Remote description set from answer')

          // Process any queued ICE candidates
          await processIceCandidateQueue(peerConnectionRef.current)
        } else if (data.signalType === 'ice-candidate') {
          // Handle ICE candidate
          const candidate = new RTCIceCandidate(data.signal as RTCIceCandidateInit)
          
          // If remote description is set, add candidate immediately
          // Otherwise, queue it for later
          if (peerConnectionRef.current.remoteDescription) {
            console.log('[WebRTC] Adding ICE candidate')
            await peerConnectionRef.current.addIceCandidate(candidate)
          } else {
            console.log('[WebRTC] Queueing ICE candidate (remote description not set yet)')
            iceCandidateQueueRef.current.push(data.signal as RTCIceCandidateInit)
          }
        }
      } catch (error) {
        console.error('[WebRTC] Error handling WebRTC signal:', error)
      }
    }

    const handleCallAccepted = async () => {
      console.log('[WebRTC] Call accepted by remote peer')
      
      // Now that the receiver is ready, create and send the offer
      if (isInitiatorRef.current && peerConnectionRef.current) {
        try {
          console.log('[WebRTC] Creating offer after acceptance')
          const offer = await peerConnectionRef.current.createOffer()
          await peerConnectionRef.current.setLocalDescription(offer)
          console.log('[WebRTC] Local description set from offer')
          
          if (remoteUserRef.current) {
            socketService.sendWebRTCSignal(remoteUserRef.current.code, offer, 'offer')
            console.log('[WebRTC] Offer sent to remote peer')
          }
        } catch (error) {
          console.error('[WebRTC] Error creating offer after acceptance:', error)
        }
      }
    }

    socketService.on('webrtc-signal', handleWebRTCSignal)
    socketService.on('call-accepted', handleCallAccepted)

    return () => {
      socketService.off('webrtc-signal', handleWebRTCSignal)
      socketService.off('call-accepted', handleCallAccepted)
    }
  }, [processIceCandidateQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    callState,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  }
}
