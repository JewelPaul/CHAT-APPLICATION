/**
 * Modal for handling incoming connection requests
 */

import { UserPlus } from 'lucide-react'

interface IncomingRequestModalProps {
  fromKey: string
  fromName: string
  onAccept: () => void
  onReject: () => void
}

export function IncomingRequestModal({
  fromKey,
  fromName,
  onAccept,
  onReject,
}: IncomingRequestModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Connection Request
        </h2>

        {/* From User */}
        <div className="mb-6 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            from
          </p>
          <p className="font-semibold text-lg text-gray-900 dark:text-white">
            {fromName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
            {fromKey}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-lg shadow-indigo-500/30"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
