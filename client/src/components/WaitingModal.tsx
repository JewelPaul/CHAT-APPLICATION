import { X, Clock, Loader2 } from 'lucide-react'

interface WaitingModalProps {
  waitingFor: string | null
  onCancel: () => void
}

export function WaitingModal({ waitingFor, onCancel }: WaitingModalProps) {
  if (!waitingFor) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Waiting for Response
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Waiting Content */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Request Sent
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Waiting for <span className="font-mono font-medium text-primary-600 dark:text-primary-400">{waitingFor}</span> to accept your connection request
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                They'll receive a notification to approve the connection. This may take a moment.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel Request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}