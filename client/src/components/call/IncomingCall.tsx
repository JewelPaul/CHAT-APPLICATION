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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 rounded-full border border-white/15 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-80 h-80 rounded-full border border-white/8 animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }} />
        </div>

        {/* Content Card */}
        <div
          className="relative rounded-3xl p-8 text-center shadow-2xl"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {/* Avatar with pulse animation */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-3 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="relative w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-5xl">👤</span>
            </div>
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-semibold text-white mb-1">
            {caller.deviceName}
          </h2>
          <p className="text-white/40 text-sm mb-1 font-mono">{caller.code}</p>

          {/* Call Type */}
          <div className="flex items-center justify-center gap-2 text-white/60 mb-10 mt-5">
            {callType === 'video' ? (
              <>
                <Video className="w-5 h-5" />
                <span className="text-sm">Incoming Video Call</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span className="text-sm">Incoming Voice Call</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-12">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onReject}
                className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg shadow-red-500/30"
                aria-label="Decline call"
              >
                <X className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-white/50">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className="w-[72px] h-[72px] rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg shadow-green-500/30"
                aria-label="Accept call"
              >
                <Check className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-white/50">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
