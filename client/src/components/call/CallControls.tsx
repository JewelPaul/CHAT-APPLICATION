import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'

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
    <div className="flex items-center justify-center gap-6">
      {/* Mute Button - Royal Gold accent */}
      <button
        onClick={onToggleMute}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isMuted
            ? 'bg-white text-black'
            : 'bg-bg-card hover:bg-bg-hover text-white border-2 border-gold-primary/30'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Video Toggle (only for video calls) */}
      {callType === 'video' && (
        <button
          onClick={onToggleVideo}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            !isVideoEnabled
              ? 'bg-white text-black'
              : 'bg-bg-card hover:bg-bg-hover text-white border-2 border-gold-primary/30'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </button>
      )}

      {/* End Call Button - Red with shadow */}
      <button
        onClick={onEndCall}
        className="w-16 h-16 rounded-full bg-error hover:bg-error/90 flex items-center justify-center shadow-lg shadow-error/30 transition-all hover:scale-105 active:scale-95"
        title="End call"
      >
        <PhoneOff className="w-7 h-7 text-white" />
      </button>
    </div>
  )
}
