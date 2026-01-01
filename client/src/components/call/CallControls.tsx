import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'

interface CallControlsProps {
  isMuted: boolean
  isVideoEnabled: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onEndCall: () => void
  callType: 'audio' | 'video'
}

export function CallControls({
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  callType
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-6 bg-[var(--bg-secondary)] bg-opacity-80 backdrop-blur-xl rounded-2xl">
      {/* Mute Button */}
      <button
        onClick={onToggleMute}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          isMuted
            ? 'bg-[var(--destructive)] hover:bg-[#ff5c52]'
            : 'bg-[var(--bg-tertiary)] hover:bg-[#3c3c3e]'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Video Toggle (only for video calls) */}
      {callType === 'video' && (
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            !isVideoEnabled
              ? 'bg-[var(--destructive)] hover:bg-[#ff5c52]'
              : 'bg-[var(--bg-tertiary)] hover:bg-[#3c3c3e]'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>
      )}

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="w-16 h-16 rounded-full bg-[var(--destructive)] hover:bg-[#ff5c52] flex items-center justify-center transition-all active:scale-95"
        title="End call"
      >
        <PhoneOff className="w-7 h-7 text-white" />
      </button>
    </div>
  )
}
