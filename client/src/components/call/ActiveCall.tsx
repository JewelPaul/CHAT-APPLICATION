import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../ui/Avatar'
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
  const [isPiPDragging, setIsPiPDragging] = useState(false)

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

  const isVideoCall = callState.type === 'video'

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
      {/* Remote Video/Avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        {isVideoCall && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <Avatar 
              name={remoteUser.deviceName}
              src={remoteUser.avatar}
              size="lg"
            />
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                {remoteUser.deviceName}
              </h2>
              <p className="text-[var(--text-secondary)]">
                {callState.status === 'calling' ? 'Calling...' : formatDuration(callDuration)}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {isVideoCall && localStream && (
          <div 
            className="absolute top-4 right-4 w-32 h-48 rounded-xl overflow-hidden bg-[var(--bg-secondary)] border-2 border-[var(--border)] shadow-xl cursor-move"
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
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)]">
                <Avatar name="You" size="md" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Info & Controls */}
      <div className="p-6 space-y-4">
        {/* Call Duration (for audio calls or when video is off) */}
        {(!isVideoCall || !remoteStream) && callState.status === 'active' && (
          <div className="text-center">
            <p className="text-lg text-[var(--text-secondary)]">
              {formatDuration(callDuration)}
            </p>
          </div>
        )}

        {/* Call Controls */}
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
