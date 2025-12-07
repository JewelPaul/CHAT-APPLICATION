import { Phone, PhoneOff, Video, User as UserIcon } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-bounce-in">
        <div className="flex flex-col items-center space-y-6">
          {/* Caller Avatar */}
          {caller.avatar ? (
            <img
              src={caller.avatar}
              alt={caller.deviceName}
              className="w-24 h-24 rounded-full border-4 border-primary-500 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
              <UserIcon className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Call Info */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {caller.deviceName}
            </h2>
            <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
              {callType === 'video' ? (
                <Video className="w-5 h-5" />
              ) : (
                <Phone className="w-5 h-5" />
              )}
              <p className="text-lg">
                Incoming {callType} call
              </p>
            </div>
          </div>

          {/* Call Actions */}
          <div className="flex space-x-4 w-full">
            {/* Reject Button */}
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="font-medium">Decline</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium">Accept</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
