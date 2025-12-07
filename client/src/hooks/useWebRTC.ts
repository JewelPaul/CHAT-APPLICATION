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

  // Clean up media streams and peer connection
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    remoteStreamRef.current = null
    setRemoteStream(null)

    setCallState({
      status: 'idle',
      type: 'audio',
      isMuted: false,
      isVideoEnabled: false
    })
  }, [])

  // Initialize peer connection
  const initializePeerConnection = useCallback(async (callType: CallType) => {
    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video'
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)

      // Create peer connection
      const peerConnection = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = peerConnection

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0]
          setRemoteStream(event.streams[0])
        }
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && remoteUser) {
          socketService.sendWebRTCSignal(
            remoteUser.code,
            event.candidate.toJSON(),
            'ice-candidate'
          )
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        
        if (state === 'connected') {
          setCallState(prev => ({ ...prev, status: 'active' }))
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          cleanup()
        }
      }

      return peerConnection
    } catch (error) {
      console.error('Error initializing peer connection:', error)
      throw error
    }
  }, [remoteUser, cleanup])

  // Initiate a call
  const initiateCall = useCallback(async (callType: CallType) => {
    if (!remoteUser) return

    try {
      setCallState({
        status: 'calling',
        type: callType,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        remoteUser
      })

      const peerConnection = await initializePeerConnection(callType)
      
      // Create offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      // Send offer through signaling server
      socketService.sendWebRTCSignal(remoteUser.code, offer, 'offer')
      socketService.initiateCall(remoteUser.code, callType)
    } catch (error) {
      console.error('Error initiating call:', error)
      cleanup()
      throw error
    }
  }, [remoteUser, initializePeerConnection, cleanup])

  // Accept an incoming call
  const acceptCall = useCallback(async (callType: CallType, fromUser: User) => {
    if (!user) return

    try {
      setCallState({
        status: 'active',
        type: callType,
        isMuted: false,
        isVideoEnabled: callType === 'video',
        remoteUser: fromUser
      })

      await initializePeerConnection(callType)
      socketService.acceptCall(fromUser.code)
    } catch (error) {
      console.error('Error accepting call:', error)
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
    if (remoteUser) {
      socketService.endCall(remoteUser.code)
    }
    cleanup()
  }, [remoteUser, cleanup])

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
      if (!peerConnectionRef.current) return

      try {
        if (data.signalType === 'offer') {
          // Handle incoming offer
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )

          // Create answer
          const answer = await peerConnectionRef.current.createAnswer()
          await peerConnectionRef.current.setLocalDescription(answer)

          // Send answer back
          socketService.sendWebRTCSignal(data.from, answer, 'answer')
        } else if (data.signalType === 'answer') {
          // Handle incoming answer
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )
        } else if (data.signalType === 'ice-candidate') {
          // Handle ICE candidate
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.signal as RTCIceCandidateInit)
          )
        }
      } catch (error) {
        console.error('Error handling WebRTC signal:', error)
      }
    }

    socketService.on('webrtc-signal', handleWebRTCSignal)

    return () => {
      socketService.off('webrtc-signal', handleWebRTCSignal)
    }
  }, [])

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
