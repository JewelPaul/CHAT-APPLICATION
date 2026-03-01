import { Phone, Video, X, Check } from 'lucide-react'
import type { User, CallType } from '../../types'

interface IncomingCallProps {
  caller: User
  callType: CallType
  onAccept: () => void
  onReject: () => void
}

export function IncomingCall({ caller, callType, onAccept, onReject }: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <div className="relative max-w-sm w-full">
        {/* Pulsing Background Rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-80 h-80 rounded-full border-2 border-gold-primary/20 animate-pulse-gold" />
          <div className="absolute w-96 h-96 rounded-full border-2 border-gold-primary/10 animate-pulse-gold animation-delay-300" />
        </div>

        {/* Content Card */}
        <div className="relative bg-gradient-dark rounded-3xl p-8 text-center border-2 border-gold-primary/30 shadow-2xl">
          {/* Avatar with pulse animation */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-gold-primary/30 rounded-full animate-ping" />
            <div className="relative w-32 h-32 bg-gradient-gold rounded-full flex items-center justify-center border-4 border-gold-dark shadow-gold">
              <span className="text-6xl">👤</span>
            </div>
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {caller.deviceName}
          </h2>
          <p className="text-text-secondary text-sm mb-1">{caller.code}</p>

          {/* Call Type with Royal Gold accent */}
          <div className="flex items-center justify-center gap-2 text-gold-primary mb-10 mt-6">
            {callType === 'video' ? (
              <>
                <Video className="w-6 h-6" />
                <span className="font-semibold text-lg">Incoming Video Call</span>
              </>
            ) : (
              <>
                <Phone className="w-6 h-6" />
                <span className="font-semibold text-lg">Incoming Voice Call</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-10">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onReject}
                className="w-20 h-20 rounded-full bg-error hover:bg-error/90 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-error/30 hover:shadow-error/50"
                aria-label="Decline call"
              >
                <X className="w-10 h-10 text-white" />
              </button>
              <span className="text-sm text-text-secondary font-medium">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onAccept}
                className="w-20 h-20 rounded-full bg-success hover:bg-success/90 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-success/30 hover:shadow-success/50"
                aria-label="Accept call"
              >
                <Check className="w-10 h-10 text-white" />
              </button>
              <span className="text-sm text-text-secondary font-medium">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
