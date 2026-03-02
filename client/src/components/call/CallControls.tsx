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
    <div
      className="flex items-center justify-center gap-[30px] rounded-[40px] px-[22px] py-[14px]"
      style={{ backdropFilter: 'blur(20px)', background: 'var(--call-btn-bg)' }}
    >
      {/* Mute Button */}
      <button
        onClick={onToggleMute}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
          isMuted
            ? 'bg-white text-gray-900 shadow-lg'
            : 'text-white'
        }`}
        style={!isMuted ? { background: 'var(--call-btn-bg)' } : undefined}
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
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            !isVideoEnabled
              ? 'bg-white text-gray-900 shadow-lg'
              : 'text-white'
          }`}
          style={isVideoEnabled ? { background: 'var(--call-btn-bg)' } : undefined}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </button>
      )}

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
        title="End call"
      >
        <PhoneOff className="w-7 h-7 text-white" />
      </button>
    </div>
  )
}
