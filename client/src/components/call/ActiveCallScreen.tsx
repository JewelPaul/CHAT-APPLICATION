import { useRef, useEffect, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Camera } from 'lucide-react'

interface ActiveCallScreenProps {
  partnerName: string
  isVideo: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  onEndCall: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
  isMuted: boolean
  isCameraOff: boolean
}

export function ActiveCallScreen({
  partnerName,
  isVideo,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  isMuted,
  isCameraOff
}: ActiveCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [callDuration, setCallDuration] = useState(0)

  // Set up video streams
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
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-bg-dark z-50 flex flex-col">
      {/* Video Area */}
      {isVideo ? (
        <div className="flex-1 relative overflow-hidden">
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-gold-primary">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-bg-dark flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              </div>
            )}
          </div>

          {/* Overlay gradient for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
        </div>
      ) : (
        /* Voice Call UI */
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-bg-dark via-bg-surface to-bg-dark">
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 animate-pulse-gold">
              <div className="w-40 h-40 rounded-full border-2 border-gold-primary/30" />
            </div>
            <div className="absolute inset-0 animate-pulse-gold animation-delay-150">
              <div className="w-40 h-40 rounded-full border-2 border-gold-primary/20" />
            </div>
            
            {/* Avatar */}
            <div className="w-40 h-40 bg-gradient-gold rounded-full flex items-center justify-center shadow-gold relative">
              <span className="text-7xl">👤</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mt-8">{partnerName}</h2>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 bg-online rounded-full animate-pulse" />
            <p className="text-gold-primary font-medium">Connected</p>
          </div>
        </div>
      )}

      {/* Call Info Overlay */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <div>
          <p className="text-white font-semibold text-lg drop-shadow-lg">{partnerName}</p>
          <p className="text-gold-primary text-sm font-medium drop-shadow-lg">{formatDuration(callDuration)}</p>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="bg-gradient-to-t from-black/90 via-bg-surface/80 to-transparent backdrop-blur-xl p-6 pb-10">
        <div className="flex justify-center items-center gap-6">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isMuted 
                ? 'bg-white text-black' 
                : 'bg-bg-card hover:bg-bg-hover text-white border-2 border-gold-primary/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Video Toggle (only for video calls) */}
          {isVideo && (
            <button
              onClick={onToggleCamera}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isCameraOff 
                  ? 'bg-white text-black' 
                  : 'bg-bg-card hover:bg-bg-hover text-white border-2 border-gold-primary/30'
              }`}
              title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
          )}

          {/* Speaker Button (placeholder) */}
          <button
            className="w-16 h-16 bg-bg-card hover:bg-bg-hover rounded-full flex items-center justify-center text-white transition-all shadow-lg border-2 border-gold-primary/30"
            title="Speaker"
          >
            <Volume2 size={24} />
          </button>

          {/* Flip Camera (placeholder for mobile) */}
          {isVideo && (
            <button
              className="w-16 h-16 bg-bg-card hover:bg-bg-hover rounded-full flex items-center justify-center text-white transition-all shadow-lg border-2 border-gold-primary/30"
              title="Flip camera"
            >
              <Camera size={24} />
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 bg-error hover:bg-error/90 rounded-full flex items-center justify-center shadow-lg shadow-error/30 transition-all hover:scale-105 active:scale-95"
            title="End call"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
