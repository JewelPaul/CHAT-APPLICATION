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
  const [callDuration, setCallDuration] = useState(0)

  const isVideoCall = callState.type === 'video'

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Attach remote stream to remote video element (video calls only)
  // Audio-only calls route through the persistent <audio> element in App.tsx
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && isVideoCall) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, isVideoCall])

  // Call duration timer — only counts while active
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
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
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
          <div className="flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 w-full h-full">
            <div className="relative">
              {/* Pulsing rings for voice call */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-44 h-44 rounded-full border border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-52 h-52 rounded-full border border-white/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }} />
              </div>

              {/* Avatar */}
              <div className="relative w-36 h-36 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-6xl">👤</span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                {remoteUser.deviceName}
              </h2>
              {callState.status === 'active' && (
                <p className="text-white/60 text-sm mt-1 font-mono tracking-widest">
                  {formatDuration(callDuration)}
                </p>
              )}
              {callState.status === 'calling' && (
                <p className="text-white/60 text-sm mt-1 animate-pulse">Ringing…</p>
              )}
              {callState.status === 'connecting' && (
                <p className="text-white/60 text-sm mt-1 animate-pulse">Connecting…</p>
              )}
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) — top-right, no border */}
        {isVideoCall && localStream && (
          <div
            className="absolute top-5 right-5 overflow-hidden z-10 w-[110px] sm:w-[140px]"
            style={{
              borderRadius: 18,
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              aspectRatio: '3/4',
              touchAction: 'none'
            }}
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
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call Info Overlay — only needed for video calls where center is hidden */}
        {isVideoCall && (
          <div className="absolute top-5 left-5 right-5 flex items-start justify-between z-10">
            <div>
              <p className="text-white font-semibold text-base drop-shadow-lg">
                {remoteUser.deviceName}
              </p>
              {callState.status === 'active' && (
                <p className="text-white/60 text-xs font-mono tracking-widest drop-shadow-lg mt-0.5">
                  {formatDuration(callDuration)}
                </p>
              )}
              {(callState.status === 'calling' || callState.status === 'connecting') && (
                <p className="text-white/50 text-xs drop-shadow-lg mt-0.5 animate-pulse">
                  {callState.status === 'calling' ? 'Ringing…' : 'Connecting…'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl p-6 pb-10">
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
