/**
 * Modal for handling incoming connection requests
 */

import { Shield, UserPlus } from 'lucide-react'

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
  const initial = fromName ? fromName.charAt(0).toUpperCase() : '?'

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-title"
      onClick={onReject}
    >
      <div className="modal-content modal-enter" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          {/* Avatar + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--accent), #7c3aed)' }}
              aria-hidden="true"
            >
              {initial}
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span
                  id="request-title"
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Connection Request
                </span>
              </div>
              <p
                className="text-xl font-semibold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {fromName}
              </p>
              <p
                className="text-xs font-mono mt-1 break-all"
                style={{ color: 'var(--text-muted)' }}
              >
                {fromKey}
              </p>
            </div>
          </div>

          {/* Security note */}
          <div
            className="flex items-start gap-3 rounded-xl p-3"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <Shield
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: 'var(--accent)' }}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This conversation will be&nbsp;
              <strong style={{ color: 'var(--text-primary)' }}>end-to-end encrypted</strong>
              &nbsp;and completely ephemeral — messages disappear when either party disconnects.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onReject}
              className="btn btn-secondary flex-1"
            >
              Reject
            </button>
            <button
              onClick={onAccept}
              className="btn btn-primary flex-1"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
