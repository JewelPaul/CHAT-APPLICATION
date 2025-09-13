import { X, Check, Shield, User as UserIcon } from 'lucide-react'
import type { ConnectionRequest } from '../types'

interface ConnectionRequestModalProps {
  request: ConnectionRequest | null
  onAccept: (code: string) => void
  onReject: () => void
}

export function ConnectionRequestModal({ request, onAccept, onReject }: ConnectionRequestModalProps) {
  if (!request) return null

  const handleAccept = () => {
    onAccept(request.code)
  }

  const handleReject = () => {
    onReject()
  }

  return (
    <div className="modal-overlay" onClick={handleReject}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Connection Request
              </h2>
            </div>
            <button
              onClick={handleReject}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Request Info */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              {request.avatar ? (
                <img
                  src={request.avatar}
                  alt={request.deviceName}
                  className="w-16 h-16 rounded-full mx-auto border-4 border-white dark:border-gray-800 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {request.deviceName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Invite code: <span className="font-mono font-medium">{request.code}</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Secure Connection
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This chat will be end-to-end encrypted and completely ephemeral. 
                    Messages will disappear when either person disconnects.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Do you want to accept this connection request?
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="btn btn-secondary flex-1"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="btn btn-primary flex-1"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}