import { useState, useEffect, useRef, useCallback } from 'react'
import socketService from '../socket'
import type { CallState, CallType, User } from '../types'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
}

const IDLE_STATE: CallState = {
  status: 'idle',
  type: 'audio',
  isMuted: false,
  isVideoEnabled: false
}

interface Ringtone {
  stop: (immediate?: boolean) => void
}

export function useWebRTC(remoteUser: User | null) {
  const [callState, setCallState] = useState<CallState>(IDLE_STATE)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  const isInitiatorRef = useRef<boolean>(false)
  const isCreatingOfferRef = useRef<boolean>(false)
  // Always reflects the latest call state for use inside socket handlers
  const callStateRef = useRef<CallState>(IDLE_STATE)
  useEffect(() => { callStateRef.current = callState }, [callState])
  // Tracks the current remote peer for ICE/signal routing — avoids stale closures
  const remoteUserRef = useRef<User | null>(null)
  // Keeps the remoteUser prop current so initiateCall always targets the right peer
  const remoteUserPropRef = useRef<User | null>(remoteUser)
  useEffect(() => { remoteUserPropRef.current = remoteUser }, [remoteUser])

  // ─── Ringtone ────────────────────────────────────────────────────────────────
  const ringtoneRef = useRef<Ringtone | null>(null)

  const playRingtone = useCallback(() => {
    try {
      type AudioCtxCtor = typeof AudioContext
      const AudioCtx: AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioCtxCtor }).webkitAudioContext
      const ctx = new AudioCtx()
      // Master gain node — used to fade the whole ringtone in/out
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0, ctx.currentTime)
      masterGain.connect(ctx.destination)

      let active = true
      let stopped = false

      const ring = () => {
        if (!active) return
        try {
          // Two-tone soft digital pulse for a premium feel
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const pulseGain = ctx.createGain()

          osc1.connect(pulseGain)
          osc2.connect(pulseGain)
          pulseGain.connect(masterGain)

          osc1.type = 'sine'
          osc2.type = 'sine'
          osc1.frequency.value = 360   // base tone (low, subtle)
          osc2.frequency.value = 480   // harmonic (richness)

          // Soft pulse envelope: fade-in → hold → fade-out
          pulseGain.gain.setValueAtTime(0, ctx.currentTime)
          pulseGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15)
          pulseGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.55)
          pulseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9)

          osc1.start(ctx.currentTime)
          osc1.stop(ctx.currentTime + 1.0)
          osc2.start(ctx.currentTime)
          osc2.stop(ctx.currentTime + 1.0)
        } catch { /* ignore errors on individual oscillator nodes */ }
        setTimeout(() => { if (active) ring() }, 1800)  // 1.8 s interval (1.0 s audio + 0.8 s silence)
      }

      // Fade master volume in over 400 ms
      masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4)
      ring()

      ringtoneRef.current = {
        stop: (immediate = false) => {
          if (stopped) return
          stopped = true
          active = false
          if (immediate) {
            ctx.close().catch(() => { /* ignore */ })
          } else {
            // Fade out over 300 ms then close
            masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime)
            masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
            setTimeout(() => ctx.close().catch(() => { /* ignore */ }), 350)
          }
        }
      }
    } catch { /* silently fail if Web Audio API is unavailable */ }
  }, [])

  const stopRingtone = useCallback((immediate = false) => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop(immediate)
      ringtoneRef.current = null
    }
  }, [])

  // ─── Cleanup ─────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleanup: stopping tracks and closing peer connection')
    stopRingtone()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setRemoteStream(null)
    iceCandidateQueueRef.current = []
    isInitiatorRef.current = false
    isCreatingOfferRef.current = false
    remoteUserRef.current = null
    setCallState(IDLE_STATE)
  }, [stopRingtone])

  // ─── ICE candidate queue processor ──────────────────────────────────────────
  const processIceCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    if (iceCandidateQueueRef.current.length === 0) return
    console.log('[WebRTC] Processing', iceCandidateQueueRef.current.length, 'queued ICE candidates')
    const candidates = [...iceCandidateQueueRef.current]
    iceCandidateQueueRef.current = []
    for (const candidateInit of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit))
      } catch (err) {
        console.error('[WebRTC] Failed to add queued ICE candidate:', err)
      }
    }
  }, [])

  // ─── Peer connection setup ───────────────────────────────────────────────────
  const initializePeerConnection = useCallback(async (callType: CallType) => {
    console.log('[WebRTC] Initializing peer connection for', callType, 'call')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
        ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
        : false
    })
    console.log('[WebRTC] Got local stream:', stream.getTracks().map(t => t.kind))
    localStreamRef.current = stream
    setLocalStream(stream)

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind)
      if (event.streams[0]) {
        setRemoteStream(event.streams[0])
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserRef.current) {
        socketService.sendWebRTCSignal(
          remoteUserRef.current.code,
          event.candidate.toJSON(),
          'ice-candidate'
        )
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[WebRTC] Connection state:', state)
      if (state === 'connected') {
        setCallState(prev => ({ ...prev, status: 'active' }))
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        cleanup()
      }
    }

    return pc
  }, [cleanup])

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Caller: initiate an outgoing call to the currently active remote user */
  const initiateCall = useCallback(async (callType: CallType) => {
    const target = remoteUserPropRef.current
    if (!target) return
    console.log('[WebRTC] Initiating', callType, 'call to', target.code)

    isInitiatorRef.current = true
    remoteUserRef.current = target

    setCallState({
      status: 'calling',
      type: callType,
      isMuted: false,
      isVideoEnabled: callType === 'video',
      remoteUser: target
    })

    try {
      await initializePeerConnection(callType)
      socketService.initiateCall(target.code, callType)
      console.log('[WebRTC] Call initiation sent — waiting for acceptance')
    } catch (error) {
      console.error('[WebRTC] Error initiating call:', error)
      cleanup()
      throw error
    }
  }, [initializePeerConnection, cleanup])

  /** Callee: accept the current incoming (ringing) call */
  const acceptCall = useCallback(async () => {
    const state = callStateRef.current
    if (state.status !== 'ringing' || !state.remoteUser) return

    const callType = state.type
    const fromUser = state.remoteUser
    console.log('[WebRTC] Accepting', callType, 'call from', fromUser.code)

    stopRingtone(false)   // fade out gracefully on accept
    isInitiatorRef.current = false
    remoteUserRef.current = fromUser

    // CRITICAL: transition to 'connecting' not 'active'
    setCallState(prev => ({ ...prev, status: 'connecting' }))

    try {
      await initializePeerConnection(callType)
      socketService.acceptCall(fromUser.code)
      console.log('[WebRTC] Call accepted — peer connection ready for offer')
    } catch (error) {
      console.error('[WebRTC] Error accepting call:', error)
      cleanup()
      throw error
    }
  }, [stopRingtone, initializePeerConnection, cleanup])

  /** Callee: reject the current incoming (ringing) call */
  const rejectCall = useCallback(() => {
    if (callStateRef.current.status !== 'ringing') return
    const fromUser = callStateRef.current.remoteUser
    if (fromUser) socketService.rejectCall(fromUser.code)
    stopRingtone(true)   // immediate stop on reject
    cleanup()
  }, [stopRingtone, cleanup])

  /** Either party: end an active/calling/connecting call */
  const endCall = useCallback(() => {
    if (callStateRef.current.status === 'idle') return
    const target = remoteUserRef.current
    if (target) {
      remoteUserRef.current = null   // clear before emitting to prevent re-entry
      socketService.endCall(target.code)
    }
    cleanup()
  }, [cleanup])

  /** Toggle microphone mute */
  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }))
    }
  }, [])

  /** Toggle camera on/off */
  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }))
    }
  }, [])

  // ─── Socket event handlers (single source of truth for all call signals) ────
  useEffect(() => {
    // Callee: incoming call → transition to 'ringing' and play ringtone
    const handleCallIncoming = (data: { from: string; type: CallType; deviceName: string }) => {
      console.log('[WebRTC] Incoming call from', data.from, 'type', data.type)
      const fromUser: User = { code: data.from, deviceName: data.deviceName }
      remoteUserRef.current = fromUser
      setCallState({
        status: 'ringing',
        type: data.type,
        isMuted: false,
        isVideoEnabled: data.type === 'video',
        remoteUser: fromUser
      })
      playRingtone()
    }

    // Caller: callee accepted → CRITICAL: transition to 'connecting' and create offer
    const handleCallAccepted = async () => {
      console.log('[WebRTC] Call accepted by remote peer')
      if (!isInitiatorRef.current || !peerConnectionRef.current) return

      // CRITICAL FIX: update caller state from 'calling' to 'connecting'
      setCallState(prev => ({ ...prev, status: 'connecting' }))

      try {
        isCreatingOfferRef.current = true
        const offer = await peerConnectionRef.current.createOffer()
        await peerConnectionRef.current.setLocalDescription(offer)
        if (remoteUserRef.current) {
          socketService.sendWebRTCSignal(remoteUserRef.current.code, offer, 'offer')
          console.log('[WebRTC] Offer sent to remote peer')
        }
      } catch (error) {
        console.error('[WebRTC] Error creating offer after acceptance:', error)
        cleanup()
      } finally {
        isCreatingOfferRef.current = false
      }
    }

    const handleCallRejected = () => {
      console.log('[WebRTC] Call rejected by remote peer')
      cleanup()
    }

    const handleCallEnded = () => {
      console.log('[WebRTC] Call ended by remote peer')
      if (callStateRef.current.status === 'idle') return
      cleanup()
    }

    const handleCallError = (data: { error: string }) => {
      console.error('[WebRTC] Call error:', data.error)
      cleanup()
    }

    // Handle WebRTC signaling (SDP offer/answer + ICE candidates)
    const handleWebRTCSignal = async (data: {
      from: string
      signal: RTCSessionDescriptionInit | RTCIceCandidateInit
      signalType: 'offer' | 'answer' | 'ice-candidate'
    }) => {
      console.log('[WebRTC] Received signal:', data.signalType, 'from', data.from)
      const pc = peerConnectionRef.current
      if (!pc) {
        console.warn('[WebRTC] Received signal but no peer connection exists')
        return
      }
      try {
        if (data.signalType === 'offer') {
          await pc.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )
          await processIceCandidateQueue(pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socketService.sendWebRTCSignal(data.from, answer, 'answer')
          console.log('[WebRTC] Answer sent')
        } else if (data.signalType === 'answer') {
          await pc.setRemoteDescription(
            new RTCSessionDescription(data.signal as RTCSessionDescriptionInit)
          )
          await processIceCandidateQueue(pc)
        } else if (data.signalType === 'ice-candidate') {
          const candidate = data.signal as RTCIceCandidateInit
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            // Queue until remote description is set
            iceCandidateQueueRef.current.push(candidate)
          }
        }
      } catch (error) {
        console.error('[WebRTC] Error handling WebRTC signal:', error)
      }
    }

    socketService.on('call-incoming', handleCallIncoming)
    socketService.on('call-accepted', handleCallAccepted)
    socketService.on('call-rejected', handleCallRejected)
    socketService.on('call-ended', handleCallEnded)
    socketService.on('call-error', handleCallError)
    socketService.on('webrtc-signal', handleWebRTCSignal)

    return () => {
      socketService.off('call-incoming', handleCallIncoming)
      socketService.off('call-accepted', handleCallAccepted)
      socketService.off('call-rejected', handleCallRejected)
      socketService.off('call-ended', handleCallEnded)
      socketService.off('call-error', handleCallError)
      socketService.off('webrtc-signal', handleWebRTCSignal)
    }
  }, [playRingtone, processIceCandidateQueue, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup() }
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
