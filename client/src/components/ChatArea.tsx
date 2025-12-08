import { useState, useEffect, useRef } from 'react'
import { Send, Smile, Paperclip, Phone, Video, MoreVertical } from 'lucide-react'
import { Message } from './Message'
import { EmptyState } from './EmptyState'
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
}

export function ChatArea({
  contact,
  messages,
  currentUserId,
  isTyping = false,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onInitiateCall
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
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0f]">
        <EmptyState type="no-chat" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] h-screen">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#12121a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
              {contact.displayName[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h2 className="font-semibold text-white">{contact.displayName}</h2>
            <p className="text-xs text-gray-400">
              {contact.status === 'accepted' ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onInitiateCall && (
            <>
              <button
                onClick={() => onInitiateCall('audio')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Voice Call"
              >
                <Phone className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              <button
                onClick={() => onInitiateCall('video')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Video Call"
              >
                <Video className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </>
          )}
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="More options"
          >
            <MoreVertical className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={{
                  id: message.id,
                  from: message.senderId,
                  to: message.recipientId,
                  message: message.content,
                  timestamp: message.timestamp,
                  type: 'text'
                }}
                isOwn={message.senderId === currentUserId}
              />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>{contact.displayName} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Area */}
      <div className="p-4 bg-[#12121a] border-t border-gray-800">
        <div className="flex items-center gap-2">
          {/* Emoji Picker Button */}
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Emoji"
          >
            <Smile className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>

          {/* Attachment Button */}
          <button
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>

          {/* Message Input */}
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-[#1e1e2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
