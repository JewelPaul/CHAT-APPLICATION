import { IncomingCall } from './call/IncomingCall'
import type { User, CallType } from '../types'

interface IncomingCallModalProps {
  caller: User | null
  callType: CallType
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallModal({
  caller,
  callType,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  if (!caller) return null

  return (
    <IncomingCall
      caller={caller}
      callType={callType}
      onAccept={onAccept}
      onReject={onReject}
    />
  )
}
