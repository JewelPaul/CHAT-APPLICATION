import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, Info, MessageCircle } from 'lucide-react'
import socketService from '../socket'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  myKey: string
  existingContacts: string[]
  onRequestSent?: (targetKey: string) => void
}

type ModalState = 'input' | 'sending' | 'waiting' | 'error' | 'not-found' | 'success'

// Invite code validation: XXXXX-XXXX format (e.g. JWELL-0291)
const INVITE_CODE_PATTERN = /^[A-Z0-9]{5}-[A-Z0-9]{4}$/

export function AddUserModal({ 
  isOpen, 
  onClose, 
  myKey, 
  existingContacts, 
  onRequestSent 
}: AddUserModalProps) {
  const [userKey, setUserKey] = useState('')
  const [state, setState] = useState<ModalState>('input')
  const [errorMessage, setErrorMessage] = useState('')

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserKey('')
      setState('input')
      setErrorMessage('')
    }
  }, [isOpen])

  // Set up socket listeners for connection request responses
  useEffect(() => {
    if (!isOpen) return

    const handleRequestSent = () => {
      setState('waiting')
      if (onRequestSent) {
        onRequestSent(userKey)
      }
    }

    const handleUserNotFound = () => {
      setState('not-found')
      setErrorMessage('User not found or offline. They need to be online to receive your request.')
    }

    const handleError = (data: { message: string }) => {
      setState('error')
      setErrorMessage(data.message || 'Failed to send request')
    }

    socketService.on('request-sent', handleRequestSent)
    socketService.on('user-not-found', handleUserNotFound)
    socketService.on('error', handleError)

    return () => {
      socketService.off('request-sent', handleRequestSent)
      socketService.off('user-not-found', handleUserNotFound)
      socketService.off('error', handleError)
    }
  }, [isOpen, userKey, onRequestSent])

  // Validate invite code format: XXXXX-XXXX
  const isValidFormat = (key: string): boolean => {
    return INVITE_CODE_PATTERN.test(key.toUpperCase())
  }

  const handleSubmit = () => {
    const cleanKey = userKey.toUpperCase().trim()
    
    // Validation
    if (!isValidFormat(cleanKey)) {
      setErrorMessage('Invalid code format. Must be XXXXX-XXXX (e.g. JWELL-0291)')
      setState('error')
      return
    }
    
    if (cleanKey === myKey.toUpperCase()) {
      setErrorMessage("You can't chat with yourself!")
      setState('error')
      return
    }
    
    if (existingContacts.some(contact => contact.toUpperCase() === cleanKey)) {
      setErrorMessage('You already have a chat with this user.')
      setState('error')
      return
    }
    
    // Send connection request
    setState('sending')
    socketService.sendRequest(cleanKey)
  }

  // Auto-format: uppercase alphanum + dash, max 10 chars (XXXXX-XXXX)
  const handleInputChange = (value: string) => {
    const upper = value.toUpperCase()
    const cleaned = upper.replace(/[^A-Z0-9-]/g, '').slice(0, 10)
    setUserKey(cleaned)
    // Reset error state when user starts typing
    if (state === 'error' || state === 'not-found') {
      setState('input')
      setErrorMessage('')
    }
  }

  const handleClose = () => {
    setUserKey('')
    setState('input')
    setErrorMessage('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-[var(--bg-secondary)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Start New Chat
          </h2>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Enter the invite code of the person you want to chat with:
        </p>
        
        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={userKey}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="ABCDE-1234"
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)]
                     placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono text-base
                     transition-colors tracking-widest uppercase"
            maxLength={10}
            disabled={state === 'sending' || state === 'waiting'}
            autoFocus
          />
          {isValidFormat(userKey) && state === 'input' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>
        
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Enter the 10-character invite code shared by your contact (e.g. JWELL-0291)
        </p>
        
        {/* Error Message */}
        {state === 'error' && errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{errorMessage}</p>
          </div>
        )}
        
        {/* Not Found Message */}
        {state === 'not-found' && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-600 dark:text-amber-400 text-sm">{errorMessage}</p>
          </div>
        )}
        
        {/* Waiting State */}
        {state === 'waiting' && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-600 dark:text-green-400 text-sm">
              Request sent! Waiting for them to accept...
            </p>
          </div>
        )}
        
        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValidFormat(userKey) || state === 'sending' || state === 'waiting'}
          className="w-full mt-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40
                     disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl 
                     transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {state === 'sending' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          )}
          {state === 'waiting' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for response...</span>
            </>
          )}
          {(state === 'input' || state === 'error' || state === 'not-found') && (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>Send Chat Request</span>
            </>
          )}
        </button>
        
        {/* Help Text */}
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)]">
              Ask your friend to share their invite code. Find yours at the top of the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
