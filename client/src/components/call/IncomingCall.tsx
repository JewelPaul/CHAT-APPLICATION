import { Phone, Video, X, Check } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import type { User, CallType } from '../../types'

interface IncomingCallProps {
  caller: User
  callType: CallType
  onAccept: () => void
  onReject: () => void
}

export function IncomingCall({ caller, callType, onAccept, onReject }: IncomingCallProps) {
  return (
    <div className="modal-overlay animate-bounce-in">
      <div className="modal-content max-w-sm">
        <div className="p-8 text-center">
          {/* Avatar with pulse animation */}
          <div className="relative inline-block mb-6">
            <Avatar 
              name={caller.deviceName} 
              src={caller.avatar}
              size="lg"
            />
            <div className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-20 animate-pulse" />
          </div>

          {/* Caller Name */}
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {caller.deviceName}
          </h2>

          {/* Call Type */}
          <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)] mb-8">
            {callType === 'video' ? (
              <>
                <Video className="w-5 h-5" />
                <span>Video Call</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span>Voice Call</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-[var(--destructive)] hover:bg-[#ff5c52] flex items-center justify-center transition-all active:scale-95"
                aria-label="Decline call"
              >
                <X className="w-8 h-8 text-white" />
              </button>
              <span className="text-sm text-[var(--text-secondary)]">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-[var(--success)] hover:bg-[#3ee165] flex items-center justify-center transition-all active:scale-95"
                aria-label="Accept call"
              >
                <Check className="w-8 h-8 text-white" />
              </button>
              <span className="text-sm text-[var(--text-secondary)]">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
