import { ActiveCall } from './call/ActiveCall'
import type { CallState, User } from '../types'

interface CallInterfaceProps {
  callState: CallState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  remoteUser: User
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
}

export function CallInterface({
  callState,
  localStream,
  remoteStream,
  remoteUser,
  onEndCall,
  onToggleMute,
  onToggleVideo
}: CallInterfaceProps) {
  return (
    <ActiveCall
      callState={callState}
      localStream={localStream}
      remoteStream={remoteStream}
      remoteUser={remoteUser}
      onEndCall={onEndCall}
      onToggleMute={onToggleMute}
      onToggleVideo={onToggleVideo}
    />
  )
}

          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!remoteStream && renderCallStatus()}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <audio ref={remoteAudioRef} autoPlay />
            {remoteUser.avatar ? (
              <img
                src={remoteUser.avatar}
                alt={remoteUser.deviceName}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-16 h-16 text-white" />
              </div>
            )}
            <p className="text-2xl text-white font-semibold">
              {remoteUser.deviceName}
            </p>
            {callState.status === 'calling' && (
              <p className="text-gray-300">Calling...</p>
            )}
            {callState.status === 'active' && (
              <p className="text-green-400">Connected</p>
            )}
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {callState.type === 'video' && localStream && (
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover mirror"
            />
            <style>{`
              .mirror {
                transform: scaleX(-1);
              }
            `}</style>
          </div>
        )}

        {/* Call Controls */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-4">
          {/* Mute/Unmute */}
          <button
            onClick={onToggleMute}
            className={`p-4 rounded-full transition-colors ${
              callState.isMuted
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={callState.isMuted ? 'Unmute' : 'Mute'}
          >
            {callState.isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-5 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Toggle Video (only for video calls) */}
          {callState.type === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                !callState.isVideoEnabled
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={callState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {callState.isVideoEnabled ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>
          )}
        </div>

        {/* User Info Bar */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <p className="text-white font-medium">{remoteUser.deviceName}</p>
          <p className="text-gray-300 text-sm">
            {callState.status === 'calling' ? 'Calling...' : 'Connected'}
          </p>
        </div>
      </div>
    </div>
  )
}
