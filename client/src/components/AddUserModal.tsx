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

// 6-character uppercase alphanumeric invite code validation
const INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/

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

  // Validate invite code format: 6 uppercase alphanumeric characters
  const isValidFormat = (key: string): boolean => {
    return INVITE_CODE_PATTERN.test(key.toUpperCase())
  }

  const handleSubmit = () => {
    const cleanKey = userKey.toUpperCase().trim()
    
    // Validation
    if (!isValidFormat(cleanKey)) {
      setErrorMessage('Invalid code format. Must be 6 uppercase letters/numbers (e.g. A7X9K3)')
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

  // Auto-format input: uppercase alphanumeric only, max 6 chars
  const handleInputChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
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
        className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Start New Chat
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <p className="text-gray-300 mb-4">
          Enter the user's unique key to start chatting:
        </p>
        
        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={userKey}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="A7X9K3"
            className="w-full bg-[#0a0a0f] border border-gray-700 rounded-xl px-4 py-3 text-white 
                     placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono text-lg
                     transition-colors tracking-widest uppercase"
            maxLength={6}
            disabled={state === 'sending' || state === 'waiting'}
            autoFocus
          />
          {isValidFormat(userKey) && state === 'input' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>
        
        <p className="text-gray-500 text-sm mt-2">
          Enter the 6-character invite code shared by your contact
        </p>
        
        {/* Error Message */}
        {state === 'error' && errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errorMessage}</p>
          </div>
        )}
        
        {/* Not Found Message */}
        {state === 'not-found' && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-300 text-sm">{errorMessage}</p>
          </div>
        )}
        
        {/* Waiting State */}
        {state === 'waiting' && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">
              Request sent! Waiting for them to accept...
            </p>
          </div>
        )}
        
        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValidFormat(userKey) || state === 'sending' || state === 'waiting'}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 
                     disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl 
                     transition-colors flex items-center justify-center gap-2"
        >
          {state === 'sending' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending...</span>
            </>
          )}
          {state === 'waiting' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Waiting for response...</span>
            </>
          )}
          {(state === 'input' || state === 'error' || state === 'not-found') && (
            <>
              <MessageCircle className="w-5 h-5" />
              <span>Send Chat Request</span>
            </>
          )}
        </button>
        
        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-400 text-sm">
              Ask your friend to share their key with you. You can find your key at the top of the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
