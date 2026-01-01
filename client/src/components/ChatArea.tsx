import { useState, useEffect, useRef } from 'react'
import { Send, Phone, Video, MoreVertical } from 'lucide-react'
import { MessageComponent } from './Message'
import { EmptyState } from './EmptyState'
import { MediaPicker } from './chat/MediaPicker'
import { Input } from './ui/Input'
import { Avatar } from './ui/Avatar'
import type { StoredMessage, Contact } from '../db'
import type { CallType } from '../types'

interface ChatAreaProps {
  contact: Contact | null
  messages: StoredMessage[]
  currentUserId: string
  isTyping?: boolean
  onSendMessage: (message: string) => void
  onTypingStart: () => void
  onTypingStop: () => void
  onInitiateCall?: (type: CallType) => void
  onFileSelect?: (file: File) => void
}

export function ChatArea({
  contact,
  messages,
  currentUserId,
  isTyping = false,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onInitiateCall,
  onFileSelect
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('')
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)

    // Send typing indicator
    onTypingStart()

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing indicator after 2s of inactivity
    const timeout = setTimeout(() => {
      onTypingStop()
    }, 2000)
    setTypingTimeout(timeout)
  }

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim()
    if (!trimmedMessage) return

    onSendMessage(trimmedMessage)
    setMessageInput('')
    onTypingStop()

    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // No contact selected
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <EmptyState type="no-chat" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] h-screen">
      {/* Chat Header - Clean Navigation Bar */}
      <div className="nav-bar flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar 
            name={contact.displayName}
            src={contact.avatar}
            size="sm"
          />

          {/* Contact Info */}
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-[var(--text-base)]">
              {contact.displayName}
            </h2>
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">
              {contact.status === 'accepted' ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full"></span>
                  Online
                </span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons - Royal Gold */}
        <div className="flex items-center gap-1">
          {onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall('audio')}
                className="p-2.5 hover:bg-bg-hover rounded-lg transition-all border border-transparent hover:border-gold-primary/30"
                title="Voice Call"
              >
                <Phone className="w-5 h-5 text-gold-primary" />
              </button>
              <button
                onClick={() => onInitiateCall('video')}
                className="p-2.5 hover:bg-bg-hover rounded-lg transition-all border border-transparent hover:border-gold-primary/30"
                title="Video Call"
              >
                <Video className="w-5 h-5 text-gold-primary" />
              </button>
            </>
          )}
          <button
            className="p-2.5 hover:bg-bg-hover rounded-lg transition-colors"
            title="More options"
          >
            <MoreVertical className="w-5 h-5 text-text-secondary hover:text-gold-primary" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[var(--text-lg)] text-[var(--text-secondary)]">No messages yet</p>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageComponent
                key={message.id}
                message={{
                  id: message.id,
                  from: message.senderId,
                  to: message.recipientId,
                  message: message.content,
                  timestamp: message.timestamp,
                  type: 'text'
                }}
                isSent={message.senderId === currentUserId}
              />
            ))}
            {isTyping && (
              <div className="flex items-start mb-3">
                <div className="bubble-received flex items-center gap-2 py-3">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Area - Clean Input Bar */}
      <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          {/* Media Picker */}
          {onFileSelect && (
            <MediaPicker 
              onFileSelect={onFileSelect}
              disabled={!contact}
            />
          )}

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              className="w-full pr-12"
            />
            
            {/* Send Button - Integrated */}
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all active:scale-95"
              title="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
