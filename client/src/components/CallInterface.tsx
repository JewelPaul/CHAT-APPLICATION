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
