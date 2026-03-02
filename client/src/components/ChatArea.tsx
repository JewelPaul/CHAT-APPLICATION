import { useState, useEffect, useRef } from 'react'
import { Send, Menu, ShieldCheck, ShieldAlert, Phone, Video } from 'lucide-react'
import { MessageComponent } from './Message'
import { EmptyState } from './EmptyState'
import { MediaPicker } from './chat/MediaPicker'
import { VoiceRecorder } from './chat/VoiceRecorder'
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
  onFileSelect?: (file: File) => void
  onVoiceSend?: (blob: Blob) => void
  isEncryptionReady?: boolean
  onOpenSidebar?: () => void
  onInitiateCall?: (type: CallType) => void
}

export function ChatArea({
  contact,
  messages,
  currentUserId,
  isTyping = false,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onFileSelect,
  onVoiceSend,
  isEncryptionReady = false,
  onOpenSidebar,
  onInitiateCall
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('')
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Jump to bottom immediately when the active conversation changes (room switch)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [contact?.id])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }, [typingTimeout])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    onTypingStart()
    if (typingTimeout) clearTimeout(typingTimeout)
    const timeout = setTimeout(() => onTypingStop(), 2000)
    setTypingTimeout(timeout)
  }

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim()
    if (!trimmedMessage || !contact) return
    onSendMessage(trimmedMessage)
    setMessageInput('')
    onTypingStop()
    if (typingTimeout) clearTimeout(typingTimeout)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        {/* Mobile: show open-sidebar button when no contact */}
        <div className="lg:hidden absolute top-4 left-4">
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <EmptyState type="no-chat" />
      </div>
    )
  }

  const canSend = !!messageInput.trim() && !!contact

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0 h-screen">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex-shrink-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Avatar
          name={contact.displayName}
          src={contact.avatar}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">
            {contact.displayName}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
            Online
            {isEncryptionReady ? (
              <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 ml-1">
                <ShieldCheck className="w-3 h-3" /> E2E Encrypted
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 ml-1">
                <ShieldAlert className="w-3 h-3" /> Securing...
              </span>
            )}
          </p>
        </div>

        {/* Call buttons */}
        {onInitiateCall && (
          <div className="flex items-center gap-1 flex-shrink-0 mr-10">
            <button
              onClick={() => onInitiateCall('audio')}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              title="Voice call"
              aria-label="Start voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onInitiateCall('video')}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              title="Video call"
              aria-label="Start video call"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-[var(--text-secondary)]">No messages yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-60">
                {isEncryptionReady
                  ? 'Send a message to start the conversation'
                  : 'Setting up end-to-end encryption...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageComponent
                key={message.id}
                message={{
                  id: message.id,
                  from: message.senderId,
                  to: message.recipientId,
                  message: message.content,
                  timestamp: message.timestamp,
                  type: message.type === 'media' ? 'media' : 'text',
                  mimeType: message.mimeType,
                  filename: message.filename,
                  size: message.size,
                  mediaData: message.mediaData,
                  objectUrl: message.objectUrl
                }}
                isSent={message.senderId === currentUserId}
              />
            ))}
            {isTyping && (
              <div className="flex items-start">
                <div className="flex items-center gap-1 px-3 py-2.5 bg-[var(--bg-secondary)] rounded-2xl rounded-bl-sm border border-[var(--border)]">
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

      {/* Message Input */}
      <div className="flex-shrink-0 p-3 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        {!isEncryptionReady && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center mb-2">
            Establishing encryption... messages will be sent once ready
          </p>
        )}
        <div className="flex items-center gap-2">
          {onFileSelect && (
            <MediaPicker onFileSelect={onFileSelect} disabled={!contact} />
          )}
          {onVoiceSend && (
            <VoiceRecorder onSend={onVoiceSend} disabled={!contact || !isEncryptionReady} />
          )}
          <div className="flex-1 relative">
            <Input
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isEncryptionReady ? 'Message...' : 'Waiting for encryption...'}
              className="w-full pr-11"
            />
            <button
              onClick={handleSendMessage}
              disabled={!canSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-full transition-all active:scale-95"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
