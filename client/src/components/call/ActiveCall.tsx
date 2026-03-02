import { useEffect, useRef, useState } from 'react'
import { CallControls } from './CallControls'
import type { User, CallState } from '../../types'

interface ActiveCallProps {
  callState: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  remoteUser: User
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
}

export function ActiveCall({
  callState,
  localStream,
  remoteStream,
  remoteUser,
  onEndCall,
  onToggleMute,
  onToggleVideo
}: ActiveCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [callDuration, setCallDuration] = useState(0)

  const isVideoCall = callState.type === 'video'

  // Setup video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Attach remote audio stream for audio-only calls (video element handles audio in video calls)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && !isVideoCall) {
      remoteAudioRef.current.srcObject = remoteStream
    }
  }, [remoteStream, isVideoCall])

  // Call duration timer
  useEffect(() => {
    if (callState.status === 'active') {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [callState.status])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-dark flex flex-col">
      {/* Hidden audio element for remote voice in audio-only calls */}
      <audio ref={remoteAudioRef} autoPlay />
      {/* Remote Video/Avatar */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVideoCall && remoteStream ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay for better UI visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-bg-dark via-bg-surface to-bg-dark w-full h-full">
            <div className="relative">
              {/* Pulsing rings for voice call */}
              <div className="absolute inset-0 animate-pulse-gold">
                <div className="w-40 h-40 rounded-full border-2 border-gold-primary/30" />
              </div>
              <div className="absolute inset-0 animate-pulse-gold animation-delay-150">
                <div className="w-44 h-44 rounded-full border-2 border-gold-primary/20" />
              </div>
              
              {/* Avatar */}
              <div className="relative w-40 h-40 bg-gradient-gold rounded-full flex items-center justify-center shadow-gold border-4 border-gold-dark">
                <span className="text-7xl">👤</span>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                {remoteUser.deviceName}
              </h2>
              {callState.status === 'active' && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-2 h-2 bg-online rounded-full animate-pulse" />
                  <p className="text-gold-primary font-medium">
                    Connected
                  </p>
                </div>
              )}
              {callState.status === 'calling' && (
                <p className="text-gold-primary animate-pulse">Calling...</p>
              )}
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) - Royal Gold border */}
        {isVideoCall && localStream && (
          <div 
            className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-gold-primary z-10"
            style={{ touchAction: 'none' }}
          >
            {callState.isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bg-card">
                <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call Info Overlay - Royal Gold */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <div>
            <p className="text-white font-semibold text-lg drop-shadow-lg">
              {remoteUser.deviceName}
            </p>
            {callState.status === 'active' && (
              <p className="text-gold-primary text-sm font-medium drop-shadow-lg">
                {formatDuration(callDuration)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Call Controls - Royal Gold styling */}
      <div className="bg-gradient-to-t from-black/90 via-bg-surface/80 to-transparent backdrop-blur-xl p-6 pb-10">
        <div className="flex justify-center">
          <CallControls
            isMuted={callState.isMuted}
            isVideoEnabled={callState.isVideoEnabled}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onEndCall={onEndCall}
            callType={callState.type}
          />
        </div>
      </div>
    </div>
  )
}
